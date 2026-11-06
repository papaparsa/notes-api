import { useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/UIContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { API_URL } from '../config';
import { absoluteUrl, fetchJSON } from '../lib/api';
import { copyText } from '../lib/clipboard';
import { handleApiError } from '../lib/errorHandler';
import { shadow } from '../styles/theme';
import NoteCardBottomBar from './notecard/NoteCardBottomBar';
import MoveModal from './notecard/MoveModal';
import { ConfirmModal, Dropdown, MenuDivider, MenuItem } from './ui';

export default function CollectionCard({ collection, onUpdate, onDelete }) {
  const { colors } = useTheme();
  const { sm } = useBreakpoint();
  const router = useRouter();
  const showToast = useToast();
  const [modal, setModal] = useState(null);

  const update = async (patch, message) => {
    try {
      const data = await fetchJSON(`/api/note/collections/${collection.id}/`, { method: 'PUT', body: patch });
      onUpdate?.({ ...collection, ...patch, ...(data && typeof data === 'object' ? data : {}) });
      showToast('Success', message, 3000, 'success');
    } catch (err) {
      handleApiError(err);
    }
  };

  const remove = async () => {
    setModal(null);
    try {
      await fetchJSON(`/api/note/collections/${collection.id}/`, { method: 'DELETE' });
      onDelete?.(collection.id);
      showToast('Success', 'Collection deleted', 3000, 'success');
    } catch (err) {
      handleApiError(err);
    }
  };

  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : API_URL;
  const thumbs = collection.thumbnail_files || [];

  return (
    <Pressable onPress={() => router.push(`/collection/${collection.id}`)} style={[{ marginBottom: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.bodyBg, padding: 16 }, shadow(1)]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '500', color: colors.text, marginBottom: 4 }}>📁 {collection.name}</Text>
          {collection.description ? <Text style={{ color: colors.muted, fontSize: 14 }}>{collection.description}</Text> : null}
        </View>
        <Dropdown
          align="right"
          width={180}
          trigger={(open) => (
            <Pressable onPress={open} hitSlop={10} accessibilityLabel="Collection actions" style={{ padding: 4 }}>
              <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
            </Pressable>
          )}
        >
          <MenuItem label="Move" onPress={() => setModal('move')} />
          <MenuItem
            label="Copy Link"
            onPress={async () => {
              await copyText(`${origin}/collection/${collection.id}`);
              showToast('Success', 'Collection link copied to clipboard', 3000, 'success');
            }}
          />
          <MenuItem label={collection.archived ? 'Unarchive' : 'Archive'} onPress={() => update({ archived: !collection.archived }, collection.archived ? 'Collection unarchived' : 'Collection archived')} />
          <MenuDivider />
          <MenuItem label="Delete" danger onPress={() => setModal('delete')} />
        </Dropdown>
      </View>
      {thumbs.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 }}>
          {thumbs.map((file) => (
            <View key={file.id} style={{ width: sm ? '25%' : '50%', padding: 4 }}>
              {file.content_type?.startsWith('image/') ? (
                <Image source={{ uri: absoluteUrl(file.url) }} style={{ width: '100%', height: 100, borderRadius: 6 }} resizeMode="cover" accessibilityLabel={file.name} />
              ) : (
                <View style={{ height: 100, borderRadius: 6, backgroundColor: colors.secondaryBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.muted }}>📄</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        {collection.file_count} file{collection.file_count !== 1 ? 's' : ''}
      </Text>
      <NoteCardBottomBar note={collection} href={`/collection/${collection.id}`} />
      {modal === 'move' ? (
        <MoveModal
          visible
          title="Move Collection"
          currentListId={collection.list}
          onClose={() => setModal(null)}
          onMove={(list) => {
            setModal(null);
            update({ list: list.id }, 'Collection moved');
          }}
        />
      ) : null}
      <ConfirmModal visible={modal === 'delete'} title="Delete Collection" body={`Delete "${collection.name}"? This will not delete the files themselves.`} onCancel={() => setModal(null)} onConfirm={remove} />
    </Pressable>
  );
}
