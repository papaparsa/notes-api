"use client";

import { Suspense, useState, useEffect, useCallback, useRef, useContext, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormCheck, Row, Col, Button, Card } from "react-bootstrap";
import NoteList from "../../components/NoteList";
import SearchBar from "../../components/search/SearchBar";
import SemanticSearchResults from "../../components/search/SemanticSearchResults";
import PaginationComponent from "../../components/PaginationComponent";
import CategoryFilterModal from "../../components/search/CategoryFilterModal";
import SearchFilters from "../../components/search/SearchFilters";
import FloatingFilterButton from "../../components/FloatingFilterButton";
import JoystickFab from "../../components/JoystickFab";
import { fetchWithAuth } from "../../lib/api";
import { handleApiError } from "../../utils/errorHandler";
import { WorkspaceContext } from "../layout";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-5">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const [notes, setNotes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const perPage = 20;
  const getRecordsRef = useRef();
  const { selectedWorkspaceSlug, workspaces } = useContext(WorkspaceContext);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Derive all state from URL params as single source of truth
  const searchText = searchParams.get("q") || "";
  const currentPage = parseInt(searchParams.get("page") || "1");
  const showHidden = searchParams.get("show_hidden") === "true";
  const hasFiles = searchParams.get("has_files") === "true";
  const listSlugParam = searchParams.get("list_slug") || "";

  const selectedWorkspace = useMemo(
    () => workspaces?.find((workspace) => workspace.slug === selectedWorkspaceSlug) || null,
    [workspaces, selectedWorkspaceSlug],
  );

  const urlListSlugs = useMemo(
    () =>
      listSlugParam
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean),
    [listSlugParam],
  );

  const workspaceListSlugs = useMemo(
    () =>
      (selectedWorkspace?.categories || [])
        .map((cat) => (typeof cat === "string" ? cat : cat?.slug))
        .filter(Boolean),
    [selectedWorkspace],
  );

  const hasExplicitListSlug = urlListSlugs.length > 0;
  const effectiveListSlugs = hasExplicitListSlug
    ? urlListSlugs
    : workspaceListSlugs;
  const shouldForceEmptyScopedResults =
    !hasExplicitListSlug && workspaceListSlugs.length === 0;

  const getRecords = useCallback(async () => {
    if (shouldForceEmptyScopedResults) {
      setNotes([]);
      setTotalCount(0);
      setIsBusy(false);
      return;
    }

    const listSlug = effectiveListSlugs.join(",");
    setIsBusy(true);
    try {
      let url = `/api/note/search/?q=${encodeURIComponent(searchText)}&show_hidden=${showHidden}&has_files=${hasFiles}&page=${currentPage}`;
      if (listSlug) {
        url += `&list_slug=${encodeURIComponent(listSlug)}`;
      }
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error("Failed to fetch search results");
      const data = await response.json();
      setNotes(data.results);
      setTotalCount(data.count);
    } catch (err) {
      console.error(`Error: ${err}`);
      handleApiError(err);
    } finally {
      setIsBusy(false);
    }
  }, [searchText, showHidden, hasFiles, currentPage, effectiveListSlugs, shouldForceEmptyScopedResults]);

  useEffect(() => {
    getRecordsRef.current = getRecords;
  }, [getRecords]);

  const buildUrl = useCallback(
    (overrides = {}) => {
      const params = new URLSearchParams();
      const nextListSlug =
        overrides.list_slug !== undefined ? overrides.list_slug : listSlugParam;

      params.set("q", overrides.q ?? searchText);
      params.set("page", String(overrides.page ?? currentPage));
      params.set("show_hidden", String(overrides.show_hidden ?? showHidden));
      params.set("has_files", String(overrides.has_files ?? hasFiles));

      if (nextListSlug) {
        params.set("list_slug", nextListSlug);
      }

      const query = params.toString();
      return `/search/?${query}`;
    },
    [searchText, currentPage, showHidden, hasFiles, listSlugParam],
  );

  const handleFiltersChangeFromModal = useCallback(
    ({ categories, hasFiles: newHasFiles }) => {
      const newListSlug = categories.length > 0 ? categories.join(",") : "";
      router.push(
        buildUrl({ list_slug: newListSlug, has_files: newHasFiles, page: 1 }),
      );
    },
    [router, buildUrl],
  );

  const updateNote = async (noteId, updates) => {
    setNotes((prevNotes) =>
      prevNotes.map((note) =>
        note.id === noteId ? { ...note, ...updates } : note,
      ),
    );
  };

  const deleteNote = async (noteId) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
    getRecordsRef.current();
  };

  useEffect(() => {
    getRecordsRef.current();
  }, [searchParams]);

  const handleSearch = useCallback(
    (newSearchText) => {
      router.push(buildUrl({ q: newSearchText, page: 1 }));
    },
    [router, buildUrl],
  );

  const handlePageChange = (newPage) => {
    router.push(buildUrl({ page: newPage }), undefined, { shallow: true });
  };

  return (
    <div dir="ltr">
      <SearchBar onSearch={handleSearch} initialSearchText={searchText} />
      <div dir="ltr">
        <div className="d-none d-lg-block">
          <PaginationComponent
            currentPage={currentPage}
            totalCount={totalCount}
            perPage={perPage}
            onPageChange={handlePageChange}
          />
        </div>
        <Row className="m-0 p-0">
          <Col xs={12} xl={3} className="mb-3 mb-lg-0 pe-lg-3">
            <FormCheck
              type="checkbox"
              id="show-hidden"
              label="Show Hidden"
              checked={showHidden}
              onChange={(e) => {
                router.push(
                  buildUrl({ show_hidden: e.target.checked, page: 1 }),
                );
              }}
              className="mb-2 text-body-emphasis mt-2"
            />

            <Card className="d-none d-lg-block">
              <Card.Header>
                <strong>Filters</strong>
              </Card.Header>
              <Card.Body>
                <SearchFilters
                  selectedCategories={effectiveListSlugs}
                  hasFiles={hasFiles}
                  onFiltersChange={handleFiltersChangeFromModal}
                />
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} xl={6} className="px-3 px-lg-0" dir="ltr">
            <NoteList
              notes={notes}
              isBusy={isBusy}
              showHidden={showHidden}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              refreshNotes={() => getRecordsRef.current()}
            />

            <SemanticSearchResults
              searchText={searchText}
              onUpdateNote={updateNote}
              onDeleteNote={deleteNote}
              refreshNotes={() => getRecordsRef.current()}
              showHidden={showHidden}
              listSlug={effectiveListSlugs.join(",")}
              hasFiles={hasFiles}
            />
          </Col>
          <Col xs={12} xl={3} className="d-none d-xl-block"></Col>
        </Row>
      </div>

      <JoystickFab
        onPageChange={handlePageChange}
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / perPage)}
      >
        <FloatingFilterButton
          onClick={() => setShowCategoryModal(true)}
          inline
        />
      </JoystickFab>

      <CategoryFilterModal
        show={showCategoryModal}
        onHide={() => setShowCategoryModal(false)}
        selectedCategories={effectiveListSlugs}
        hasFiles={hasFiles}
        onFiltersChange={handleFiltersChangeFromModal}
      />
    </div>
  );
}
