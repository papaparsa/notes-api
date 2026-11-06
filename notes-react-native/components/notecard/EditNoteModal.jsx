import { useEffect } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/UIContext';
import useNoteEditor from '../../hooks/useNoteEditor';
import MarkdownTextArea from '../MarkdownTextArea';
import { AppModal, Button } from '../ui';
import NoteTextRenderer from './markdown/MarkdownRenderers';
import EditNoteButtons from './EditNoteButtons';
import EditorModals from './EditorModals';

export default function EditNoteModal({ visible, note, editText, setEditText, onSave, onClose, refreshNotes }) {
  const { colors } = useTheme();
  const showToast = useToast();
  const { height } = useWindowDimensions();
  const editor = useNoteEditor({
    note,
    editText,
    setEditText,
    showToast,
    refreshNotes,
    onClose,
    saveHandler: async (text) => (await onSave(text)) !== false,
    autoCloseOnAction: true,
    active: visible,
  });

  useEffect(() => {
    if (visible) editor.resetSaved(note.text);
  }, [visible]);

  return (
    <>
      <AppModal
        visible={visible}
        onClose={editor.handleRequestClose}
        title="Edit Note"
        titleStyle={{ fontSize: 16 }}
        headerStyle={{ padding: 4, paddingHorizontal: 12 }}
        size="lg"
        fullscreen="xxl-down"
        scroll={false}
        bodyStyle={{ padding: 8 }}
        footer={
          <>
            <Button variant="secondary" title="Cancel" onPress={editor.handleRequestClose} />
            <Button title="Save" onPress={editor.handleSaveAndClose} />
          </>
        }
      >
        <EditNoteButtons note={note} editor={editor} refreshNotes={refreshNotes} />
        {editor.isPreviewMode ? (
          <ScrollView style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 6, maxHeight: height * 0.6, minHeight: 200 }} contentContainerStyle={{ padding: 16 }}>
            <NoteTextRenderer
              note={{ ...note, text: editText }}
              singleView
              shouldLoadLinks={false}
              onDeleteFile={editor.handleDeleteEmbeddedFile}
              onExcalidrawEdit={editor.openExistingDrawingEditor}
              onTableEdit={editor.openTableEditor}
            />
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <MarkdownTextArea
              ref={editor.inputRef}
              value={editText}
              onChangeText={setEditText}
              rtl={editor.isRtl}
              autoFocus
              onSave={editor.handleSave}
              onSaveAndClose={editor.handleSaveAndClose}
              onTogglePreview={editor.togglePreview}
              onPasteImage={editor.uploadImageFile}
              minHeight={Math.max(300, height * 0.6)}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 6, flex: 1 }}
              lineHeight={24}
            />
          </View>
        )}
      </AppModal>
      <EditorModals note={note} editor={editor} />
    </>
  );
}
