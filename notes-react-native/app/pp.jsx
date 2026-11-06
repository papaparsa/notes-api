import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { publicFetchJSON } from '../lib/api';
import { handleApiError } from '../lib/errorHandler';
import TopNavbar from '../components/TopNavbar';
import ScrollPage from '../components/ScrollPage';
import NoteList from '../components/NoteList';

function PageButton({ label, onPress, active, disabled }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled || active} style={{ paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.bodyBg, marginLeft: -1 }}>
      <Text style={{ color: active ? '#fff' : disabled ? colors.muted : colors.primary }}>{label}</Text>
    </Pressable>
  );
}

export default function PublicNotesPage() {
  const { page: pageParam } = useLocalSearchParams();
  const router = useRouter();
  const page = parseInt(pageParam || '1', 10) || 1;
  const [notes, setNotes] = useState([]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    setBusy(true);
    publicFetchJSON(`/api/note/pp/?page=${page}`)
      .then((data) => {
        setNotes(data.results || []);
        setCount(data.count || 0);
      })
      .catch(handleApiError)
      .finally(() => setBusy(false));
  }, [page]);

  const last = Math.max(1, Math.ceil(count / 20));
  const go = (p) => router.setParams({ page: String(p) });

  return (
    <View style={{ flex: 1, backgroundColor: '#212529' }}>
      <TopNavbar isLoggedIn={false} />
      <ScrollPage contentContainerStyle={{ padding: 12, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 12 }}>
          <PageButton label="First" onPress={() => go(1)} disabled={page === 1} />
          <PageButton label="Prev" onPress={() => go(page - 1)} disabled={page === 1} />
          <PageButton label={String(page)} active />
          <PageButton label="Next" onPress={() => go(page + 1)} disabled={page >= last} />
          <PageButton label="Last" onPress={() => go(last)} disabled={page >= last} />
        </View>
        <NoteList notes={notes} isBusy={busy} hideEdits />
      </ScrollPage>
    </View>
  );
}
