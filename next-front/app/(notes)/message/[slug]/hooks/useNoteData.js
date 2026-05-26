import { useState, useEffect, useContext } from "react";
import { fetchWithAuth } from "@/app/lib/api";
import { handleApiError } from "@/app/utils/errorHandler";
import { extractMarkdownTitle } from "@/app/utils/stringUtils";
import { ToastContext, WorkspaceContext } from "../../../layout";

export function useNoteData(slug, noteLists) {
  const [noteBusy, setNoteBusy] = useState(true);
  const [note, setNote] = useState(null);
  const [similarNotes, setSimilarNotes] = useState([]);
  const [similarNotesLoaded, setSimilarNotesLoaded] = useState(false);
  const [noteUpdateConflict, setNoteUpdateConflict] = useState(false);
  const [shouldShowRefreshPrompt, setShouldShowRefreshPrompt] = useState(false);
  const { selectedWorkspaceSlug } = useContext(WorkspaceContext);
  const showToast = useContext(ToastContext);

  const extractMarkdownTitleFromText = (text) => {
    const title = extractMarkdownTitle(text);
    return title === "related" ? "Note" : title + " - Note";
  };

  const getCurrentNote = async () => {
    try {
      const response = await fetchWithAuth(`/api/note/message/${slug}/`);
      if (!response.ok) {
        throw new Error("Failed to fetch note");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching note:", error);
      handleApiError(error);
    }
  };

  const fetchSimilarNotes = async (noteId) => {
    try {
      const workspaceParam = selectedWorkspaceSlug
        ? `?workspace=${encodeURIComponent(selectedWorkspaceSlug)}`
        : "";
      const response = await fetchWithAuth(
        `/api/note/message/${noteId}/similar/${workspaceParam}`,
        {},
        10000,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch similar notes");
      }
      const data = await response.json();

      setSimilarNotes(data);
      setTimeout(() => setSimilarNotesLoaded(true), 50);
    } catch (error) {
      console.error("Error fetching similar notes:", error);
      handleApiError(error);
    }
  };

  const editNote = async (targetNoteId, newText) => {
    window.dispatchEvent(
      new CustomEvent("showWaitingModal", { detail: "Editing note" }),
    );
    try {
      const response = await fetchWithAuth(
        `/api/note/message/${targetNoteId}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: newText, updated_at: note.updated_at }),
        },
      );
      if (response.status === 409) {
        setNoteUpdateConflict(true);
        showToast(
          "Edit Rejected",
          "This note was updated elsewhere. Please refresh.",
          7000,
          "danger",
        );
        return false;
      }
      if (!response.ok) {
        throw new Error("Failed to edit note");
      }
      const updatedNote = await response.json();
      setNote(updatedNote);
      showToast("Success", "Note Saved", 5000, "success");
      setNoteUpdateConflict(false);
      return true;
    } catch (err) {
      console.error(`Error editing note: ${err}`);
      handleApiError(err);
      return false;
    } finally {
      window.dispatchEvent(new CustomEvent("hideWaitingModal"));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentNote = await getCurrentNote();
        setNote(currentNote);
        setNoteBusy(false);

        if (currentNote?.text) {
          document.title = extractMarkdownTitleFromText(currentNote.text);
        }

        if (currentNote) {
          await fetchSimilarNotes(currentNote.id);
        } else {
          setSimilarNotesLoaded(true);
        }
      } catch (error) {
        console.error("Error fetching note:", error);
        document.title = "Note - Error";
        setNoteBusy(false);
        setSimilarNotesLoaded(false);
      }
    };

    loadData();
  }, [noteLists]);

  useEffect(() => {
    if (!note) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetchWithAuth(`/api/note/message/${slug}/`);
        if (!response.ok) return;
        const data = await response.json();
        if (
          data.updated_at &&
          note.updated_at &&
          data.updated_at !== note.updated_at
        ) {
          setShouldShowRefreshPrompt(true);
        }
      } catch { }
    }, 10000);
    return () => clearInterval(interval);
  }, [note, slug]);

  return {
    noteBusy,
    note,
    similarNotes,
    similarNotesLoaded,
    noteUpdateConflict,
    shouldShowRefreshPrompt,
    editNote,
  };
}
