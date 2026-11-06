import { ConfirmModal } from '../ui';
import RevisionHistoryModal from './RevisionHistoryModal';
import TableEditorModal from './TableEditorModal';
import ExcalidrawEditor from './ExcalidrawEditor';
import { handleApiError } from '../../lib/errorHandler';

export default function EditorModals({ note, editor }) {
  return (
    <>
      <ConfirmModal
        visible={editor.showConfirmDialog}
        size="sm"
        title="Unsaved Changes"
        body="Are you sure you want to close? Your unsaved changes will be lost."
        onCancel={editor.handleCancelClose}
        onConfirm={editor.handleConfirmClose}
        confirmLabel="Close Without Saving"
      />
      <RevisionHistoryModal visible={editor.showRevisionModal} onClose={() => editor.setShowRevisionModal(false)} noteId={note?.id} />
      <TableEditorModal visible={!!editor.tableEdit} table={editor.tableEdit?.table} onCancel={editor.closeTableEditor} onSave={editor.handleTableEditorSave} />
      <ExcalidrawEditor
        visible={editor.showDrawingEditor}
        initialData={editor.drawingInitialData}
        loading={editor.isDrawingLoading}
        saving={editor.isDrawingSaving}
        onCancel={editor.closeDrawingEditor}
        onSaved={editor.handleDrawingSaved}
        onError={(m) => handleApiError(new Error(m))}
      />
    </>
  );
}
