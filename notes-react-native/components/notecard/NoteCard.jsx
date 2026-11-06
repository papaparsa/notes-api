import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast, useWaiting } from '../../contexts/UIContext';
import { API_URL } from '../../config';
import { fetchJSON } from '../../lib/api';
import { copyText } from '../../lib/clipboard';
import { handleApiError } from '../../lib/errorHandler';
import { extractMarkdownTitle, removeFileFromText } from '../../lib/stringUtils';
import { getTableModel, replaceTableInText } from '../../lib/markdownTable';
import { AppModal, Button, ConfirmModal, Dropdown, MenuDivider, MenuItem, T } from '../ui';
import NoteTextRenderer from './markdown/MarkdownRenderers';
import NoteCardBottomBar from './NoteCardBottomBar';
import MoveModal from './MoveModal';
import EditNoteModal from './EditNoteModal';
import ReminderModal from './ReminderModal';
import TableEditorModal from './TableEditorModal';
import SelectableTextContainer from './SelectableTextContainer';

const appOrigin = () => (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : API_URL);

export default function NoteCard({ note, singleView, hideEdits, onEditNote, onDeleteNote, refreshNotes, onNoteMoved, highlightStart, highlightEnd, onHighlightLayout, style }) {
  const { colors } = useTheme();
  const showToast = useToast();
  const waiting = useWaiting();
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState(null);
  const [editText, setEditText] = useState(note.text);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [tableEdit, setTableEdit] = useState(null);

  const close = () => setModal(null);

  const moveNote = async (list) => {
    waiting.show('Moving note');
    try {
      await fetchJSON(`/api/note/message/move/${note.id}/`, { method: 'POST', body: { list_id: list.id } });
      note.list = list.id;
      onNoteMoved?.(note.id, list.id);
      close();
      showToast('Success', 'Note moved', 3000, 'success');
    } catch (err) {
      handleApiError(err);
    } finally {
      waiting.hide();
    }
  };

  const copyNote = () => copyText(note.text);

  const copyLink = async () => {
    await copyText(`[${extractMarkdownTitle(note.text)}](/message/${note.id})`);
    showToast('Success', 'Note link copied to clipboard', 3000, 'success');
  };

  const copyHighlightLink = async () => {
    await copyText(`${appOrigin()}/message/${note.id}?highlight_start=${selection.start}&highlight_end=${selection.end}`);
    showToast('Success', 'Highlight link copied to clipboard', 3000, 'success');
    close();
  };

  const save = (text) => onEditNote?.(note.id, text, note.updated_at);

  const deleteFile = (src) => save(removeFileFromText(note.text, src));

  const openTable = (index) => {
    const table = getTableModel(note.text, index);
    if (table) setTableEdit({ index, table });
  };

  const saveTable = async (model) => {
    const next = replaceTableInText(note.text, tableEdit.index, model);
    setTableEdit(null);
    await save(next);
  };

  return (
    <View style={[{ borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.tertiaryBg, padding: 16, paddingBottom: 4 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Dropdown
          width={200}
          trigger={(open) => <Button size="sm" variant="outline-secondary" onPress={open} accessibilityLabel="Note actions"><Ionicons name="caret-down" size={12} color={colors.secondary} /></Button>}
        >
          {!hideEdits ? <MenuItem label="Move" onPress={() => setModal('move')} /> : null}
          {!hideEdits ? <MenuDivider /> : null}
          <MenuItem label="Copy" onPress={copyNote} />
          <MenuItem label="Copy Link" onPress={copyLink} />
          <MenuItem
            label="Highlight Link"
            onPress={() => {
              setSelection({ start: 0, end: 0 });
              setModal('highlight');
            }}
          />
          {!hideEdits && !singleView ? (
            <MenuItem
              label="Edit"
              onPress={() => {
                setEditText(note.text);
                setModal('edit');
              }}
            />
          ) : null}
          {!hideEdits ? <MenuItem label="Create Reminder" onPress={() => setModal('reminder')} /> : null}
          {!singleView && !hideEdits ? <MenuItem label="Delete" danger onPress={() => setModal('delete')} /> : null}
        </Dropdown>
        <View style={{ flex: 1, minWidth: 0 }}>
          <NoteTextRenderer
            note={note}
            singleView={singleView}
            isExpanded={expanded}
            onExpand={() => setExpanded(true)}
            shouldLoadLinks={modal !== 'edit'}
            onDeleteFile={singleView && !hideEdits ? deleteFile : undefined}
            onTableEdit={!hideEdits ? openTable : undefined}
            allowCodeRun={!hideEdits}
            highlightStart={highlightStart}
            highlightEnd={highlightEnd}
            onHighlightLayout={onHighlightLayout}
          />
        </View>
      </View>
      <NoteCardBottomBar note={note} singleView={singleView} />

      {modal === 'move' ? <MoveModal visible onClose={close} currentListId={note.list} onMove={moveNote} /> : null}
      <ConfirmModal
        visible={modal === 'delete'}
        title="Deleting note"
        centered={false}
        body={`${note.text.substring(0, 30)} ...`}
        onCancel={close}
        onConfirm={() => {
          close();
          onDeleteNote?.(note.id);
        }}
      />
      <AppModal
        visible={modal === 'highlight'}
        onClose={close}
        title="Copy Highlight Link"
        size="lg"
        footer={
          <>
            <Button variant="secondary" title="Close" onPress={close} />
            <Button title="Copy Highlight Link" onPress={copyHighlightLink} disabled={!(selection.end > selection.start)} />
          </>
        }
      >
        <T muted style={{ marginBottom: 8 }}>Select the text you want to highlight, then copy the link.</T>
        <SelectableTextContainer text={note.text} selection={selection} onSelectionChange={setSelection} showPreview={false} />
      </AppModal>
      {modal === 'edit' ? (
        <EditNoteModal
          visible
          note={note}
          editText={editText}
          setEditText={setEditText}
          onSave={save}
          onClose={close}
          refreshNotes={refreshNotes}
        />
      ) : null}
      {modal === 'reminder' ? <ReminderModal visible onClose={close} note={note} /> : null}
      <TableEditorModal visible={!!tableEdit} table={tableEdit?.table} onCancel={() => setTableEdit(null)} onSave={saveTable} />
    </View>
  );
}
