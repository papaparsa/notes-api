import React, { useEffect } from "react";
import { Modal, Button } from "react-bootstrap";
import { isRTL } from "../../utils/stringUtils";
import styles from "./NoteCard.module.css";
import NoteTextRenderer from "./markdown/MarkdownRenderers";
import RevisionHistoryModal from "./RevisionHistoryModal";
import EditNoteButtons from "./EditNoteButtons";
import ExcalidrawOverlay from "./ExcalidrawOverlay";
import useNoteEditor from "../../hooks/useNoteEditor";

const EditNoteModal = ({
  show,
  onHide,
  note,
  editText,
  setEditText,
  onSave,
  onSaveAndClose,
  singleView,
  showToast,
  refreshNotes,
  workspaceSlug = null,
}) => {
  const saveHandler = async (textToSave) => {
    const result = await onSave(textToSave);
    return result !== false;
  };

  const {
    isPreviewMode,
    setIsPreviewMode,
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
    handleDeleteEmbeddedFile,
    openDrawingEditor,
    openExistingDrawingEditor,
    handleDrawingSave,
    toggleEditorRtl,
    increaseImportance,
    decreaseImportance,
    hideMessage,
    unHideMessage,
    handleQuoteToggle,
  } = useNoteEditor({
    note,
    editText,
    setEditText,
    showToast,
    refreshNotes,
    onClose: onHide,
    saveHandler,
    autoCloseOnAction: true,
  });

  useEffect(() => {
    if (show) {
      setLastSavedText(editText);
      if (editMessageTextAreaRef.current) {
        editMessageTextAreaRef.current.dir = isRTL(note.text) ? "rtl" : "ltr";
      }
    }
  }, [show]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      if (editMessageTextAreaRef.current) {
        const newHeight = viewport.height * 0.6;
        editMessageTextAreaRef.current.style.height = `${newHeight}px`;
      }
    };

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);
    handleResize();

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  return (
    <>
      <Modal
        show={show}
        onHide={handleRequestClose}
        fullscreen="xxl-down"
        size="lg"
      >
        <Modal.Header closeButton className="p-1">
          <Modal.Title className="fs-6">Edit Note</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <EditNoteButtons
            note={note}
            singleView={singleView}
            refreshNotes={refreshNotes}
            hasUnsavedChanges={hasUnsavedChanges}
            editText={editText}
            setEditText={setEditText}
            handleFileUpload={handleFileUpload}
            toggleEditorRtl={toggleEditorRtl}
            isPreviewMode={isPreviewMode}
            setIsPreviewMode={setIsPreviewMode}
            handleSave={handleSave}
            increaseImportance={increaseImportance}
            decreaseImportance={decreaseImportance}
            hideMessage={hideMessage}
            unHideMessage={unHideMessage}
            setShowRevisionModal={setShowRevisionModal}
            handleQuoteToggle={handleQuoteToggle}
            openDrawingEditor={openDrawingEditor}
          />

          <div className="position-relative">
            {isPreviewMode ? (
              <div className={`${styles.previewArea} p-3 border rounded`}>
                <NoteTextRenderer
                  note={{ text: editText }}
                  singleView={true}
                  shouldLoadLinks={false}
                  showToast={showToast}
                  onDeleteFile={handleDeleteEmbeddedFile}
                  onExcalidrawEdit={openExistingDrawingEditor}
                  workspaceSlug={workspaceSlug}
                />
              </div>
            ) : (
              <textarea
                ref={editMessageTextAreaRef}
                value={editText}
                onChange={handleChange}
                onKeyDown={handleEnter}
                onPaste={handlePaste}
                className={`${styles.monospace} ${styles.editTextArea} w-100`}
              />
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleRequestClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveAndClose}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showConfirmDialog}
        onHide={handleCancelClose}
        size="sm"
        centered
      >
        <Modal.Header>
          <Modal.Title>Unsaved Changes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to close? Your unsaved changes will be lost.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmClose}>
            Close Without Saving
          </Button>
        </Modal.Footer>
      </Modal>

      <RevisionHistoryModal
        show={showRevisionModal}
        onHide={() => setShowRevisionModal(false)}
        noteId={note.id}
      />

      <ExcalidrawOverlay
        show={showDrawingEditor}
        onHide={closeDrawingEditor}
        onSave={handleDrawingSave}
        initialData={drawingInitialData}
        isLoading={isDrawingLoading}
      />
    </>
  );
};

export default EditNoteModal;
