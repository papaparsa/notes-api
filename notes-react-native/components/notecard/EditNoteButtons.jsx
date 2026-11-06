import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import FileUploadComponent from '../FileUploadComponent';
import InsertTableButton from '../buttons/InsertTableButton';
import { Button } from '../ui';

export default function EditNoteButtons({ note, editor, singleView, refreshNotes }) {
  const { colors } = useTheme();
  const { lg } = useBreakpoint();
  const [expanded, setExpanded] = useState(false);

  const importance = note?.importance ?? 0;
  const left = (
    <>
      {!singleView && importance < 4 ? <Button size="sm" variant="outline-primary" icon="arrow-up" onPress={editor.increaseImportance} accessibilityLabel="Increase importance" /> : null}
      {!singleView && importance > 0 ? <Button size="sm" variant="outline-primary" icon="arrow-down" onPress={editor.decreaseImportance} accessibilityLabel="Decrease importance" /> : null}
      {refreshNotes ? (note?.archived ? <Button size="sm" variant="outline-secondary" title="Unhide" onPress={editor.unHideMessage} /> : <Button size="sm" variant="outline-secondary" title="Hide" onPress={editor.hideMessage} />) : null}
      <Button size="sm" variant="outline-secondary" icon="time-outline" onPress={() => editor.setShowRevisionModal(true)} accessibilityLabel="Revision History" />
    </>
  );

  const save = (
    <Button size="sm" variant={editor.hasUnsavedChanges ? 'outline-warning' : 'outline-success'} icon="save-outline" onPress={editor.handleSave} accessibilityLabel="Save" />
  );
  const preview = <Button size="sm" variant={editor.isPreviewMode ? 'primary' : 'outline-secondary'} icon="eye-outline" onPress={editor.togglePreview} accessibilityLabel="Toggle Preview (Ctrl+P)" />;

  const tools = (
    <>
      <FileUploadComponent onSuccess={editor.handleFileUpload} />
      <Button size="sm" variant="outline-secondary" icon="clipboard-outline" onPress={editor.handlePasteImageButton} accessibilityLabel="Paste image" loading={editor.isUploading} />
      <Button size="sm" variant="outline-secondary" title={editor.isRtl ? 'RTL' : 'LTR'} onPress={editor.toggleEditorRtl} accessibilityLabel="Toggle text direction" />
      <Button size="sm" variant="outline-secondary" title="❝" textStyle={{ fontSize: 20, lineHeight: 20 }} onPress={editor.handleQuoteToggle} accessibilityLabel="Toggle Quote" />
      <InsertTableButton onInsert={editor.insertTable} />
      <Button size="sm" variant="outline-secondary" title="Draw" onPress={editor.openDrawingEditor} />
    </>
  );

  if (lg) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 8, flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>{left}</View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {save}
          {tools}
          {preview}
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16, paddingHorizontal: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button size="sm" variant="outline-primary" title={`${expanded ? '▼' : '▶'} Actions`} onPress={() => setExpanded((v) => !v)} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {save}
          {preview}
        </View>
      </View>
      {expanded ? (
        <View style={{ marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{left}</View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{tools}</View>
        </View>
      ) : null}
    </View>
  );
}
