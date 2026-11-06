import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { fetchJSON } from '../../lib/api';
import NoteList from '../NoteList';
import { Button, H, ProgressBar, T } from '../ui';
import { useTheme } from '../../contexts/ThemeContext';

export default function SemanticSearchResults({ query, hasFiles, listSlug, showHidden }) {
  const { colors } = useTheme();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    setShow(false);
    setResults([]);
    if (!query || query.trim().length < 3) return;
    const id = ++reqId.current;
    setLoading(true);
    setElapsed(0);
    setProgress(0);
    const started = Date.now();
    const timer = setInterval(() => {
      const s = (Date.now() - started) / 1000;
      setElapsed(Math.floor(s));
      setProgress(Math.min(90, (s / 30) * 90));
    }, 250);
    fetchJSON('/api/note/similar/', { method: 'POST', body: { text: query, limit: 20, has_files: hasFiles, ...(listSlug ? { list_slug: listSlug } : {}) } }, 60000)
      .then((data) => {
        if (id !== reqId.current) return;
        setResults((data || []).map((r) => ({ ...r, list: r.category?.id, archived: false, importance: 0 })));
        setProgress(100);
      })
      .catch(() => {})
      .finally(() => {
        clearInterval(timer);
        if (id === reqId.current) setLoading(false);
      });
    return () => clearInterval(timer);
  }, [query, hasFiles, listSlug]);

  if (loading) {
    return (
      <View style={{ marginTop: 24 }}>
        <T muted small style={{ marginBottom: 4 }}>Finding similar notes... {elapsed}s</T>
        <ProgressBar value={progress} />
      </View>
    );
  }
  if (!results.length) return null;
  if (!show) return <Button block variant="outline-primary" title={`Show Similar Notes (${results.length})`} onPress={() => setShow(true)} style={{ marginTop: 24 }} />;
  return (
    <View style={{ marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
      <H level={4}>Similar Notes</H>
      <NoteList notes={results} showHidden={showHidden} onUpdateNote={(id, patch) => setResults((p) => p.map((n) => (n.id === id ? { ...n, ...patch } : n)))} onDeleteNote={(id) => setResults((p) => p.filter((n) => n.id !== id))} />
    </View>
  );
}
