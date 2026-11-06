import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/UIContext';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { absoluteUrl, fetchJSON, uploadFile } from '../../../lib/api';
import { openFileUrl } from '../../../lib/download';
import { handleApiError } from '../../../lib/errorHandler';
import { fileFromDomFile, pickDocuments, pickImages } from '../../../lib/pickFiles';
import { fileIcon, formatFileSize, isImageFile } from '../../../lib/stringUtils';
import ScrollPage from '../../../components/ScrollPage';
import FileUploadComponent from '../../../components/FileUploadComponent';
import { AppModal, Button, ConfirmModal, Field, H, Input, Spinner, T } from '../../../components/ui';

export default function CollectionPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const showToast = useToast();
  const { sm, md, lg } = useBreakpoint();
  const [collection, setCollection] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);
  const dropRef = useRef(null);

  const load = async () => {
    try {
      const [c, f] = await Promise.all([fetchJSON(`/api/note/collections/${id}/`), fetchJSON(`/api/note/collections/${id}/files/`)]);
      setCollection(c);
      setFiles(f || []);
    } catch (err) {
      handleApiError(err);
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const addFileToCollection = async (fileId) => {
    await fetchJSON(`/api/note/collections/${id}/files/`, { method: 'POST', body: { file_id: fileId } });
  };

  const uploadMany = async (list) => {
    if (!list.length) return;
    setUploading(true);
    let ok = 0;
    for (const file of list) {
      try {
        const data = await uploadFile(file, { compress: false });
        await addFileToCollection(data.file_id ?? data.file?.id);
        ok += 1;
      } catch (err) {
        handleApiError(err);
      }
    }
    setUploading(false);
    if (ok) showToast('Success', `Uploaded ${ok} file(s)`, 3000, 'success');
    load();
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = dropRef.current;
    if (!node?.addEventListener) return;
    const over = (e) => {
      e.preventDefault();
      setDragging(true);
    };
    const leave = (e) => {
      if (!node.contains(e.relatedTarget)) setDragging(false);
    };
    const drop = (e) => {
      e.preventDefault();
      setDragging(false);
      uploadMany(Array.from(e.dataTransfer?.files || []).map(fileFromDomFile));
    };
    node.addEventListener('dragover', over);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    return () => {
      node.removeEventListener('dragover', over);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    };
  }, [dropRef.current, loading]);

  const removeFile = async () => {
    const file = removeTarget;
    setRemoveTarget(null);
    try {
      await fetchJSON(`/api/note/collections/${id}/files/`, { method: 'DELETE', body: { file_id: file.id } });
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      showToast('Success', 'File removed from collection', 3000, 'success');
    } catch (err) {
      handleApiError(err);
    }
  };

  const saveInfo = async () => {
    try {
      const data = await fetchJSON(`/api/note/collections/${id}/`, { method: 'PUT', body: { name: editName, description: editDescription } });
      setCollection((c) => ({ ...c, name: editName, description: editDescription, ...(data && typeof data === 'object' ? data : {}) }));
      setShowEdit(false);
      showToast('Success', 'Collection updated', 3000, 'success');
    } catch (err) {
      handleApiError(err);
    }
  };

  if (loading) return <Spinner style={{ marginTop: 48 }} />;
  if (!collection) return null;

  const colWidth = lg ? '25%' : md ? '33.333%' : sm ? '50%' : '100%';

  return (
    <ScrollPage onRefresh={load} contentContainerStyle={{ padding: 12, paddingTop: 24, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
      <View style={{ flexDirection: md ? 'row' : 'column', justifyContent: 'space-between', alignItems: md ? 'flex-start' : 'stretch', marginBottom: 24, gap: 12 }}>
        <View style={{ flex: 1 }}>
          <H level={2}>{collection.name}</H>
          {collection.description ? <T muted>{collection.description}</T> : null}
          <T small muted style={{ marginTop: 4 }}>
            Category: {collection.list_name} | {files.length} file{files.length !== 1 ? 's' : ''}
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            variant="outline-secondary"
            title="Edit Info"
            onPress={() => {
              setEditName(collection.name);
              setEditDescription(collection.description || '');
              setShowEdit(true);
            }}
          />
          <Button title="+ Add Files" onPress={() => setShowAdd(true)} loading={uploading} />
        </View>
      </View>

      <View ref={dropRef} collapsable={false} style={{ minHeight: 400, position: 'relative' }}>
        {dragging ? (
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,123,255,0.1)', borderWidth: 3, borderStyle: 'dashed', borderColor: '#007bff', borderRadius: 10, zIndex: 10, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#007bff', fontSize: 20 }}>Drop files here to upload</Text>
          </View>
        ) : null}
        {!files.length ? (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <T muted style={{ marginBottom: 12 }}>No files in this collection yet.</T>
            <Button title="Add Files" onPress={() => setShowAdd(true)} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            {files.map((f) => (
              <View key={f.id} style={{ width: colWidth, padding: 8 }}>
                <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.bodyBg }}>
                  <Pressable onPress={() => openFileUrl(f.url)}>
                    {isImageFile(f.name, f.content_type) ? (
                      <Image source={{ uri: absoluteUrl(f.url) }} style={{ width: '100%', height: 200 }} resizeMode="cover" accessibilityLabel={f.name} />
                    ) : (
                      <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondaryBg }}>
                        <Text style={{ fontSize: 64 }}>{fileIcon(f.name, f.content_type)}</Text>
                      </View>
                    )}
                  </Pressable>
                  <View style={{ padding: 12 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14.4, color: colors.text }}>{f.name}</Text>
                    <T small muted>{formatFileSize(f.size)}</T>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <Button size="sm" variant="outline-primary" title="View" onPress={() => openFileUrl(f.url)} />
                      <Button size="sm" variant="outline-danger" title="Remove" onPress={() => setRemoveTarget(f)} />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <AppModal visible={showAdd} onClose={() => setShowAdd(false)} title="Add Files" footer={<Button variant="secondary" title="Close" onPress={() => setShowAdd(false)} />}>
        <T style={{ marginBottom: 12 }}>Upload a file to add it to this collection.</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <FileUploadComponent
            size="md"
            onSuccess={async (data) => {
              try {
                await addFileToCollection(data.file_id ?? data.file?.id);
                setShowAdd(false);
                showToast('Success', 'File added to collection', 3000, 'success');
                load();
              } catch (err) {
                handleApiError(err);
              }
            }}
          />
          <Button
            variant="outline-primary"
            title="Select multiple files"
            onPress={async () => {
              const list = await pickDocuments({ multiple: true });
              setShowAdd(false);
              uploadMany(list);
            }}
          />
          {Platform.OS !== 'web' ? (
            <Button
              variant="outline-primary"
              title="Photo Library"
              onPress={async () => {
                const list = await pickImages({ multiple: true });
                setShowAdd(false);
                uploadMany(list);
              }}
            />
          ) : null}
        </View>
      </AppModal>

      <AppModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Collection"
        footer={
          <>
            <Button variant="secondary" title="Cancel" onPress={() => setShowEdit(false)} />
            <Button title="Save" onPress={saveInfo} />
          </>
        }
      >
        <Field label="Name">
          <Input value={editName} onChangeText={setEditName} />
        </Field>
        <Field label="Description">
          <Input value={editDescription} onChangeText={setEditDescription} multiline rows={3} />
        </Field>
      </AppModal>

      <ConfirmModal visible={!!removeTarget} title="Remove File" body={`Remove "${removeTarget?.name}" from this collection? The file itself will not be deleted.`} confirmLabel="Remove" onCancel={() => setRemoveTarget(null)} onConfirm={removeFile} />
    </ScrollPage>
  );
}
