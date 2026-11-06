import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { SideCard, StaggerIn, sectionHeader } from '../ImportantNotesSidebar';
import { CompactMarkdownRenderer } from '../notecard/markdown/MarkdownRenderers';
import { Badge } from '../ui';

const stripeFor = (distance) => (distance < 1 ? ['#198754', '#20c997'] : distance < 2 ? ['#0d6efd', '#6610f2'] : ['#6c757d', '#adb5bd']);

export default function SimilarNotes({ notes, loaded }) {
  const { colors } = useTheme();
  const router = useRouter();
  if (!notes?.length) return null;
  return (
    <View>
      <Text style={[sectionHeader(colors), { marginBottom: 16 }]}>Related Notes</Text>
      <View style={{ gap: 16 }}>
        {notes.map((n, i) => (
          <StaggerIn key={n.id} index={i} ready={loaded}>
            <SideCard stripe={stripeFor(n.distance)} onPress={() => router.push(`/message/${n.id}`)}>
              <CompactMarkdownRenderer text={n.text} />
              {n.category?.name ? (
                <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
                  <Badge bg="secondary">{n.category.name}</Badge>
                </View>
              ) : null}
            </SideCard>
          </StaggerIn>
        ))}
      </View>
    </View>
  );
}
