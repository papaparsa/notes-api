"use client";

import React, {
  useState,
  useRef,
  useContext,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Dropdown, Modal, Button, Collapse } from "react-bootstrap";
import { NoteListContext, ToastContext } from "../../(notes)/layout";
import { WorkspaceContext } from "../../(notes)/layout";
import { copyTextToClipboard } from "../../utils/clipboardUtils";
import { fetchWithAuth } from "../../lib/api";
import { handleApiError } from "../../utils/errorHandler";
import { extractMarkdownTitle } from "../../utils/stringUtils";
import NoteCardBottomBar from "./NoteCardBottomBar";
import EditNoteModal from "./EditNoteModal";
import NoteTextRenderer from "./markdown/MarkdownRenderers";
import ReminderModal, { SelectableTextContainer } from "./ReminderModal";

const NoteCard = forwardRef(
  (
    { note, singleView, hideEdits, onEditNote, onDeleteNote, refreshNotes },
    ref,
  ) => {
    const showToast = useContext(ToastContext);
    const { selectedWorkspaceSlug, workspaces } = useContext(WorkspaceContext);
    const selectedWorkspace =
      workspaces.find((ws) => ws.slug === selectedWorkspaceSlug) || null;
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [textInsideDeleteModal, setTextInsideDeleteModal] = useState("");
    const [editText, setEditText] = useState(note.text);
    const noteLists = useContext(NoteListContext);
    const [isExpanded, setIsExpanded] = useState(false);
    const [shouldLoadLinks, setShouldLoadLinks] = useState(true);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showOtherCategories, setShowOtherCategories] = useState(false);
    const [showHighlightModal, setShowHighlightModal] = useState(false);
    const [highlightSelection, setHighlightSelection] = useState({
      start: 0,
      end: 0,
    });

    const handleDeleteFile = (src) => {
      // Remove the markdown link containing this src from the note text
      const regex = new RegExp(
        `!\\[.*?\\]\\(${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
        "g",
      );
      const newText = note.text.replace(regex, "");
      // Also remove plain links if any
      const linkRegex = new RegExp(
        `\\[.*?\\]\\(${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
        "g",
      );
      const finalText = newText.replace(linkRegex, "");
      onEditNote(note.id, finalText);
    };

    useImperativeHandle(ref, () => ({
      hideEditModal: () => setShowEditModal(false),
    }));

    const expandNote = () => {
      setIsExpanded(true);
    };

    const moveNote = async (lstId) => {
      window.dispatchEvent(
        new CustomEvent("showWaitingModal", { detail: "Moving note" }),
      );

      try {
        const response = await fetchWithAuth(
          `/api/note/message/move/${note.id}/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ list_id: lstId }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to move note");
        }

        note.list = lstId;
        setShowMoveModal(false);
        showToast("Success", "Note moved", 3000, "success");
      } catch (err) {
        console.error("Error moving note:", err);
        handleApiError(err);
      }
      window.dispatchEvent(new CustomEvent("hideWaitingModal"));
    };

    const copyNoteLink = () => {
      const title = extractMarkdownTitle(note.text);
      const noteLink = `[${title}](/message/${note.id})`;
      copyTextToClipboard(noteLink);
      showToast("Success", "Note link copied to clipboard", 3000, "success");
    };

    const copyHighlightLink = () => {
      if (highlightSelection.end <= highlightSelection.start) return;
      const link = `${window.location.origin}/message/${note.id}?highlight_start=${highlightSelection.start}&highlight_end=${highlightSelection.end}`;
      copyTextToClipboard(link);
      showToast(
        "Success",
        "Highlight link copied to clipboard",
        3000,
        "success",
      );
    };

    const handleSave = async (textToSave = null) => {
      try {
        const nextText = textToSave ?? editText;
        const result = await onEditNote(note.id, nextText, note.updated_at);
        if (result) {
          setShouldLoadLinks(true);
        }
      } catch (error) {
        console.error("Failed to edit note:", error);
      }
    };

    const handleSaveAndClose = async (textToSave = null) => {
      try {
        const nextText = textToSave ?? editText;
        const result = await onEditNote(note.id, nextText, note.updated_at);
        if (result) {
          setShowEditModal(false);
          setShouldLoadLinks(true);
        }
      } catch (error) {
        console.error("Failed to edit note:", error);
      }
    };

    const showEditModalHandler = () => {
      setEditText(note.text);
      setShowEditModal(true);
      setShouldLoadLinks(false); // Disable link loading when editing
    };

    const showDeleteModalHandler = () => {
      const textInModal =
        note.text.length > 30 ? note.text.substring(0, 30) + " ..." : note.text;
      setTextInsideDeleteModal(textInModal);
      setShowDeleteModal(true);
    };

    const renderCategoryButtons = (categories, variant = "info") => {
      return categories.map((lst) => (
        <Button
          key={lst.id}
          variant={variant}
          className="m-1"
          onClick={() => moveNote(lst.id)}
        >
          {lst.name}
        </Button>
      ));
    };

    return (
      <div className="card rounded mb-2 border shadow-sm bg-body-tertiary">
        <div className="card-body pb-1">
          <div className="row">
            <div className="col-sm-1">
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary"></Dropdown.Toggle>
                <Dropdown.Menu>
                  {!hideEdits && (
                    <Dropdown.Item onClick={() => setShowMoveModal(true)}>
                      Move
                    </Dropdown.Item>
                  )}
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => copyTextToClipboard(note.text)}>
                    Copy
                  </Dropdown.Item>
                  <Dropdown.Item onClick={copyNoteLink}>
                    Copy Link
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      setHighlightSelection({ start: 0, end: 0 });
                      setShowHighlightModal(true);
                    }}
                  >
                    Highlight Link
                  </Dropdown.Item>
                  {!hideEdits && !singleView && (
                    <Dropdown.Item onClick={showEditModalHandler}>
                      Edit
                    </Dropdown.Item>
                  )}
                  {!hideEdits && (
                    <Dropdown.Item onClick={() => setShowReminderModal(true)}>
                      Create Reminder
                    </Dropdown.Item>
                  )}
                  {!singleView && !hideEdits && (
                    <Dropdown.Item onClick={showDeleteModalHandler}>
                      Delete
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>
            <div className="col-sm-11 pl-md-1">
              <h6 className="card-subtitle mb-2 text-primary fw-bold">
                {note.sender_name}
              </h6>

              <NoteTextRenderer
                note={note}
                singleView={singleView}
                isExpanded={isExpanded}
                onExpand={expandNote}
                shouldLoadLinks={shouldLoadLinks}
                showToast={showToast}
                onDeleteFile={handleDeleteFile}
                workspaceSlug={selectedWorkspaceSlug}
              />
            </div>
          </div>
          <NoteCardBottomBar
            note={note}
            singleView={singleView}
          ></NoteCardBottomBar>
        </div>

        <Modal show={showMoveModal} onHide={() => setShowMoveModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Moving note</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedWorkspace && (
              <>
                <div className="mb-3">
                  <h6 className="text-primary mb-2">Workspace Categories</h6>
                  {renderCategoryButtons(
                    noteLists.filter(
                      (lst) =>
                        lst.id !== note.list &&
                        selectedWorkspace.categories.some(
                          (cat) => cat.id === lst.id,
                        ),
                    ),
                  )}
                </div>
                <hr className="my-3" />
              </>
            )}

            <div className="mb-3">
              <Button
                variant="link"
                className="p-0 mb-2 text-decoration-none"
                onClick={() => setShowOtherCategories(!showOtherCategories)}
                aria-controls="other-categories-collapse"
                aria-expanded={showOtherCategories}
              >
                <h6 className="text-muted mb-0">
                  Other Categories {showOtherCategories ? "▼" : "▶"}
                </h6>
              </Button>
              <Collapse in={showOtherCategories}>
                <div id="other-categories-collapse">
                  {renderCategoryButtons(
                    noteLists.filter(
                      (lst) =>
                        lst.id !== note.list &&
                        (!selectedWorkspace ||
                          !selectedWorkspace.categories.some(
                            (cat) => cat.id === lst.id,
                          )),
                    ),
                    "secondary",
                  )}
                </div>
              </Collapse>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowMoveModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Deleting note</Modal.Title>
          </Modal.Header>
          <Modal.Body>{textInsideDeleteModal}</Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onDeleteNote(note.id);
                setShowDeleteModal(false);
              }}
            >
              Delete
            </Button>
          </Modal.Footer>
        </Modal>

        <EditNoteModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          note={note}
          editText={editText}
          setEditText={setEditText}
          onSave={handleSave}
          onSaveAndClose={handleSaveAndClose}
          singleView={singleView}
          showToast={showToast}
          refreshNotes={refreshNotes}
          workspaceSlug={selectedWorkspace?.slug}
        />

        <ReminderModal
          show={showReminderModal}
          onHide={() => setShowReminderModal(false)}
          note={note}
          showToast={showToast}
        />

        <Modal
          show={showHighlightModal}
          onHide={() => setShowHighlightModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Copy Highlight Link</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-2">
              Select the text you want to highlight, then copy the link.
            </p>
            <SelectableTextContainer
              text={note.text}
              selectionRange={highlightSelection}
              onSelectionChange={setHighlightSelection}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowHighlightModal(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={copyHighlightLink}
              disabled={highlightSelection.end <= highlightSelection.start}
            >
              Copy Highlight Link
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  },
);

NoteCard.displayName = "NoteCard";

export default NoteCard;
