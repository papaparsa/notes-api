import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../../contexts/AppContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import useNoteData from '../../../hooks/useNoteData';
import ScrollPage from '../../../components/ScrollPage';
import NoteCard from '../../../components/notecard/NoteCard';
import RefreshPrompt from '../../../components/note/RefreshPrompt';
import Backlinks from '../../../components/note/Backlinks';
import SimilarNotes from '../../../components/note/SimilarNotes';
import NoteEditView from '../../../components/note/NoteEditView';
import { Spinner, T } from '../../../components/ui';
import { shadow } from '../../../styles/theme';

export default function NotePage() {
  const { id, highlight_start, highlight_end } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { lg } = useBreakpoint();
  const { selectedWorkspaceSlug } = useApp();
  const { note, isBusy, similarNotes, similarLoaded, isStale, reload, editNote, setNote } = useNoteData(id, selectedWorkspaceSlug);
  const [editing, setEditing] = useState(false);
  const scrollRef = useRef(null);
  const cardY = useRef(0);
  const scrolledToHighlight = useRef(false);

  const hs = highlight_start !== undefined ? parseInt(highlight_start, 10) : undefined;
  const he = highlight_end !== undefined ? parseInt(highlight_end, 10) : undefined;

  if (isBusy && !note) {
    return (
      <View style={{ paddingVertical: 48, alignItems: 'center' }}>
        <Spinner />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={{ padding: 48, alignItems: 'center' }}>
        <T muted>Note not found</T>
      </View>
    );
  }

  if (editing) {
    return (
      <ScrollPage contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 12 }}>
        <RefreshPrompt visible={isStale} onRefresh={reload} />
        <NoteEditView note={note} onSave={(text) => editNote(note.id, text)} onDone={() => setEditing(false)} />
      </ScrollPage>
    );
  }

  const side = (
    <View>
      <Backlinks links={note.source_links} />
      <SimilarNotes notes={similarNotes} loaded={similarLoaded} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollPage ref={scrollRef} contentContainerStyle={{ paddingVertical: 48, paddingHorizontal: lg ? 0 : 12 }} onRefresh={reload}>
        <View style={{ paddingHorizontal: lg ? 12 : 0 }}>
          <RefreshPrompt visible={isStale} onRefresh={reload} />
        </View>
        <View style={{ flexDirection: lg ? 'row' : 'column' }}>
          {lg ? <View style={{ width: '16.667%' }} /> : null}
          <View style={{ width: lg ? '66.667%' : '100%', paddingHorizontal: lg ? 12 : 0 }} onLayout={(e) => (cardY.current = e.nativeEvent.layout.y)}>
            <NoteCard
              note={note}
              singleView
              onEditNote={async (noteId, text) => editNote(noteId, text)}
              onNoteMoved={(nid, list) => setNote((n) => ({ ...n, list }))}
              highlightStart={hs}
              highlightEnd={he}
              onHighlightLayout={(y) => {
                if (scrolledToHighlight.current) return;
                scrolledToHighlight.current = true;
                setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, cardY.current + y - 120), animated: true }), 500);
              }}
            />
          </View>
          <View style={{ width: lg ? '16.667%' : '100%', paddingHorizontal: lg ? 12 : 0, marginTop: lg ? 0 : 24 }}>{side}</View>
        </View>
      </ScrollPage>
      <Pressable
        onPress={() => setEditing(true)}
        accessibilityLabel="Edit note"
        style={({ pressed, hovered }) => [
          { position: 'absolute', bottom: lg ? 24 : 20, right: lg ? 24 : 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', zIndex: 1050, transform: [{ scale: pressed ? 0.95 : hovered ? 1.08 : 1 }] },
          shadow(2),
        ]}
      >
        <Ionicons name="pencil" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}
