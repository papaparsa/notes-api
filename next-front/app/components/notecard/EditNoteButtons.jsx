import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { isRTL } from "../../utils/stringUtils";
import FileUploadComponent from "../FileUploadComponent";
import SaveButton from "../buttons/edit_buttons/SaveButton";
import RtlToggleButton from "../buttons/edit_buttons/RtlToggleButton";
import PreviewToggleButton from "../buttons/edit_buttons/PreviewToggleButton";
import IncreaseImportanceButton from "../buttons/edit_buttons/IncreaseImportanceButton";
import DecreaseImportanceButton from "../buttons/edit_buttons/DecreaseImportanceButton";
import RevisionHistoryButton from "../buttons/edit_buttons/RevisionHistoryButton";
import QuoteToggleButton from "../buttons/edit_buttons/QuoteToggleButton";

const EditNoteButtons = ({
  note,
  singleView,
  refreshNotes,
  hasUnsavedChanges,
  editText,
  setEditText,
  handleFileUpload,
  toggleEditorRtl,
  isPreviewMode,
  setIsPreviewMode,
  handleSave,
  increaseImportance,
  decreaseImportance,
  hideMessage,
  unHideMessage,
  setShowRevisionModal,
  handleQuoteToggle,
  openDrawingEditor,
}) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <>
      {/* Desktop button layout */}
      <div className="mb-3 mt-0 px-2 d-none d-lg-flex justify-content-between">
        <div className="d-flex gap-2">
          {!singleView && (
            <>
              {note.importance < 4 && (
                <IncreaseImportanceButton
                  onClick={increaseImportance}
                  className="btn-sm"
                />
              )}
              {note.importance > 0 && (
                <DecreaseImportanceButton
                  onClick={decreaseImportance}
                  className="btn-sm"
                />
              )}
            </>
          )}
          {refreshNotes && (
            <>
              {!note.archived ? (
                <Button
                  variant="outline-secondary"
                  onClick={hideMessage}
                  className="btn-sm"
                >
                  Hide
                </Button>
              ) : (
                <Button
                  variant="outline-secondary"
                  onClick={unHideMessage}
                  className="btn-sm"
                >
                  Unhide
                </Button>
              )}
            </>
          )}
          <RevisionHistoryButton
            onClick={() => setShowRevisionModal(true)}
            className="btn-sm"
          />
        </div>
        <div className="d-flex gap-2">
          <SaveButton
            hasUnsavedChanges={hasUnsavedChanges}
            onClick={handleSave}
            className="btn-sm"
          />
          <FileUploadComponent
            onSuccess={handleFileUpload}
            initialText={editText}
            onTextChange={setEditText}
            size="sm"
            className="btn-sm"
          />
          <RtlToggleButton
            onClick={toggleEditorRtl}
            isRTL={isRTL}
            className="btn-sm"
          />
          <QuoteToggleButton onClick={handleQuoteToggle} className="btn-sm" />
          <Button
            variant="outline-secondary"
            onClick={openDrawingEditor}
            className="btn-sm"
          >
            Draw
          </Button>
          <PreviewToggleButton
            className="btn-sm"
            isPreviewMode={isPreviewMode}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          />
        </div>
      </div>

      {/* Mobile button layout */}
      <div className="mb-3 mt-0 px-2 d-lg-none">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? "▼" : "▶"} Actions
          </Button>
          <div className="d-flex gap-2">
            <SaveButton
              hasUnsavedChanges={hasUnsavedChanges}
              onClick={handleSave}
              className="btn-sm"
            />
            <PreviewToggleButton
              className="btn-sm"
              isPreviewMode={isPreviewMode}
              onClick={() => setIsPreviewMode(!isPreviewMode)}
            />
          </div>
        </div>
        {showMobileMenu && (
          <div className="d-flex justify-content-between gap-2 mb-2 p-2 border rounded">
            <div className="d-flex flex-wrap gap-2">
              {!singleView && (
                <>
                  {note.importance < 4 && (
                    <IncreaseImportanceButton
                      onClick={increaseImportance}
                      className="btn-sm"
                    />
                  )}
                  {note.importance > 0 && (
                    <DecreaseImportanceButton
                      onClick={decreaseImportance}
                      className="btn-sm"
                    />
                  )}
                </>
              )}
              {refreshNotes && (
                <>
                  {!note.archived ? (
                    <Button
                      variant="outline-secondary"
                      onClick={hideMessage}
                      className="btn-sm"
                    >
                      Hide
                    </Button>
                  ) : (
                    <Button
                      variant="outline-secondary"
                      onClick={unHideMessage}
                      className="btn-sm"
                    >
                      Unhide
                    </Button>
                  )}
                </>
              )}
              <RevisionHistoryButton
                onClick={() => setShowRevisionModal(true)}
                className="btn-sm"
              />
            </div>
            <div className="d-flex flex-wrap gap-2">
              <FileUploadComponent
                onSuccess={handleFileUpload}
                initialText={editText}
                onTextChange={setEditText}
                size="sm"
                className="btn-sm"
              />
              <RtlToggleButton
                onClick={toggleEditorRtl}
                isRTL={isRTL}
                className="btn-sm"
              />
              <QuoteToggleButton
                onClick={handleQuoteToggle}
                className="btn-sm"
              />
              <Button
                variant="outline-secondary"
                onClick={openDrawingEditor}
                className="btn-sm"
              >
                Draw
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default EditNoteButtons;
