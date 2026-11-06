import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryById } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { fetchJSON } from '../../lib/api';
import { formatDateLarge, formatDateSmall } from '../../lib/dateFormatters';
import { handleApiError } from '../../lib/errorHandler';

export default function NoteCardBottomBar({ note, singleView, href, listId, extraPath }) {
  const { colors } = useTheme();
  const { md } = useBreakpoint();
  const router = useRouter();
  const category = useCategoryById()(listId ?? note.list);

  const goToFeedPosition = async () => {
    const slug = category?.slug || 'All';
    try {
      const data = await fetchJSON(`/api/note/message/${note.id}/page/?slug=${encodeURIComponent(slug)}&show_hidden=false`);
      const params = new URLSearchParams({ page: String(data.page) });
      if (slug !== 'All') params.set('category', slug);
      params.set('highlight', String(note.id));
      router.push(`/?${params.toString()}`);
    } catch (err) {
      handleApiError(err);
    }
  };

  return (
    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
      <View style={{ marginRight: 'auto', flex: 1, flexDirection: 'row' }}>
        <Pressable onPress={singleView ? goToFeedPosition : () => router.push(href || `/message/${note.id}`)} hitSlop={8} accessibilityLabel={singleView ? 'Show in feed' : 'Open note'}>
          <Ionicons name="link" size={18} color={colors.primary} />
        </Pressable>
      </View>
      {note.importance > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
          <Ionicons name="star" size={15} color={colors.info} />
          <Text style={{ color: colors.info, marginLeft: 4 }}>{note.importance}</Text>
        </View>
      ) : null}
      {category ? (
        <Text onPress={() => router.push(`/?category=${encodeURIComponent(category.slug)}`)} style={{ color: colors.primary, marginRight: 8 }}>
          {category.name}
        </Text>
      ) : null}
      {note.archived ? <Ionicons name="archive-outline" size={16} color={colors.info} style={{ marginHorizontal: 8 }} /> : null}
      <Text style={{ color: colors.text, fontSize: 14 }}>{md ? formatDateLarge(note.created_at) : formatDateSmall(note.created_at)}</Text>
    </View>
  );
}
