"use client";

import React, { useEffect, useState, useContext } from "react";
import { Button, Modal, Row, Col } from "react-bootstrap";
import { isRTL } from "../../../../utils/stringUtils";
import styles from "../../../../components/notecard/NoteCard.module.css";
import editStyles from "./NoteEditView.module.css";
import NoteTextRenderer from "../../../../components/notecard/markdown/MarkdownRenderers";
import RevisionHistoryModal from "../../../../components/notecard/RevisionHistoryModal";
import EditNoteButtons from "../../../../components/notecard/EditNoteButtons";
import ExcalidrawOverlay from "../../../../components/notecard/ExcalidrawOverlay";
import SplitViewToggleButton from "./SplitViewToggleButton";
import { ToastContext, WorkspaceContext } from "../../../layout";
import useNoteEditor from "../../../../hooks/useNoteEditor";

const NoteEditView = ({ note, editNote, onDone, refreshNotes }) => {
  const showToast = useContext(ToastContext);
  const { selectedWorkspace } = useContext(WorkspaceContext);
  const [editText, setEditText] = useState(note.text);
  const [isSplitView, setIsSplitView] = useState(true);

  const saveHandler = async (text) => editNote(note.id, text, note.updated_at);

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
    onClose: onDone,
    saveHandler,
    enableBeforeUnload: true,
  });

  const setVisibleTextAreaRef = (element) => {
    if (element && element.offsetParent !== null) {
      editMessageTextAreaRef.current = element;
    }
  };

  useEffect(() => {
    setEditText(note.text);
    setLastSavedText(note.text);
  }, [note.id]);

  useEffect(() => {
    if (editMessageTextAreaRef.current) {
      editMessageTextAreaRef.current.dir = isRTL(note.text) ? "rtl" : "ltr";
      editMessageTextAreaRef.current.focus();
    }
  }, []);

  return (
    <>
      <div className={editStyles.editViewContainer}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Edit Note</h5>
          <div className="d-flex gap-2">
            <SplitViewToggleButton
              isSplitView={isSplitView}
              onToggle={() => setIsSplitView((v) => !v)}
            />
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleRequestClose}
            >
              ← Back
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAndClose}>
              Save & Close
            </Button>
          </div>
        </div>

        <EditNoteButtons
          note={note}
          singleView={true}
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

        {/* Desktop layout */}
        <Row className="d-none d-lg-flex flex-grow-1">
          {isSplitView ? (
            <>
              <Col lg={6} className="d-flex flex-column">
                <textarea
                  ref={setVisibleTextAreaRef}
                  value={editText}
                  onChange={handleChange}
                  onKeyDown={handleEnter}
                  onPaste={handlePaste}
                  className={`${styles.monospace} ${editStyles.editTextAreaFullpage} w-100 flex-grow-1`}
                />
              </Col>
              <Col
                lg={6}
                className={`${editStyles.previewPane} d-flex flex-column`}
              >
                <div className={`${editStyles.previewContent} flex-grow-1`}>
                  <NoteTextRenderer
                    note={{ ...note, text: editText }}
                    singleView={true}
                    shouldLoadLinks={false}
                    showToast={showToast}
                    onExcalidrawEdit={openExistingDrawingEditor}
                    workspaceSlug={selectedWorkspace?.slug}
                  />
                </div>
              </Col>
            </>
          ) : (
            <Col lg={12} className="d-flex flex-column">
              {isPreviewMode ? (
                <div className={`${editStyles.previewContent} flex-grow-1`}>
                  <NoteTextRenderer
                    note={{ ...note, text: editText }}
                    singleView={true}
                    shouldLoadLinks={false}
                    showToast={showToast}
                    onExcalidrawEdit={openExistingDrawingEditor}
                    workspaceSlug={selectedWorkspace?.slug}
                  />
                </div>
              ) : (
                <textarea
                  ref={setVisibleTextAreaRef}
                  value={editText}
                  onChange={handleChange}
                  onKeyDown={handleEnter}
                  onPaste={handlePaste}
                  className={`${styles.monospace} ${editStyles.editTextAreaFullpage} w-100 flex-grow-1`}
                />
              )}
            </Col>
          )}
        </Row>

        {/* Mobile: toggle between editor and preview */}
        <div className="d-lg-none flex-grow-1 d-flex flex-column">
          {isPreviewMode ? (
            <div className={`${editStyles.previewContent} flex-grow-1`}>
              <NoteTextRenderer
                note={{ ...note, text: editText }}
                singleView={true}
                shouldLoadLinks={false}
                showToast={showToast}
                onExcalidrawEdit={openExistingDrawingEditor}
                workspaceSlug={selectedWorkspace?.slug}
              />
            </div>
          ) : (
            <textarea
              ref={setVisibleTextAreaRef}
              value={editText}
              onChange={handleChange}
              onKeyDown={handleEnter}
              onPaste={handlePaste}
              className={`${styles.monospace} ${editStyles.editTextAreaFullpage} w-100 flex-grow-1`}
            />
          )}
        </div>
      </div>

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

export default NoteEditView;
