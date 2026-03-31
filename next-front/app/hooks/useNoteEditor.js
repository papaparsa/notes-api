import { useRef, useEffect, useState } from "react";
import { fetchWithAuth } from "../lib/api";
import { handleApiError } from "../utils/errorHandler";
import {
  createExcalidrawEmbedId,
  createExcalidrawEmbedLine,
  replaceExcalidrawEmbedLine,
} from "../utils/excalidrawEmbed";

const useNoteEditor = ({
  note,
  editText,
  setEditText,
  showToast,
  refreshNotes,
  onClose,
  saveHandler,
  autoCloseOnAction = false,
  enableBeforeUnload = false,
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastSavedText, setLastSavedText] = useState(editText);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showDrawingEditor, setShowDrawingEditor] = useState(false);
  const [isDrawingLoading, setIsDrawingLoading] = useState(false);
  const [drawingInitialData, setDrawingInitialData] = useState(null);
  const [activeDrawing, setActiveDrawing] = useState(null);
  const editMessageTextAreaRef = useRef(null);

  const hasUnsavedChanges = editText !== lastSavedText;

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        setIsPreviewMode((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  useEffect(() => {
    if (!enableBeforeUnload) return;
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enableBeforeUnload, hasUnsavedChanges]);

  const handleSave = async () => {
    const result = await saveHandler(editText);
    if (result) {
      setLastSavedText(editText);
    }
  };

  const handleSaveAndClose = async () => {
    const result = await saveHandler(editText);
    if (result) {
      setLastSavedText(editText);
      onClose();
    }
  };

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmDialog(false);
  };

  const handleChange = (e) => {
    setEditText(e.target.value);
  };

  const handleEnter = (e) => {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey;
    if (isCmdOrCtrl && e.key === "Enter") {
      handleSaveAndClose();
    } else if (e.shiftKey && e.key === "Enter") {
      handleSave();
    }
  };

  const toggleEditorRtl = () => {
    if (editMessageTextAreaRef.current) {
      editMessageTextAreaRef.current.dir =
        editMessageTextAreaRef.current.dir === "rtl" ? "ltr" : "rtl";
    }
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetchWithAuth("/api/note/upload/", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file");
    }

    return response.json();
  };

  const handleFileUpload = (data) => {
    const decodedUrl = decodeURIComponent(data.url);
    const fileName = data.file_name;
    const encodedUrl = encodeURI(decodedUrl);
    const markdownLink = `[${fileName}](${encodedUrl})`;
    setEditText((prevText) => prevText + (prevText ? "\n" : "") + markdownLink);
  };

  const handleImageUpload = async (file) => {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .split(".")[0];
    const uniqueFileName = `pasted_image_${timestamp}`;
    const renamedFile = new File([file], `${uniqueFileName}.png`, {
      type: file.type,
    });
    try {
      const data = await uploadFile(renamedFile);
      const imageMarkdown = `![${data.file_name}](${data.url})`;
      setEditText(
        (prevText) => prevText + (prevText ? "\n" : "") + imageMarkdown,
      );
    } catch (err) {
      console.error("Error uploading image:", err);
      handleApiError(err);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        await handleImageUpload(blob);
        break;
      }
    }
  };

  const openDrawingEditor = () => {
    setActiveDrawing(null);
    setDrawingInitialData(null);
    setShowDrawingEditor(true);
  };

  const closeDrawingEditor = () => {
    setShowDrawingEditor(false);
    setIsDrawingLoading(false);
    setDrawingInitialData(null);
    setActiveDrawing(null);
  };

  const openExistingDrawingEditor = async ({ id, sceneUrl }) => {
    setActiveDrawing({ id, sceneUrl });
    setShowDrawingEditor(true);
    setIsDrawingLoading(true);

    try {
      const response = await fetchWithAuth(sceneUrl, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to load drawing");
      }
      const sceneData = await response.json();
      setDrawingInitialData(sceneData);
    } catch (err) {
      console.error("Error loading drawing:", err);
      handleApiError(err);
      setShowDrawingEditor(false);
      setActiveDrawing(null);
      setDrawingInitialData(null);
    } finally {
      setIsDrawingLoading(false);
    }
  };

  const handleDrawingSave = async ({ elements, appState, files }) => {
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const imageBlob = await exportToBlob({
        elements,
        appState,
        files,
        mimeType: "image/png",
      });

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, "")
        .replace("T", "_")
        .split(".")[0];

      const imageFile = new File([imageBlob], `drawing_${timestamp}.png`, {
        type: "image/png",
      });

      const drawingPayload = {
        type: "excalidraw",
        version: 2,
        source: "notes-api",
        elements,
        appState: {
          ...appState,
          collaborators: [],
        },
        files,
      };

      const drawingBlob = new Blob([JSON.stringify(drawingPayload)], {
        type: "application/json",
      });

      const drawingFile = new File(
        [drawingBlob],
        `drawing_${timestamp}.excalidraw.json`,
        {
          type: "application/json",
        },
      );

      const [imageUpload, sceneUpload] = await Promise.all([
        uploadFile(imageFile),
        uploadFile(drawingFile),
      ]);

      const drawingId = activeDrawing?.id || createExcalidrawEmbedId();
      const embedLine = createExcalidrawEmbedLine({
        id: drawingId,
        imageUrl: imageUpload.url,
        sceneUrl: sceneUpload.url,
      });

      setEditText((prevText) => {
        if (activeDrawing?.id) {
          return replaceExcalidrawEmbedLine(prevText, activeDrawing.id, embedLine);
        }
        return prevText + (prevText ? "\n" : "") + embedLine;
      });

      showToast("Success", "Drawing saved", 3000, "success");
      closeDrawingEditor();
    } catch (err) {
      console.error("Error saving drawing:", err);
      handleApiError(err);
    }
  };

  const increaseImportance = async () => {
    try {
      const response = await fetchWithAuth(
        `/api/note/message/increase_importance/${note.id}/`,
      );
      if (!response.ok) throw new Error("Failed to increase importance");
      showToast("Success", "Importance increased", 3000, "success");
      window.dispatchEvent(new Event("updateNoteLists"));
      window.dispatchEvent(new Event("refreshImportantNotes"));
      if (refreshNotes) refreshNotes();
      if (autoCloseOnAction) onClose();
    } catch (err) {
      console.error("Error increasing importance:", err);
      handleApiError(err);
    }
  };

  const decreaseImportance = async () => {
    try {
      const response = await fetchWithAuth(
        `/api/note/message/decrease_importance/${note.id}/`,
      );
      if (!response.ok) throw new Error("Failed to decrease importance");
      showToast("Success", "Importance decreased", 3000, "success");
      window.dispatchEvent(new Event("refreshImportantNotes"));
      if (refreshNotes) refreshNotes();
      if (autoCloseOnAction) onClose();
    } catch (err) {
      console.error("Error decreasing importance:", err);
      handleApiError(err);
    }
  };

  const hideMessage = async () => {
    try {
      const response = await fetchWithAuth(
        `/api/note/message/archive/${note.id}/`,
      );
      if (!response.ok) throw new Error("Failed to archive message");
      showToast("Success", "Message archived", 3000, "success");
      if (refreshNotes) refreshNotes();
      if (autoCloseOnAction) onClose();
    } catch (err) {
      console.error("Error archiving message:", err);
      handleApiError(err);
    }
  };

  const unHideMessage = async () => {
    try {
      const response = await fetchWithAuth(
        `/api/note/message/unarchive/${note.id}/`,
      );
      if (!response.ok) throw new Error("Failed to unarchive message");
      showToast("Success", "Message unarchived", 3000, "success");
      if (refreshNotes) refreshNotes();
      if (autoCloseOnAction) onClose();
    } catch (err) {
      console.error("Error unarchiving message:", err);
      handleApiError(err);
    }
  };

  const handleQuoteToggle = () => {
    if (!editMessageTextAreaRef.current) return;
    const textarea = editMessageTextAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editText;
    const lines = text.split("\n");
    const startLine = text.substring(0, start).split("\n").length - 1;
    const endLine = text.substring(0, end).split("\n").length - 1;
    const selectedLines = lines.slice(startLine, endLine + 1);
    const isQuoted = selectedLines.every((line) => line.startsWith("> "));
    const newLines = selectedLines.map((line) =>
      isQuoted ? line.substring(2) : "> " + line,
    );
    lines.splice(startLine, selectedLines.length, ...newLines);
    const newText = lines.join("\n");
    setEditText(newText);
    textarea.focus();
    const newStart =
      startLine === endLine ? start + (isQuoted ? -2 : 2) : start;
    const newEnd = end + (isQuoted ? -2 : 2) * selectedLines.length;
    textarea.setSelectionRange(newStart, newEnd);
  };

  return {
    isPreviewMode,
    setIsPreviewMode,
    lastSavedText,
    setLastSavedText,
    showConfirmDialog,
    showRevisionModal,
    setShowRevisionModal,
    showDrawingEditor,
    closeDrawingEditor,
    isDrawingLoading,
    drawingInitialData,
    editMessageTextAreaRef,
    hasUnsavedChanges,
    handleSave,
    handleSaveAndClose,
    handleRequestClose,
    handleConfirmClose,
    handleCancelClose,
    handleChange,
    handleEnter,
    handlePaste,
    handleFileUpload,
    openDrawingEditor,
    openExistingDrawingEditor,
    handleDrawingSave,
    toggleEditorRtl,
    increaseImportance,
    decreaseImportance,
    hideMessage,
    unHideMessage,
    handleQuoteToggle,
  };
};

export default useNoteEditor;
