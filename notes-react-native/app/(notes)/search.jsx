import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { buildQuery, fetchJSON } from '../../lib/api';
import { handleApiError } from '../../lib/errorHandler';
import ScrollPage from '../../components/ScrollPage';
import SearchBar from '../../components/search/SearchBar';
import SearchFilters from '../../components/search/SearchFilters';
import SemanticSearchResults from '../../components/search/SemanticSearchResults';
import PaginationComponent from '../../components/PaginationComponent';
import NoteList from '../../components/NoteList';
import JoystickFab from '../../components/JoystickFab';
import FloatingFilterButton from '../../components/FloatingFilterButton';
import { AppModal, Card, CardBody, CardHeader, Checkbox } from '../../components/ui';

const PER_PAGE = 20;

export default function SearchPage() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { lg, xl } = useBreakpoint();
  const { selectedWorkspace } = useApp();
  const q = params.q || '';
  const page = parseInt(params.page || '1', 10) || 1;
  const showHidden = params.show_hidden === 'true';
  const hasFiles = params.has_files === 'true';
  const workspaceSlugs = (selectedWorkspace?.categories || []).map((c) => c.slug).join(',');
  const listSlug = params.list_slug ?? (selectedWorkspace ? workspaceSlugs : '');
  const [notes, setNotes] = useState([]);
  const [count, setCount] = useState(0);
  const [isBusy, setIsBusy] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const scrollRef = useRef(null);
  const requestRef = useRef(0);

  const update = (updates) => {
    const next = { q, page: String(page), show_hidden: String(showHidden), has_files: String(hasFiles), ...(params.list_slug !== undefined ? { list_slug: params.list_slug } : {}), ...updates };
    router.setParams(next);
  };

  const search = useCallback(async () => {
    if (selectedWorkspace && params.list_slug === undefined && !workspaceSlugs) {
      setNotes([]);
      setCount(0);
      setIsBusy(false);
      return;
    }
    const id = ++requestRef.current;
    setIsBusy(true);
    try {
      const data = await fetchJSON(`/api/note/search/${buildQuery({ q, show_hidden: showHidden, has_files: hasFiles, page, list_slug: listSlug || undefined })}`);
      if (id !== requestRef.current) return;
      setNotes(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      if (id === requestRef.current) handleApiError(err);
    } finally {
      if (id === requestRef.current) setIsBusy(false);
    }
  }, [q, page, showHidden, hasFiles, listSlug]);

  useEffect(() => {
    search();
  }, [search]);

  const changePage = (p) => {
    update({ page: String(p) });
    scrollRef.current?.scrollToTop();
  };

  const applyFilters = (slugs, files) => {
    setShowFilterModal(false);
    update({ list_slug: slugs.join(','), has_files: String(files), page: '1' });
  };

  const selectedSlugs = listSlug ? listSlug.split(',').filter(Boolean) : [];
  const filters = <SearchFilters selectedSlugs={selectedSlugs} hasFiles={hasFiles} onApply={applyFilters} />;
  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));

  return (
    <View style={{ flex: 1 }}>
      <ScrollPage ref={scrollRef} onRefresh={search}>
        <SearchBar initialValue={q} onSearch={(text) => update({ q: text, page: '1' })} />
        {lg ? <PaginationComponent currentPage={page} totalCount={count} perPage={PER_PAGE} onPageChange={changePage} /> : null}
        <View style={{ flexDirection: xl ? 'row' : 'column', paddingHorizontal: 12 }}>
          <View style={{ width: xl ? '25%' : '100%', paddingHorizontal: 12 }}>
            <Checkbox checked={showHidden} onChange={(v) => update({ show_hidden: String(v), page: '1' })} label="Show Hidden" style={{ marginVertical: 8 }} />
            {lg ? (
              <Card style={{ marginBottom: 16 }}>
                <CardHeader>Filters</CardHeader>
                <CardBody>{filters}</CardBody>
              </Card>
            ) : null}
          </View>
          <View style={{ width: xl ? '50%' : '100%', paddingHorizontal: 12 }}>
            <NoteList notes={notes} isBusy={isBusy} showHidden={showHidden} onUpdateNote={(id, patch) => setNotes((p) => p.map((n) => (n.id === id ? { ...n, ...patch } : n)))} onDeleteNote={() => search()} refreshNotes={search} />
            <SemanticSearchResults query={q} hasFiles={hasFiles} listSlug={listSlug} showHidden={showHidden} />
          </View>
          {xl ? <View style={{ width: '25%' }} /> : null}
        </View>
      </ScrollPage>
      {!lg ? (
        <JoystickFab currentPage={page} totalPages={totalPages} onPageChange={changePage}>
          <FloatingFilterButton inline onPress={() => setShowFilterModal(true)} />
        </JoystickFab>
      ) : null}
      <AppModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter by Categories" size="lg" centered>
        {filters}
      </AppModal>
    </View>
  );
}
