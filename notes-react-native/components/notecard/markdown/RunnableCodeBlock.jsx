import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/UIContext';
import { fetchJSON } from '../../../lib/api';
import { copyText } from '../../../lib/clipboard';
import { downloadCsv } from '../../../lib/download';
import { emit, on } from '../../../lib/events';
import { modelToCsv, rowsToCsv } from '../../../lib/markdownTable';
import { fetchFilePayload, runPython } from '../../../lib/pythonRuntime';
import { safeUrlEncode } from '../../../lib/stringUtils';
import { fonts } from '../../../styles/theme';
import { Badge, Button } from '../../ui';

const DATA_FILE_EXTENSIONS = /\.(csv|tsv|txt|json|xlsx)$/i;
const FILE_LINK = /(?<!!)\[([^\]]*)\]\(([^)\s]*\/api\/note\/files\/[^)\s]*)\)/g;
const fileCache = new Map();
const attachedCache = new Map();

const fileKey = (href) => {
  const path = href.slice(href.indexOf('/api/note/files/'));
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

const findDataFiles = (noteText, attached = []) => {
  const linked = Array.from((noteText || '').matchAll(FILE_LINK)).map(([, label, href]) => {
    const fallback = decodeURIComponent(href.split('/').pop() || '');
    return { label: label.trim() || fallback, href };
  });
  const linkedKeys = new Set(linked.map(({ href }) => fileKey(href)));
  const used = new Set();
  return [...linked, ...attached.filter(({ href }) => !linkedKeys.has(fileKey(href)))]
    .filter(({ href }) => DATA_FILE_EXTENSIONS.test(fileKey(href)))
    .map(({ label, href }) => {
      const extension = fileKey(href).match(DATA_FILE_EXTENSIONS)[0];
      const named = DATA_FILE_EXTENSIONS.test(label) ? label : label + extension;
      const base = named.replace(/[/\\]/g, '_');
      let name = base;
      for (let i = 2; used.has(name); i++) name = base.replace(/(\.[^.]+)$/, `_${i}$1`);
      used.add(name);
      return { name, href };
    });
};

const fetchAttachedFiles = (noteId, refresh = false) => {
  if (!noteId) return Promise.resolve([]);
  if (refresh || !attachedCache.has(noteId)) {
    attachedCache.set(
      noteId,
      fetchJSON(`/api/note/message/${noteId}/files/`)
        .then((files) => files.map((file) => ({ label: file.original_name || file.name, href: file.url })))
        .catch(() => []),
    );
  }
  return attachedCache.get(noteId);
};

const listDataFiles = async (noteText, noteId, refresh = false) => findDataFiles(noteText, await fetchAttachedFiles(noteId, refresh));

const loaderSnippet = (name) => {
  const path = `files[${JSON.stringify(name)}]`;
  const extension = name.split('.').pop().toLowerCase();
  if (extension === 'tsv') return `pd.read_csv(${path}, sep="\\t")`;
  if (extension === 'xlsx') return `pd.read_excel(${path})`;
  if (extension === 'json') return `pd.read_json(${path})`;
  if (extension === 'txt') return `open(${path}).read()`;
  return `pd.read_csv(${path})`;
};

const fetchFile = (href) => {
  const url = safeUrlEncode(href);
  if (!fileCache.has(url)) {
    const request = fetchFilePayload(url);
    request.catch(() => fileCache.delete(url));
    fileCache.set(url, request);
  }
  return fileCache.get(url);
};

const loadDataFiles = (files) => Promise.all(files.map(async ({ name, href }) => ({ name, ...(await fetchFile(href)) })));

const STATUS_LABEL = { files: 'Fetching attached files…', loading: 'Loading Python…', running: 'Running…' };

function ResultTable({ value }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-start', marginBottom: 8 }}>
      <View style={{ flexShrink: 1 }}>
        <ScrollView horizontal>
          <View style={{ borderWidth: 1, borderColor: colors.border }}>
            {[value.columns, ...value.rows].map((row, r) => (
              <View key={r} style={{ flexDirection: 'row', backgroundColor: r === 0 ? colors.tertiaryBg : 'transparent' }}>
                {row.map((cell, c) => (
                  <Text key={c} style={{ width: 110, padding: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border, color: colors.text, fontWeight: r === 0 ? '700' : '400', fontSize: 13 }}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
        {value.total > value.rows.length ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Showing {value.rows.length} of {value.total} rows</Text> : null}
      </View>
      <Button size="sm" variant="outline-secondary" title="⤓" accessibilityLabel="Download as CSV" style={{ paddingVertical: 0 }} onPress={() => downloadCsv(rowsToCsv([value.columns, ...value.rows]), 'result.csv')} />
    </View>
  );
}

export default function RunnableCodeBlock({ code, language, node, ctx }) {
  const { colors } = useTheme();
  const showToast = useToast();
  const noteText = ctx.noteText;
  const noteId = ctx.note?.id;
  const runKey = noteId ?? 'draft';
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [dataFiles, setDataFiles] = useState(() => findDataFiles(noteText));
  const usePandas = language === 'pandas';

  useEffect(() => {
    let active = true;
    listDataFiles(noteText, noteId).then((files) => active && setDataFiles(files));
    return () => {
      active = false;
    };
  }, [noteText, noteId]);

  const run = async () => {
    if (status) return;
    setStatus('files');
    try {
      const listed = await listDataFiles(noteText, noteId, true);
      setDataFiles(listed);
      const files = await loadDataFiles(listed);
      setStatus('loading');
      const output = await runPython(code, {
        usePandas,
        files,
        tables: usePandas ? (ctx.tables || []).map((t) => modelToCsv(t.model)) : [],
        dfIndex: usePandas && node.dfIndex >= 0 ? node.dfIndex : null,
        onStatus: setStatus,
      });
      setResult(output);
    } catch (error) {
      setResult({ error: String(error?.message || error), stdout: '' });
    } finally {
      setStatus(null);
    }
  };

  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => on('runNoteSnippets', (key) => key === runKey && runRef.current()), [runKey]);

  const copy = async (text, label) => {
    await copyText(text);
    showToast('Copied', label, 2000, 'success');
  };

  const value = result?.value;
  const small = { fontSize: 13, fontFamily: fonts.mono };

  return (
    <View style={{ marginBottom: 16, direction: 'ltr' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <Badge bg="secondary">{language}</Badge>
        <Button size="sm" variant="outline-success" title="▶ Run" onPress={run} disabled={!!status} style={{ paddingVertical: 0 }} />
        {node.snippetCount > 1 ? <Button size="sm" variant="outline-success" title="▶▶ Run all" onPress={() => emit('runNoteSnippets', runKey)} disabled={!!status} style={{ paddingVertical: 0 }} /> : null}
        <Button size="sm" variant="outline-primary" title="Copy" onPress={() => copy(code, 'Code copied to clipboard')} style={{ paddingVertical: 0 }} />
        {result && !status ? <Button size="sm" variant="outline-secondary" title="Clear" onPress={() => setResult(null)} style={{ paddingVertical: 0 }} /> : null}
        {status ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <ActivityIndicator size="small" />
            <Text style={{ color: colors.muted, fontSize: 13 }}>{STATUS_LABEL[status]}</Text>
          </View>
        ) : null}
      </View>
      {dataFiles.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Files:</Text>
          {dataFiles.map(({ name }) => (
            <Button key={name} size="sm" variant="outline-secondary" onPress={() => copy(loaderSnippet(name), `Copied ${loaderSnippet(name)}`)} style={{ borderRadius: 16, paddingVertical: 0, paddingHorizontal: 6 }} textStyle={{ fontSize: 12 }} title={`📎 ${name}`} />
          ))}
        </View>
      ) : null}
      <ScrollView horizontal style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.bodyBg }} contentContainerStyle={{ padding: 16 }}>
        <Text selectable style={{ fontFamily: fonts.mono, fontSize: 14, lineHeight: 22, color: colors.text }}>{code}</Text>
      </ScrollView>
      {result ? (
        <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: colors.border, padding: 8, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
          {result.stdout ? <Text selectable style={[small, { color: colors.muted, marginBottom: 8 }]}>{result.stdout}</Text> : null}
          {result.error ? <Text selectable style={[small, { color: colors.danger }]}>{result.error}</Text> : null}
          {value?.type === 'table' ? <ResultTable value={value} /> : null}
          {value?.type === 'text' ? <Text selectable style={[small, { color: colors.text }]}>{value.text}</Text> : null}
          {result.figures?.map((png, i) => (
            <Image key={i} source={{ uri: `data:image/png;base64,${png}` }} style={{ width: '100%', aspectRatio: 4 / 3, marginVertical: 8 }} resizeMode="contain" accessibilityLabel={`Figure ${i + 1}`} />
          ))}
          {!result.error && !result.stdout && value?.type === 'none' && !result.figures?.length ? <Text style={{ color: colors.muted, fontSize: 13 }}>No output</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
