import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/UIContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import useNoteEditor from '../../hooks/useNoteEditor';
import useScrollSync from '../../hooks/useScrollSync';
import { KEYS, getItem, setItem } from '../../lib/storage';
import MarkdownTextArea from '../MarkdownTextArea';
import NoteTextRenderer from '../notecard/markdown/MarkdownRenderers';
import EditNoteButtons from '../notecard/EditNoteButtons';
import EditorModals from '../notecard/EditorModals';
import { Button, H } from '../ui';

const PAD = 12;

export default function NoteEditView({ note, onSave, onDone }) {
  const { colors } = useTheme();
  const showToast = useToast();
  const { lg } = useBreakpoint();
  const { height } = useWindowDimensions();
  const [editText, setEditText] = useState(note.text);
  const [isSplit, setIsSplit] = useState(true);
  const [isSynced, setIsSynced] = useState(true);
  const previewRef = useRef(null);
  const editorLayout = useRef(null);

  const editor = useNoteEditor({ note, editText, setEditText, showToast, onClose: onDone, saveHandler: onSave, enableBeforeUnload: true });

  useEffect(() => {
    getItem(KEYS.scrollSync).then((v) => setIsSynced(v !== 'false'));
  }, []);

  const toggleSync = () => {
    setIsSynced((v) => {
      setItem(KEYS.scrollSync, String(!v));
      return !v;
    });
  };

  const split = lg && isSplit;
  const sync = useScrollSync({ enabled: split && isSynced, text: editText, editorInputRef: editor.inputRef, editorLayout, previewRef, padding: PAD });
  const paneHeight = Math.max(320, height - (lg ? 240 : 300));

  const textarea = (
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
      minHeight={paneHeight}
      maxHeight={paneHeight}
      lineHeight={25.6}
      onScroll={split ? sync.onEditorScroll : undefined}
      style={{ padding: PAD, borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: paneHeight }}
    />
  );

  const preview = (scrollable) => (
    <ScrollView
      ref={scrollable ? previewRef : undefined}
      onScroll={scrollable ? sync.onPreviewScroll : undefined}
      onContentSizeChange={scrollable ? sync.onPreviewContentSize : undefined}
      scrollEventThrottle={16}
      style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: paneHeight, maxHeight: paneHeight }}
      contentContainerStyle={{ padding: PAD }}
    >
      <NoteTextRenderer
        note={{ ...note, text: editText }}
        singleView
        shouldLoadLinks={false}
        onDeleteFile={editor.handleDeleteEmbeddedFile}
        onExcalidrawEdit={editor.openExistingDrawingEditor}
        onTableEdit={editor.openTableEditor}
        onBlockLayout={scrollable ? (line, y) => sync.onBlockLayout(line, y + PAD) : undefined}
      />
    </ScrollView>
  );

  return (
    <View style={{ paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <H level={5} style={{ marginBottom: 0 }}>Edit Note</H>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {split ? (
            <Button size="sm" variant="outline-secondary" active={isSynced} onPress={toggleSync} accessibilityLabel={`Sync scroll: ${isSynced ? 'on' : 'off'}`}>
              <Ionicons name="swap-vertical" size={16} color={isSynced ? '#fff' : colors.secondary} />
            </Button>
          ) : null}
          {lg ? (
            <Button size="sm" variant="outline-secondary" onPress={() => setIsSplit((v) => !v)} accessibilityLabel={isSplit ? 'Single pane' : 'Side by side'}>
              <Ionicons name={isSplit ? 'square-outline' : 'browsers-outline'} size={16} color={colors.secondary} />
            </Button>
          ) : null}
          <Button size="sm" variant="outline-secondary" title="← Back" onPress={editor.handleRequestClose} />
          <Button size="sm" title="Save & Close" onPress={editor.handleSaveAndClose} />
        </View>
      </View>
      <EditNoteButtons note={note} editor={editor} singleView />
      {split ? (
        <View style={{ flexDirection: 'row', gap: 0 }}>
          <View style={{ width: '50%', paddingRight: 12 }} onLayout={(e) => (editorLayout.current = e.nativeEvent.layout)}>
            {textarea}
          </View>
          <View style={{ width: '50%', paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.border }}>{preview(true)}</View>
        </View>
      ) : editor.isPreviewMode ? (
        preview(false)
      ) : (
        textarea
      )}
      <EditorModals note={note} editor={editor} />
    </View>
  );
}
