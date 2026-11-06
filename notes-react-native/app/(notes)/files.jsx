import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/UIContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { absoluteUrl, fetchJSON } from '../../lib/api';
import { openFileUrl } from '../../lib/download';
import { handleApiError } from '../../lib/errorHandler';
import { fileIcon, formatFileSize, isImageFile } from '../../lib/stringUtils';
import ScrollPage from '../../components/ScrollPage';
import { Alert, AppModal, Badge, Button, ConfirmModal, H, Input, Select, Spinner, Switch, T } from '../../components/ui';

const SORTS = [
  { value: 'date', label: 'Date (newest first)' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
];

const KINDS = [
  { value: 'all', label: 'All Kinds' },
  { value: 'upload', label: 'Uploads' },
  { value: 'drawing', label: 'Drawings' },
];

export default function FilesPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const showToast = useToast();
  const { md, lg } = useBreakpoint();
  const [files, setFiles] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const [kind, setKind] = useState('all');
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showAddTo, setShowAddTo] = useState(false);
  const [collectionId, setCollectionId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [f, c] = await Promise.all([fetchJSON('/api/note/all-files/', {}, 15000), fetchJSON('/api/note/collections/')]);
      setFiles(f || []);
      setCollections(c || []);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = files.filter((f) => !q || (f.name || '').toLowerCase().includes(q) || (f.original_name || '').toLowerCase().includes(q));
    if (kind !== 'all') list = list.filter((f) => f.kind === kind);
    if (unusedOnly) list = list.filter((f) => f.can_delete);
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => (a.original_name || a.name).localeCompare(b.original_name || b.name));
    else if (sort === 'type') sorted.sort((a, b) => (a.content_type || '').localeCompare(b.content_type || ''));
    else sorted.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    return sorted;
  }, [files, query, sort, kind, unusedOnly]);

  const unusedDrawings = files.filter((f) => f.kind === 'drawing' && f.can_delete).length;

  const deleteFile = async (file) => {
    setConfirm(null);
    try {
      await fetchJSON(`/api/note/files/${file.id}/`, { method: 'DELETE' });
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setSelected(null);
      showToast('Success', 'File deleted', 3000, 'success');
    } catch (err) {
      showToast('Error', err.data?.error || err.message, 4000, 'danger');
    }
  };

  const deleteUnusedDrawings = async () => {
    setConfirm(null);
    try {
      const data = await fetchJSON('/api/note/drawings/unused/', { method: 'DELETE' });
      showToast('Success', `Deleted ${data?.deleted_count ?? 0} unused drawing(s)`, 3000, 'success');
      load();
    } catch (err) {
      handleApiError(err);
    }
  };

  const addToCollection = async () => {
    if (!collectionId) return showToast('Error', 'Please select a collection', 3000, 'danger');
    try {
      await fetchJSON(`/api/note/collections/${collectionId}/files/`, { method: 'POST', body: { file_id: selected.id } });
      showToast('Success', 'File added to collection', 3000, 'success');
      setShowAddTo(false);
      load();
    } catch (err) {
      showToast('Error', err.data?.error || err.message, 4000, 'danger');
    }
  };

  const colWidth = lg ? '33.333%' : md ? '50%' : '100%';

  return (
    <ScrollPage onRefresh={load} contentContainerStyle={{ padding: 12, paddingTop: 24, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
      <H level={2}>All Files</H>
      <T muted style={{ marginBottom: 16 }}>Browse all files uploaded to your notes and collections</T>
      <View style={{ flexDirection: md ? 'row' : 'column', gap: 12, marginBottom: 12, alignItems: md ? 'center' : 'stretch' }}>
        <View style={{ flex: 1 }}>
          <Input value={query} onChangeText={setQuery} placeholder="Search files..." />
        </View>
        <View style={{ flex: 1 }}>
          <Select value={sort} options={SORTS} onChange={setSort} />
        </View>
        <View style={{ flex: 1, alignItems: md ? 'flex-end' : 'flex-start' }}>
          <Badge bg="secondary">{`${visible.length} files`}</Badge>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <Select value={kind} options={KINDS} onChange={setKind} style={{ minWidth: 160 }} />
        <Switch value={unusedOnly} onChange={setUnusedOnly} label="Unused only" />
        {kind === 'drawing' ? <Button variant="outline-danger" size="sm" title={`Delete Unused Drawings (${unusedDrawings})`} disabled={!unusedDrawings} onPress={() => setConfirm({ type: 'drawings' })} /> : null}
      </View>
      {loading ? (
        <Spinner style={{ marginTop: 24 }} />
      ) : !visible.length ? (
        <Alert variant="info">{files.length ? 'No files found matching your search' : 'No files uploaded yet'}</Alert>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
          {visible.map((f) => (
            <View key={f.id} style={{ width: colWidth, padding: 8 }}>
              <Pressable onPress={() => setSelected(f)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 16, backgroundColor: colors.bodyBg, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 32 }}>{fileIcon(f.name, f.content_type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>{f.original_name || f.name}</Text>
                  <T small muted>{formatFileSize(f.size)}</T>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                    <Badge bg="info" pill>{`${f.note_count} notes`}</Badge>
                    <Badge bg="success" pill>{`${f.collection_count} collections`}</Badge>
                  </View>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <AppModal
        visible={!!selected && !showAddTo}
        onClose={() => setSelected(null)}
        title="File Details"
        size="lg"
        footer={
          selected ? (
            <>
              <Button variant="primary" title="Open File" onPress={() => openFileUrl(selected.url)} />
              <Button variant="success" title="Add to Collection" onPress={() => setShowAddTo(true)} />
              {selected.can_delete ? <Button variant="danger" title="Delete" onPress={() => setConfirm({ type: 'file', file: selected })} /> : null}
              <Button variant="secondary" title="Close" onPress={() => setSelected(null)} />
            </>
          ) : null
        }
      >
        {selected ? (
          <View>
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{selected.name}</Text>
            {selected.original_name ? <T muted small>Original: {selected.original_name}</T> : null}
            <T muted small style={{ marginBottom: 12 }}>
              {formatFileSize(selected.size)} | {selected.content_type}
            </T>
            {isImageFile(selected.name, selected.content_type) ? <Image source={{ uri: absoluteUrl(selected.url) }} style={{ width: '100%', height: 300, marginBottom: 12 }} resizeMode="contain" /> : null}
            {selected.notes?.length ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 4 }}>Referenced in Notes</Text>
                {selected.notes.map((n) => (
                  <Pressable
                    key={n.id}
                    onPress={() => {
                      setSelected(null);
                      router.push(`/message/${n.id}`);
                    }}
                    style={{ paddingVertical: 6, flexDirection: 'row', gap: 8, alignItems: 'center' }}
                  >
                    <Text numberOfLines={1} style={{ color: colors.primary, flex: 1 }}>{(n.text || '').slice(0, 80) || `Note #${n.id}`}</Text>
                    {n.category ? <Badge bg="secondary">{typeof n.category === 'string' ? n.category : n.category.name}</Badge> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
            {selected.collections?.length ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontWeight: '600', color: colors.text, marginBottom: 4 }}>In Collections</Text>
                {selected.collections.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      setSelected(null);
                      router.push(`/collection/${c.id}`);
                    }}
                    style={{ paddingVertical: 6, flexDirection: 'row', gap: 8, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.primary, flex: 1 }}>{c.name}</Text>
                    {c.category ? <Badge bg="secondary">{typeof c.category === 'string' ? c.category : c.category.name}</Badge> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
            {!selected.notes?.length && !selected.collections?.length ? <T muted>This file is not referenced in any notes or collections</T> : null}
          </View>
        ) : null}
      </AppModal>

      <AppModal
        visible={showAddTo}
        onClose={() => setShowAddTo(false)}
        title="Add to Collection"
        footer={
          <>
            <Button variant="secondary" title="Cancel" onPress={() => setShowAddTo(false)} />
            <Button title="Add" onPress={addToCollection} />
          </>
        }
      >
        <Select value={collectionId} onChange={setCollectionId} placeholder="Select a collection" options={collections.map((c) => ({ value: c.id, label: `${c.name} (${c.list_name})` }))} />
      </AppModal>

      <ConfirmModal visible={confirm?.type === 'file'} title="Delete File" body={`Delete "${confirm?.file?.name}" permanently?`} onCancel={() => setConfirm(null)} onConfirm={() => deleteFile(confirm.file)} />
      <ConfirmModal visible={confirm?.type === 'drawings'} title="Delete Unused Drawings" body={`Delete ${unusedDrawings} unused drawing file(s)?`} onCancel={() => setConfirm(null)} onConfirm={deleteUnusedDrawings} />
    </ScrollPage>
  );
}
