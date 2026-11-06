import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import useTrendingHashtags from '../hooks/useTrendingHashtags';
import { Spinner, T } from './ui';

export default function TrendingHashtags() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedWorkspaceSlug } = useApp();
  const { hashtags, loading } = useTrendingHashtags(selectedWorkspaceSlug);
  if (loading) return <Spinner size="small" style={{ alignSelf: 'flex-start', marginTop: 8 }} />;
  if (!hashtags.length) return null;
  return (
    <View style={{ marginTop: 16 }}>
      <T small muted style={{ marginBottom: 4 }}>Trending Tags</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {hashtags.map(({ tag, count }) => (
          <Pressable key={tag} onPress={() => router.push(`/search?q=${encodeURIComponent(`#${tag}`)}`)} style={{ borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9, backgroundColor: colors.tertiaryBg, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 12.5, color: colors.text }}>
              #{tag} <Text style={{ opacity: 0.5, fontSize: 11 }}>{count}</Text>
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
