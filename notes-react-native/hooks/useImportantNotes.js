import { useCallback, useEffect, useState } from 'react';
import { buildQuery, fetchJSON } from '../lib/api';
import { on } from '../lib/events';
import { KEYS, getItem, setItem } from '../lib/storage';

export default function useImportantNotes({ categorySlug, workspaceSlug, showHidden }) {
  const [notes, setNotes] = useState([]);
  const [mode, setModeState] = useState('sidebar');

  useEffect(() => {
    getItem(KEYS.importantMode).then((v) => v && setModeState(v));
  }, []);

  const setMode = (m) => {
    setModeState(m);
    setItem(KEYS.importantMode, m);
  };

  const refresh = useCallback(async () => {
    try {
      const data = await fetchJSON(`/api/note/important/${encodeURIComponent(categorySlug || 'All')}/${buildQuery({ workspace: workspaceSlug, show_hidden: showHidden ? 'true' : 'false' })}`);
      setNotes(Array.isArray(data) ? data : []);
    } catch {
      setNotes([]);
    }
  }, [categorySlug, workspaceSlug, showHidden]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => on('refreshImportantNotes', refresh), [refresh]);

  return { notes, setNotes, mode, setMode, refresh };
}
