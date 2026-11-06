import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { shadow } from '../../styles/theme';
import { sectionHeader } from '../ImportantNotesSidebar';
import { CompactMarkdownRenderer } from '../notecard/markdown/MarkdownRenderers';

export default function Backlinks({ links }) {
  const { colors } = useTheme();
  const router = useRouter();
  if (!links?.length) return null;
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={[sectionHeader(colors), { marginBottom: 16 }]}>Backlinks</Text>
      <View style={{ gap: 8 }}>
        {links.map((link) => (
          <Pressable
            key={link.id}
            onPress={() => router.push(`/message/${link.source_message.id}`)}
            style={({ hovered }) => [{ borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#6c757d', padding: 12, backgroundColor: colors.bodyBg, transform: [{ translateX: hovered ? 4 : 0 }] }, shadow(1)]}
          >
            <CompactMarkdownRenderer text={link.source_message.text} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
