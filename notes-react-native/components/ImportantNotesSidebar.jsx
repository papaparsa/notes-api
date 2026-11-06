import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { buildQuery, fetchJSON } from '../lib/api';
import { handleApiError } from '../lib/errorHandler';
import { shadow } from '../styles/theme';
import { CompactMarkdownRenderer } from './notecard/markdown/MarkdownRenderers';

export function GradientStripe({ from, to, width = 4 }) {
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width, overflow: 'hidden' }}>
      <View style={[{ flex: 1, backgroundColor: from }, Platform.OS === 'web' && { backgroundImage: `linear-gradient(180deg, ${from}, ${to})` }]} />
      {Platform.OS !== 'web' ? <View style={{ flex: 1, backgroundColor: to }} /> : null}
    </View>
  );
}

export function StaggerIn({ index, children, ready = true }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!ready) return;
    Animated.timing(anim, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [ready]);
  return <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>{children}</Animated.View>;
}

export function SideCard({ children, onPress, stripe }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ hovered }) => [{ borderRadius: 12, padding: 16, backgroundColor: colors.bodyBg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', transform: [{ translateY: hovered ? -2 : 0 }] }, shadow(1)]}>
      {stripe ? <GradientStripe from={stripe[0]} to={stripe[1]} /> : null}
      <View style={{ paddingLeft: 8 }}>{children}</View>
    </Pressable>
  );
}

export const sectionHeader = (colors) => ({ fontSize: 14, fontWeight: '600', letterSpacing: 0.5, color: colors.secondary, textTransform: 'uppercase' });

export default function ImportantNotesSidebar({ notes, mode, setMode, categorySlug, workspaceSlug, showHidden }) {
  const { colors } = useTheme();
  const { lg } = useBreakpoint();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!notes.length || mode === 'center') return null;

  const jump = async (note) => {
    try {
      const params = categorySlug ? { slug: categorySlug } : { workspace: workspaceSlug };
      const data = await fetchJSON(`/api/note/message/${note.id}/page/${buildQuery({ ...params, show_hidden: showHidden ? 'true' : 'false' })}`);
      const q = new URLSearchParams({ page: String(data.page) });
      if (categorySlug) q.set('category', categorySlug);
      q.set('highlight', String(note.id));
      router.push(`/?${q.toString()}`);
    } catch (err) {
      handleApiError(err);
    }
  };

  const list = (
    <View style={{ gap: 16 }}>
      {notes.map((note, i) => (
        <StaggerIn key={note.id} index={i}>
          <SideCard stripe={['#ffc107', '#fd7e14']} onPress={() => jump(note)}>
            <CompactMarkdownRenderer text={note.text} />
            <Text onPress={() => router.push(`/message/${note.id}`)} style={{ color: colors.primary, fontSize: 12, marginTop: 8 }}>
              View note →
            </Text>
          </SideCard>
        </StaggerIn>
      ))}
    </View>
  );

  if (!lg) {
    return (
      <View style={{ marginBottom: 12 }}>
        <Pressable onPress={() => setOpen((v) => !v)} style={{ padding: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.tertiaryBg, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>★ Important ({notes.length})</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
        </Pressable>
        {open ? <View style={{ paddingTop: 12 }}>{list}</View> : null}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={sectionHeader(colors)}>★ Important</Text>
        <Pressable onPress={() => setMode('center')} accessibilityLabel="Move to center" style={({ hovered }) => ({ opacity: hovered ? 1 : 0.5 })}>
          <Ionicons name="contract-outline" size={16} color={colors.text} />
        </Pressable>
      </View>
      {list}
    </View>
  );
}

export function ImportantNotesCenter({ notes, mode, setMode, onUpdateNote, onDeleteNote, refreshNotes, NoteListComponent }) {
  const { colors } = useTheme();
  if (!notes.length || mode !== 'center') return null;
  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={sectionHeader(colors)}>
          <Text style={{ color: colors.warning }}>★</Text> Pinned
        </Text>
        <Pressable onPress={() => setMode('sidebar')} accessibilityLabel="Move to sidebar" style={({ hovered }) => ({ opacity: hovered ? 1 : 0.5 })}>
          <Ionicons name="expand-outline" size={16} color={colors.text} />
        </Pressable>
      </View>
      <NoteListComponent notes={notes} showHidden onUpdateNote={onUpdateNote} onDeleteNote={onDeleteNote} refreshNotes={refreshNotes} />
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
    </View>
  );
}
