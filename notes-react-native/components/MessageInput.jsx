import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/UIContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { fetchJSON, uploadFile } from '../lib/api';
import { handleApiError } from '../lib/errorHandler';
import { readClipboardImage } from '../lib/pasteImage';
import { fileTimestamp, isRTL } from '../lib/stringUtils';
import { insertEmptyTable } from '../lib/tableEditing';
import { shadow } from '../styles/theme';
import FileUploadComponent from './FileUploadComponent';
import FloatingNoteButton from './FloatingNoteButton';
import JoystickFab from './JoystickFab';
import MarkdownTextArea from './MarkdownTextArea';
import InsertTableButton from './buttons/InsertTableButton';
import NoteTextRenderer from './notecard/markdown/MarkdownRenderers';
import { Button, ConfirmModal } from './ui';

export default function MessageInput({ listSlug, onNoteCreated, currentPage, totalPages, onPageChange }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { lg } = useBreakpoint();
  const showToast = useToast();
  const { selectedWorkspaceSlug } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [rtlOverride, setRtlOverride] = useState(null);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const inputRef = useRef(null);

  const rtl = rtlOverride ?? isRTL(text);

  const close = () => {
    setExpanded(false);
    setPreview(false);
    setRtlOverride(null);
  };

  const requestClose = () => {
    if (text.trim()) setConfirmDiscard(true);
    else close();
  };

  const send = async () => {
    if (!text.trim() || sending || uploading) return;
    setSending(true);
    try {
      const note = await fetchJSON(`/api/note/${encodeURIComponent(listSlug || 'All')}/`, { method: 'POST', body: { text, workspace: selectedWorkspaceSlug || undefined } });
      onNoteCreated?.({ ...note, type: 'note' });
      setText('');
      setSent(true);
      setTimeout(() => setSent(false), 2000);
      setPulse((p) => p + 1);
      close();
    } catch (err) {
      handleApiError(err);
    } finally {
      setSending(false);
    }
  };

  const uploadPasted = async (file) => {
    setUploading(true);
    try {
      const data = await uploadFile({ ...file, name: `pasted_image_${fileTimestamp()}.png` });
      setText((prev) => prev + (prev ? '\n' : '') + `![${data.file_name}](${data.url})`);
    } catch (err) {
      handleApiError(err);
    } finally {
      setUploading(false);
    }
  };

  const pasteImage = async () => {
    const img = await readClipboardImage().catch(() => null);
    if (img) uploadPasted(img);
    else showToast('Paste', 'No image in clipboard', 2500, 'warning');
  };

  const insertTable = (rows, cols) => {
    const sel = inputRef.current?.getSelection?.() || { start: text.length, end: text.length };
    const result = insertEmptyTable(text, sel.start, sel.end, rows, cols);
    if (inputRef.current?.isMounted?.() && !preview) inputRef.current.applyEdit(result);
    else setText(result.text);
  };

  const fab = <FloatingNoteButton inline={!lg && !!onPageChange} onPress={() => setExpanded(true)} pulse={pulse} />;

  return (
    <>
      {!expanded ? (
        !lg && onPageChange ? (
          <JoystickFab currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange}>
            {fab}
          </JoystickFab>
        ) : (
          fab
        )
      ) : null}
      <Modal visible={expanded} transparent animationType="slide" onRequestClose={requestClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={requestClose} />
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 + insets.bottom, alignItems: 'center' }}>
            <View style={[{ width: '100%', maxWidth: 800, backgroundColor: colors.bodyBg, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, shadow(2)]}>
              <View style={{ paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.tertiaryBg }}>
                <Text style={{ color: sent ? '#198754' : colors.text, fontWeight: '500' }}>{sent ? '✓ Note Sent!' : 'New Note'}</Text>
                <Pressable onPress={requestClose} accessibilityLabel="Minimize" hitSlop={10}>
                  <Ionicons name="remove" size={22} color={colors.muted} />
                </Pressable>
              </View>
              {preview ? (
                <ScrollView style={{ minHeight: 120, maxHeight: 300 }} contentContainerStyle={{ padding: 16 }}>
                  <NoteTextRenderer text={text} note={{ text }} singleView shouldLoadLinks={false} allowCodeRun={false} />
                </ScrollView>
              ) : (
                <MarkdownTextArea
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  rtl={rtl}
                  autoFocus
                  editable={!uploading}
                  placeholder="What's on your mind?"
                  minHeight={120}
                  maxHeight={300}
                  onSaveAndClose={send}
                  onPasteImage={uploadPasted}
                />
              )}
              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <FileUploadComponent onSuccess={(data) => setText((prev) => prev + (prev ? '\n' : '') + `[${data.file_name}](${encodeURI(decodeURIComponent(data.url))})`)} />
                  <Button size="sm" variant="outline-secondary" icon="clipboard-outline" onPress={pasteImage} accessibilityLabel="Paste image" />
                  <Button size="sm" variant="outline-secondary" title={rtl ? 'RTL' : 'LTR'} onPress={() => setRtlOverride(!rtl)} accessibilityLabel="Toggle text direction" />
                  <InsertTableButton onInsert={insertTable} />
                  <Button size="sm" variant={preview ? 'primary' : 'outline-secondary'} icon="eye-outline" onPress={() => setPreview((v) => !v)} accessibilityLabel="Toggle preview" />
                  {uploading ? <ActivityIndicator size="small" /> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button variant="outline-secondary" title="Cancel" onPress={requestClose} />
                  <Button onPress={send} disabled={!text.trim() || sending || uploading} loading={sending} icon={sending ? undefined : 'paper-plane'} title="Send" />
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
        <ConfirmModal
          visible={confirmDiscard}
          title="Discard Note?"
          body="You have unsaved text. Are you sure you want to discard it?"
          cancelLabel="Keep Editing"
          confirmLabel="Discard"
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => {
            setConfirmDiscard(false);
            setText('');
            close();
          }}
        />
      </Modal>
    </>
  );
}
