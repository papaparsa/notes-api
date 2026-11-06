import { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useToast, useWaiting } from '../contexts/UIContext';
import { fetchJSON } from '../lib/api';
import { handleApiError } from '../lib/errorHandler';
import NoteCard from './notecard/NoteCard';
import { Spinner } from './ui';

const native = Platform.OS !== 'web';

export function AnimatedNoteWrapper({ isNew, isHighlighted, children, onLayout }) {
  const { colors } = useTheme();
  const slide = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isNew) return;
    slide.setValue(0);
    glow.setValue(1);
    Animated.parallel([
      Animated.timing(slide, { toValue: 1, duration: 1000, useNativeDriver: native }),
      Animated.timing(glow, { toValue: 0, duration: 1500, useNativeDriver: false }),
    ]).start();
  }, [isNew]);

  useEffect(() => {
    if (!isHighlighted) return;
    glow.setValue(1);
    Animated.timing(glow, { toValue: 0, duration: 2000, delay: 200, useNativeDriver: false }).start();
  }, [isHighlighted]);

  return (
    <Animated.View
      onLayout={onLayout}
      style={{
        opacity: slide,
        transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }, { scale: slide.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
      }}
    >
      <Animated.View
        style={{
          borderRadius: 8,
          backgroundColor: glow.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', colors.primarySubtle] }),
          shadowColor: colors.primary,
          shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }),
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

export function useNoteMutations({ onUpdateNote, onDeleteNote }) {
  const showToast = useToast();
  const waiting = useWaiting();

  const handleEdit = async (id, text, updatedAt) => {
    waiting.show('Editing note');
    try {
      const updated = await fetchJSON(`/api/note/message/${id}/`, { method: 'PUT', body: { text, updated_at: updatedAt } });
      onUpdateNote?.(id, updated);
      showToast('Success', 'Note Saved', 5000, 'success');
      return true;
    } catch (err) {
      if (err.status === 409) showToast('Edit Rejected', 'This note was updated elsewhere. Please refresh.', 7000, 'danger');
      else handleApiError(err);
      return false;
    } finally {
      waiting.hide();
    }
  };

  const handleDelete = async (id) => {
    waiting.show('Deleting note');
    try {
      const data = await fetchJSON(`/api/note/message/${id}/`, { method: 'DELETE' });
      onDeleteNote?.(id);
      const files = data?.deleted_files || [];
      const extra = files.length ? `\nRemoved ${files.length} unused ${files.length === 1 ? 'file' : 'files'}: ${files.map((f) => f.split('/').pop()).join(', ')}` : '';
      showToast('Success', `Note Deleted${extra}`, 5000, 'success');
    } catch (err) {
      handleApiError(err);
    } finally {
      waiting.hide();
    }
  };

  return { handleEdit, handleDelete };
}

export default function NoteList({ notes, isBusy, hideEdits, showHidden, onUpdateNote, onDeleteNote, refreshNotes, newNoteId, highlightNoteId, onItemLayout }) {
  const { handleEdit, handleDelete } = useNoteMutations({ onUpdateNote, onDeleteNote });

  if (isBusy) {
    return (
      <View style={{ alignItems: 'center', marginTop: 48 }}>
        <Spinner />
      </View>
    );
  }

  return (
    <View style={{ marginTop: 4 }}>
      {notes.map((note) =>
        showHidden || !note.archived ? (
          <AnimatedNoteWrapper key={note.id} isNew={newNoteId === note.id} isHighlighted={highlightNoteId === note.id} onLayout={onItemLayout ? (e) => onItemLayout(note.id, e.nativeEvent.layout.y) : undefined}>
            <NoteCard
              note={note}
              hideEdits={hideEdits}
              onEditNote={handleEdit}
              onDeleteNote={handleDelete}
              refreshNotes={refreshNotes}
              onNoteMoved={(id, list) => onUpdateNote?.(id, { ...note, list })}
            />
          </AnimatedNoteWrapper>
        ) : null,
      )}
    </View>
  );
}
