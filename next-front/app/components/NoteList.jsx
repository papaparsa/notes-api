"use client";

import React, { useRef, useState, useEffect, useContext } from "react";
import { Spinner } from "react-bootstrap";
import NoteCard from "./notecard/NoteCard";
import { fetchWithAuth } from "../lib/api";
import { handleApiError } from "../utils/errorHandler";
import { ToastContext } from "../(notes)/layout";
import styles from "./NoteList.module.css";

export default function NoteList({
  notes,
  isBusy,
  hideEdits,
  showHidden,
  onUpdateNote,
  onDeleteNote,
  refreshNotes,
  newNoteId = null,
  highlightNoteId = null,
}) {
  const noteRefs = useRef({});
  const [animatingNotes, setAnimatingNotes] = useState(new Set());
  const [highlightedNote, setHighlightedNote] = useState(null);
  const showToast = useContext(ToastContext);

  useEffect(() => {
    if (newNoteId) {
      setAnimatingNotes((prev) => new Set([...prev, newNoteId]));

      // Remove entrance animation after it completes
      setTimeout(() => {
        setAnimatingNotes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(newNoteId);
          return newSet;
        });
      }, 1000);
    }
  }, [newNoteId]);

  // Handle highlight from important notes navigation
  useEffect(() => {
    if (highlightNoteId && !isBusy && notes.length > 0) {
      const noteId = parseInt(highlightNoteId);
      setHighlightedNote(noteId);

      // Scroll to the note after a short delay to ensure DOM is ready
      setTimeout(() => {
        const noteElement = noteRefs.current[noteId];
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      // Clear highlight after animation completes
      setTimeout(() => {
        setHighlightedNote(null);
      }, 2500);
    }
  }, [highlightNoteId, isBusy, notes]);


  const handleArchiveUpdate = async (note, archived) => {
    window.dispatchEvent(
      new CustomEvent("showWaitingModal", { detail: "Updating note" }),
    );
    try {
      const url = `/api/note/message/${archived ? "archive" : "unarchive"}/${note.id}/`;
      const response = await fetchWithAuth(url, { method: "POST" });
      if (!response.ok) throw new Error("Failed to update archive status");

      onUpdateNote(note.id, { archived });
      refreshNotes();
    } catch (err) {
      console.error("Error updating archive status:", err);
      handleApiError(err);
    } finally {
      window.dispatchEvent(new CustomEvent("hideWaitingModal"));
    }
  };

  const handleDelete = async (noteId) => {
    window.dispatchEvent(
      new CustomEvent("showWaitingModal", { detail: "Deleting note" }),
    );

    try {
      const response = await fetchWithAuth(`/api/note/message/${noteId}/`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete note");

      const data = await response.json();
      onDeleteNote(noteId);

      // Create toast message including deleted files info
      let toastBody = "Note Deleted";
      if (data.deleted_files && data.deleted_files.length > 0) {
        const fileNames = data.deleted_files.map((path) =>
          path.split("/").pop(),
        );
        toastBody += `\nRemoved ${fileNames.length} unused ${fileNames.length === 1 ? "file" : "files"}: ${fileNames.join(", ")}`;
      }

      showToast("Success", toastBody, 5000, "success");
    } catch (err) {
      console.error("Error deleting note:", err);
      handleApiError(err);
    } finally {
      window.dispatchEvent(new CustomEvent("hideWaitingModal"));
    }
  };

  const handleEdit = async (noteId, newText, updatedAt) => {
    window.dispatchEvent(
      new CustomEvent("showWaitingModal", { detail: "Editing note" }),
    );
    try {
      const response = await fetchWithAuth(`/api/note/message/${noteId}/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: newText, updated_at: updatedAt }),
      });

      if (!response.ok) throw new Error("Failed to edit note");

      const updatedNote = await response.json();
      onUpdateNote(noteId, updatedNote);

      showToast("Success", "Note Saved", 5000, "success");

      return true;
    } catch (err) {
      console.error("Error editing note:", err);
      handleApiError(err);
      return false;
    } finally {
      window.dispatchEvent(new CustomEvent("hideWaitingModal"));
    }
  };

  // Sort notes but keep new note at top during entrance animation
  const displayNotes = React.useMemo(() => {
    if (animatingNotes.size === 0) {
      return notes; // Normal sorted order
    }

    const newNote = notes.find((note) => animatingNotes.has(note.id));
    const otherNotes = notes.filter((note) => !animatingNotes.has(note.id));

    return newNote ? [newNote, ...otherNotes] : notes;
  }, [notes, animatingNotes]);

  return (
    <div>
      <div className="mt-1 d-flex row justify-content-center">
        {!isBusy ? (
          <div className="col-xl-12 d-flex flex-vertical flex-column">
            {displayNotes.map((note) => (
              <div
                key={note.id}
                id="notesListt"
                ref={(el) => (noteRefs.current[note.id] = el)}
                className={`${animatingNotes.has(note.id) ? styles.newNoteAnimation : ""} ${highlightedNote === note.id ? styles.highlightAnimation : ""}`}
                style={{
                  animation: animatingNotes.has(note.id)
                    ? `${styles.slideInFromTop} 1s cubic-bezier(0.4, 0, 0.2, 1), ${styles.highlightNew} 1.5s ease-out`
                    : highlightedNote === note.id
                      ? "highlightPulse 2s ease-out"
                      : "none",
                  zIndex: highlightedNote === note.id ? 10 : "auto",
                }}
              >
                {(showHidden || !note.archived) && (
                  <NoteCard
                    note={note}
                    singleView={false}
                    hideEdits={hideEdits}
                    onArchived={() => handleArchiveUpdate(note, true)}
                    onUnarchived={() => handleArchiveUpdate(note, false)}
                    onDeleteNote={handleDelete}
                    onEditNote={(noteId, newText) =>
                      handleEdit(noteId, newText, note.updated_at)
                    }
                    refreshNotes={refreshNotes}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <Spinner
              className="mt-5"
              style={{ width: "3rem", height: "3rem" }}
              animation="border"
              variant="primary"
            />
          </div>
        )}
      </div>
    </div>
  );
}
