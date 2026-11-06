import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { fetchJSON, fetchWithAuth, uploadFile } from '../lib/api';
import { handleApiError } from '../lib/errorHandler';
import { emit } from '../lib/events';
import { createExcalidrawEmbedId, createExcalidrawEmbedLine, replaceExcalidrawEmbedLine } from '../lib/excalidrawEmbed';
import { getTableModel, replaceTableInText, blockForInsert, serializeTable, emptyTable } from '../lib/markdownTable';
import { insertEmptyTable, toggleQuoteLines } from '../lib/tableEditing';
import { fileTimestamp, isRTL, removeFileFromText } from '../lib/stringUtils';
import { base64ToUploadFile, readClipboardImage, textToUploadFile } from '../lib/pasteImage';

const appendLine = (text, line) => text + (text ? '\n' : '') + line;

export default function useNoteEditor({ note, editText, setEditText, showToast, refreshNotes, onClose, saveHandler, autoCloseOnAction = false, enableBeforeUnload = false, active = true }) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastSavedText, setLastSavedText] = useState(editText);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDrawingEditor, setShowDrawingEditor] = useState(false);
  const [isDrawingLoading, setIsDrawingLoading] = useState(false);
  const [isDrawingSaving, setIsDrawingSaving] = useState(false);
  const [drawingInitialData, setDrawingInitialData] = useState(null);
  const [activeDrawing, setActiveDrawing] = useState(null);
  const [tableEdit, setTableEdit] = useState(null);
  const [isRtl, setIsRtl] = useState(isRTL(note?.text || editText));
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const textRef = useRef(editText);
  textRef.current = editText;

  const hasUnsavedChanges = editText !== lastSavedText;

  useEffect(() => {
    if (!enableBeforeUnload || Platform.OS !== 'web') return;
    const handler = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enableBeforeUnload, hasUnsavedChanges]);

  const resetSaved = useCallback((text) => {
    setLastSavedText(text);
    setIsRtl(isRTL(text));
  }, []);

  const handleSave = async () => {
    const text = textRef.current;
    const ok = await saveHandler(text);
    if (ok) setLastSavedText(text);
    return ok;
  };

  const handleSaveAndClose = async () => {
    const text = textRef.current;
    const ok = await saveHandler(text);
    if (ok) {
      setLastSavedText(text);
      onClose();
    }
  };

  const handleRequestClose = () => {
    if (textRef.current !== lastSavedText) setShowConfirmDialog(true);
    else onClose();
  };

  useEffect(() => {
    if (!active || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [active, lastSavedText]);

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handleCancelClose = () => setShowConfirmDialog(false);

  const toggleEditorRtl = () => setIsRtl((v) => !v);

  const handleFileUpload = (data) => {
    const link = `[${data.file_name}](${encodeURI(decodeURIComponent(data.url))})`;
    setEditText((prev) => appendLine(prev, link));
  };

  const uploadImageFile = async (file) => {
    setIsUploading(true);
    try {
      const named = { ...file, name: `pasted_image_${fileTimestamp()}.png` };
      const data = await uploadFile(named);
      setEditText((prev) => appendLine(prev, `![${data.file_name}](${data.url})`));
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasteImageButton = async () => {
    const img = await readClipboardImage().catch(() => null);
    if (!img) {
      showToast('Paste', 'No image in clipboard', 2500, 'warning');
      return;
    }
    await uploadImageFile(img);
  };

  const applyEdit = (result) => {
    if (inputRef.current?.isMounted?.()) inputRef.current.applyEdit(result);
    else setEditText(result.text);
  };

  const currentSelection = () => inputRef.current?.getSelection?.() || { start: textRef.current.length, end: textRef.current.length };

  const handleQuoteToggle = () => {
    const sel = currentSelection();
    applyEdit(toggleQuoteLines(textRef.current, sel.start, sel.end));
  };

  const insertTable = (bodyRows, cols) => {
    if (!inputRef.current?.isMounted?.() || isPreviewMode) {
      const serialized = serializeTable(emptyTable(bodyRows, cols));
      setEditText((prev) => prev + blockForInsert(prev, prev.length, prev.length, serialized).insertText);
      return;
    }
    const sel = currentSelection();
    applyEdit(insertEmptyTable(textRef.current, sel.start, sel.end, bodyRows, cols));
  };

  const openDrawingEditor = () => {
    setActiveDrawing(null);
    setDrawingInitialData(null);
    setShowDrawingEditor(true);
  };

  const closeDrawingEditor = () => {
    setShowDrawingEditor(false);
    setIsDrawingLoading(false);
    setIsDrawingSaving(false);
    setDrawingInitialData(null);
    setActiveDrawing(null);
  };

  const openExistingDrawingEditor = async ({ id, sceneUrl, imageUrl }) => {
    setActiveDrawing({ id, sceneUrl, imageUrl });
    setShowDrawingEditor(true);
    setIsDrawingLoading(true);
    try {
      const response = await fetchWithAuth(sceneUrl, { method: 'GET' }, 30000);
      if (!response.ok) throw new Error('Failed to load drawing');
      setDrawingInitialData(await response.json());
    } catch (err) {
      handleApiError(err);
      closeDrawingEditor();
    } finally {
      setIsDrawingLoading(false);
    }
  };

  const handleDrawingSaved = async ({ pngBase64, scene }) => {
    setIsDrawingSaving(true);
    try {
      const ts = fileTimestamp();
      const imageFile = await base64ToUploadFile(pngBase64, `drawing_${ts}.png`, 'image/png');
      const sceneFile = await textToUploadFile(JSON.stringify(scene), `drawing_${ts}.excalidraw.json`, 'application/json');
      const [imageUpload, sceneUpload] = await Promise.all([uploadFile(imageFile, { kind: 'drawing' }), uploadFile(sceneFile, { kind: 'drawing' })]);
      const drawingId = activeDrawing?.id || createExcalidrawEmbedId();
      const embedLine = createExcalidrawEmbedLine({ id: drawingId, imageUrl: imageUpload.url, sceneUrl: sceneUpload.url });
      const current = textRef.current;
      const nextText = activeDrawing?.id ? replaceExcalidrawEmbedLine(current, activeDrawing.id, embedLine) : appendLine(current, embedLine);
      setEditText(nextText);
      if (await saveHandler(nextText)) setLastSavedText(nextText);
      showToast('Success', 'Drawing saved', 3000, 'success');
      closeDrawingEditor();
    } catch (err) {
      handleApiError(err);
      setIsDrawingSaving(false);
    }
  };

  const openTableEditor = (index) => {
    const table = getTableModel(textRef.current, index);
    if (table) setTableEdit({ index, table });
  };

  const closeTableEditor = () => setTableEdit(null);

  const handleTableEditorSave = async (model) => {
    const nextText = replaceTableInText(textRef.current, tableEdit.index, model);
    setEditText(nextText);
    setTableEdit(null);
    if (await saveHandler(nextText)) setLastSavedText(nextText);
  };

  const handleDeleteEmbeddedFile = (src) => {
    setEditText((prev) => removeFileFromText(prev, src));
    showToast('Success', 'File removed from note', 2500, 'success');
  };

  const noteAction = async (path, message, events = []) => {
    try {
      await fetchJSON(path);
      showToast('Success', message, 3000, 'success');
      events.forEach((e) => emit(e));
      refreshNotes?.();
      if (autoCloseOnAction) onClose();
    } catch (err) {
      handleApiError(err);
    }
  };

  const increaseImportance = () => noteAction(`/api/note/message/increase_importance/${note.id}/`, 'Importance increased', ['updateNoteLists', 'refreshImportantNotes']);
  const decreaseImportance = () => noteAction(`/api/note/message/decrease_importance/${note.id}/`, 'Importance decreased', ['refreshImportantNotes']);
  const hideMessage = () => noteAction(`/api/note/message/archive/${note.id}/`, 'Message archived');
  const unHideMessage = () => noteAction(`/api/note/message/unarchive/${note.id}/`, 'Message unarchived');

  return {
    inputRef,
    isPreviewMode,
    setIsPreviewMode,
    togglePreview: () => setIsPreviewMode((v) => !v),
    lastSavedText,
    resetSaved,
    hasUnsavedChanges,
    showConfirmDialog,
    showRevisionModal,
    setShowRevisionModal,
    showDrawingEditor,
    isDrawingLoading,
    isDrawingSaving,
    drawingInitialData,
    openDrawingEditor,
    openExistingDrawingEditor,
    closeDrawingEditor,
    handleDrawingSaved,
    tableEdit,
    openTableEditor,
    closeTableEditor,
    handleTableEditorSave,
    isRtl,
    toggleEditorRtl,
    isUploading,
    handleSave,
    handleSaveAndClose,
    handleRequestClose,
    handleConfirmClose,
    handleCancelClose,
    handleFileUpload,
    uploadImageFile,
    handlePasteImageButton,
    handleQuoteToggle,
    insertTable,
    handleDeleteEmbeddedFile,
    increaseImportance,
    decreaseImportance,
    hideMessage,
    unHideMessage,
  };
}
