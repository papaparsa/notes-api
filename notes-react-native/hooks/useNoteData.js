import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { buildQuery, fetchJSON } from '../lib/api';
import { handleApiError } from '../lib/errorHandler';
import { useToast, useWaiting } from '../contexts/UIContext';

export default function useNoteData(id, workspaceSlug) {
  const showToast = useToast();
  const waiting = useWaiting();
  const [note, setNote] = useState(null);
  const [isBusy, setIsBusy] = useState(true);
  const [similarNotes, setSimilarNotes] = useState([]);
  const [similarLoaded, setSimilarLoaded] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const noteRef = useRef(null);
  noteRef.current = note;

  const load = useCallback(async () => {
    setIsBusy(true);
    try {
      const data = await fetchJSON(`/api/note/message/${id}/`);
      setNote(data);
      setIsStale(false);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsBusy(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!note?.id) return;
    setSimilarLoaded(false);
    fetchJSON(`/api/note/message/${note.id}/similar/${buildQuery({ workspace: workspaceSlug })}`, {}, 10000)
      .then((data) => {
        setSimilarNotes(Array.isArray(data) ? data : []);
        setTimeout(() => setSimilarLoaded(true), 50);
      })
      .catch(() => setSimilarNotes([]));
  }, [note?.id, workspaceSlug]);

  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(async () => {
        const current = noteRef.current;
        if (!current) return;
        try {
          const data = await fetchJSON(`/api/note/message/${id}/`);
          if (data.updated_at !== current.updated_at) setIsStale(true);
        } catch {}
      }, 10000);
      return () => clearInterval(timer);
    }, [id]),
  );

  const editNote = async (noteId, text) => {
    waiting.show('Editing note');
    try {
      const updated = await fetchJSON(`/api/note/message/${noteId}/`, { method: 'PUT', body: { text, updated_at: noteRef.current.updated_at } });
      setNote(updated);
      showToast('Success', 'Note Saved', 5000, 'success');
      return true;
    } catch (err) {
      if (err.status === 409) showToast('Edit Rejected', 'This note was updated elsewhere. Please refresh.', 7000, 'danger');
      else handleApiError(err);
      return false;
    } finally {
      waiting.hide();
    }
  };

  return { note, setNote, isBusy, similarNotes, similarLoaded, isStale, reload: load, editNote };
}
