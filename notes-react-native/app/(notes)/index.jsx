import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import useImportantNotes from '../../hooks/useImportantNotes';
import { buildQuery, fetchJSON } from '../../lib/api';
import { handleApiError } from '../../lib/errorHandler';
import { formatYMD } from '../../lib/dateFormatters';
import ScrollPage from '../../components/ScrollPage';
import SearchBar from '../../components/search/SearchBar';
import FiltersBar from '../../components/FiltersBar';
import PaginationComponent from '../../components/PaginationComponent';
import ImportantNotesSidebar, { ImportantNotesCenter } from '../../components/ImportantNotesSidebar';
import NoteList, { AnimatedNoteWrapper, useNoteMutations } from '../../components/NoteList';
import NoteCard from '../../components/notecard/NoteCard';
import CollectionCard from '../../components/CollectionCard';
import CreateCollectionModal from '../../components/CreateCollectionModal';
import MessageInput from '../../components/MessageInput';
import { Button, Spinner } from '../../components/ui';

const PER_PAGE = 20;
const pageFromUrl = (url) => {
  const m = /[?&]page=(\d+)/.exec(url || '');
  return m ? parseInt(m[1], 10) : null;
};

export default function FeedPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { lg, md } = useBreakpoint();
  const { noteLists, selectedWorkspaceSlug, selectedWorkspace } = useApp();
  const currentPage = parseInt(params.page || '1', 10) || 1;
  const categorySlug = params.category || null;
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isBusy, setIsBusy] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [date, setDate] = useState(null);
  const [newNoteId, setNewNoteId] = useState(null);
  const [highlightNoteId, setHighlightNoteId] = useState(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const scrollRef = useRef(null);
  const offsets = useRef({ row: 0, col: 0, list: 0, items: {} });
  const requestRef = useRef(0);

  const important = useImportantNotes({ categorySlug, workspaceSlug: selectedWorkspaceSlug, showHidden });

  useEffect(() => {
    if (params.highlight) {
      setHighlightNoteId(Number(params.highlight));
      router.setParams({ highlight: undefined });
    }
  }, [params.highlight]);

  useEffect(() => {
    if (!highlightNoteId) return;
    const timer = setTimeout(() => {
      const o = offsets.current;
      const y = o.items[highlightNoteId];
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, o.row + o.col + o.list + y - 200), animated: true });
    }, 300);
    const clear = setTimeout(() => setHighlightNoteId(null), 2500);
    return () => {
      clearTimeout(timer);
      clearTimeout(clear);
    };
  }, [highlightNoteId, items]);

  const updateParams = (updates) => router.setParams(Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, v === null ? undefined : String(v)])));

  const getRecords = useCallback(
    async (selectedDate = null) => {
      const id = ++requestRef.current;
      setIsBusy(true);
      try {
        const data = await fetchJSON(
          `/api/note/feed/${buildQuery({ page: currentPage, archived: showHidden ? 'true' : 'false', date: selectedDate, workspace: selectedWorkspaceSlug, category: categorySlug })}`,
        );
        if (id !== requestRef.current) return;
        setItems(data.results || []);
        setTotalCount(data.count || 0);
        if (selectedDate) {
          const next = pageFromUrl(data.next);
          const prev = pageFromUrl(data.previous);
          if (next) updateParams({ page: next - 1 });
          else if (prev) updateParams({ page: prev + 1 });
          if (data.highlight_note_id) setHighlightNoteId(data.highlight_note_id);
        }
      } catch (err) {
        handleApiError(err);
      } finally {
        if (id === requestRef.current) setIsBusy(false);
      }
    },
    [currentPage, showHidden, selectedWorkspaceSlug, categorySlug],
  );

  useEffect(() => {
    getRecords();
  }, [getRecords]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([getRecords(), important.refresh()]);
    setRefreshing(false);
  };

  const updateNote = (id, patch) => setItems((prev) => prev.map((it) => (it.type !== 'collection' && it.id === id ? { ...it, ...patch } : it)));
  const deleteNote = (id) => setItems((prev) => prev.filter((it) => !(it.type !== 'collection' && it.id === id)));
  const updateCollection = (c) => setItems((prev) => prev.map((it) => (it.type === 'collection' && it.id === c.id ? { ...it, ...c } : it)));
  const deleteCollection = (id) => setItems((prev) => prev.filter((it) => !(it.type === 'collection' && it.id === id)));
  const { handleEdit, handleDelete } = useNoteMutations({ onUpdateNote: updateNote, onDeleteNote: deleteNote });

  const addNewNote = (note) => {
    setItems((prev) => [note, ...prev]);
    setNewNoteId(note.id);
    setTimeout(() => setNewNoteId(null), 2000);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSearch = (text) => {
    let slugs = categorySlug;
    if (!slugs && selectedWorkspace?.categories) slugs = selectedWorkspace.categories.map((c) => c.slug).join(',');
    router.push(`/search${buildQuery({ q: text || '', list_slug: slugs })}`);
  };

  const changePage = (page) => {
    updateParams({ page });
    scrollRef.current?.scrollToTop();
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  const filters = (
    <FiltersBar
      category={categorySlug}
      onCategoryChange={(slug) => updateParams({ category: slug === 'All' ? null : slug, page: 1 })}
      showHidden={showHidden}
      onShowHiddenChange={setShowHidden}
      date={date}
      onDateChange={(d) => {
        setDate(d);
        if (d) getRecords(formatYMD(d));
      }}
    />
  );

  const right = (
    <View>
      {md ? <Button variant="outline-primary" block title="+ New Collection" onPress={() => setShowCreateCollection(true)} style={{ marginBottom: 8 }} /> : null}
      <ImportantNotesSidebar notes={important.notes} mode={important.mode} setMode={important.setMode} categorySlug={categorySlug} workspaceSlug={selectedWorkspaceSlug} showHidden={showHidden} />
    </View>
  );

  const feed = (
    <View onLayout={(e) => (offsets.current.col = lg ? 0 : e.nativeEvent.layout.y)}>
      {lg ? <PaginationComponent currentPage={currentPage} totalCount={totalCount} perPage={PER_PAGE} onPageChange={changePage} /> : null}
      <ImportantNotesCenter notes={important.notes} mode={important.mode} setMode={important.setMode} onUpdateNote={(id, patch) => important.setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...patch } : n)))} onDeleteNote={(id) => important.setNotes((p) => p.filter((n) => n.id !== id))} refreshNotes={onRefresh} NoteListComponent={NoteList} />
      {isBusy ? (
        <View style={{ alignItems: 'center', marginTop: 48 }}>
          <Spinner />
        </View>
      ) : (
        <View style={{ marginTop: 4 }} onLayout={(e) => (offsets.current.list = e.nativeEvent.layout.y)}>
          {items.map((item) =>
            item.type === 'collection' ? (
              <CollectionCard key={`c${item.id}`} collection={item} onUpdate={updateCollection} onDelete={deleteCollection} />
            ) : showHidden || !item.archived ? (
              <AnimatedNoteWrapper key={`n${item.id}`} isNew={newNoteId === item.id} isHighlighted={String(highlightNoteId) === String(item.id)} onLayout={(e) => (offsets.current.items[item.id] = e.nativeEvent.layout.y)}>
                <NoteCard note={item} onEditNote={handleEdit} onDeleteNote={handleDelete} refreshNotes={onRefresh} onNoteMoved={(id, list) => updateNote(id, { list })} />
              </AnimatedNoteWrapper>
            ) : null,
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollPage ref={scrollRef} onRefresh={onRefresh} refreshing={refreshing}>
        <SearchBar onSearch={handleSearch} />
        <View onLayout={(e) => (offsets.current.row = e.nativeEvent.layout.y)} style={{ flexDirection: lg ? 'row' : 'column', paddingHorizontal: lg ? 0 : 16 }}>
          {lg ? (
            <>
              <View style={{ width: '25%', paddingHorizontal: 12, paddingRight: 28, marginTop: 16 }}>{filters}</View>
              <View style={{ width: '58.333%', paddingHorizontal: 12 }}>{feed}</View>
              <View style={{ width: '16.667%', paddingHorizontal: 12, paddingLeft: 28, marginTop: 16 }}>{right}</View>
            </>
          ) : (
            <>
              <View style={{ marginTop: 16 }}>{right}</View>
              {filters}
              {feed}
            </>
          )}
        </View>
      </ScrollPage>
      <MessageInput listSlug={categorySlug} onNoteCreated={addNewNote} currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
      <CreateCollectionModal visible={showCreateCollection} onClose={() => setShowCreateCollection(false)} defaultCategorySlug={categorySlug} onCreated={(data) => router.push(`/collection/${data.id}`)} />
    </View>
  );
}
