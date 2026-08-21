"use client";

import { Suspense, useState, useEffect, useCallback, useContext } from "react";
import { Form, FormCheck, Row, Col, Button } from "react-bootstrap";
import { useRouter, useSearchParams } from "next/navigation";
import NoteList from "../components/NoteList";
import CollectionCard from "../components/CollectionCard";
import CreateCollectionModal from "../components/CreateCollectionModal";
import MessageInput from "../components/MessageInput";
import { fetchWithAuth } from "../lib/api";
import { handleApiError } from "../utils/errorHandler";
import SearchBar from "../components/search/SearchBar";
import PaginationComponent from "../components/PaginationComponent";
import ImportantNotesSidebar from "../components/ImportantNotesSidebar";
import ImportantNotesCenter from "../components/ImportantNotesCenter";
import FiltersBar from "../components/FiltersBar";
import JoystickFab from "../components/JoystickFab";
import {
  useImportantNotes,
  useImportantNotesDisplayMode,
  DISPLAY_MODES,
} from "../hooks/useImportantNotes";
import { useTrendingHashtags } from "../hooks/useTrendingHashtags";
import {
  WorkspaceContext,
  NoteListContext,
  SELECTED_WORKSPACE_CACHE_KEY,
} from "./layout";

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="text-center py-5">Loading...</div>}>
      <NotesPageContent />
    </Suspense>
  );
}

function NotesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaces, selectedWorkspaceSlug } = useContext(WorkspaceContext);

  const noteLists = useContext(NoteListContext);
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isBusy, setIsBusy] = useState(true);
  const [date, setDate] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [newNoteId, setNewNoteId] = useState(null);
  const [highlightNoteId, setHighlightNoteId] = useState(null);
  const [showCreateCollectionModal, setShowCreateCollectionModal] =
    useState(false);
  const perPage = 20;
  const currentPage = parseInt(searchParams.get("page") || "1");
  const selectedCategorySlug = searchParams.get("category") || null;

  const { displayMode, toggleDisplayMode } = useImportantNotesDisplayMode();
  const { importantNotes, isLoading: importantLoading } = useImportantNotes({
    listSlug: selectedCategorySlug,
    selectedWorkspaceSlug: selectedWorkspaceSlug,
    showHidden,
  });

  const { hashtags: trendingHashtags, loading: hashtagsLoading } =
    useTrendingHashtags({
      selectedWorkspaceSlug: selectedWorkspaceSlug,
    });

  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight) {
      setHighlightNoteId(highlight);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("highlight");
      const newUrl = newParams.toString()
        ? `?${newParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [searchParams]);

  const getRecords = useCallback(
    async (selectedDate = null) => {
      setIsBusy(true);
      try {
        let url = `/api/note/feed/`;
        const params = new URLSearchParams({
          page: currentPage,
          archived: showHidden,
          ...(selectedDate && { date: selectedDate }),
          ...(selectedWorkspaceSlug && { workspace: selectedWorkspaceSlug }),
          ...(selectedCategorySlug && { category: selectedCategorySlug }),
        });

        const response = await fetchWithAuth(`${url}?${params}`);
        if (!response.ok) throw new Error("Failed to fetch feed");
        const data = await response.json();

        setItems(data.results);
        setTotalCount(data.count);

        if (selectedDate != null) {
          if (data.next !== null) {
            const nextPage = new URL(
              data.next,
              window.location.origin,
            ).searchParams.get("page");
            if (nextPage) {
              updateUrlParams({ page: parseInt(nextPage) - 1 });
            }
          } else if (data.previous !== null) {
            const prevPage = new URL(
              data.previous,
              window.location.origin,
            ).searchParams.get("page");
            if (prevPage) {
              updateUrlParams({ page: parseInt(prevPage) + 1 });
            }
          }
          if (data.highlight_note_id) {
            setHighlightNoteId(data.highlight_note_id);
          }
        }
      } catch (err) {
        console.error(`Error: ${err}`);
        handleApiError(err);
      } finally {
        setIsBusy(false);
      }
    },
    [currentPage, showHidden, selectedWorkspaceSlug, selectedCategorySlug],
  );

  useEffect(() => {
    getRecords();
  }, [getRecords]);

  const showMessagesForDate = (selectedDate) => {
    setDate(selectedDate);
    getRecords(selectedDate);
  };

  const updateUrlParams = (updates) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`?${params.toString()}`, undefined, { shallow: true });
  };

  const updateNote = async (noteId, updates) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.type === "note" && item.id === noteId
          ? { ...item, ...updates }
          : item,
      ),
    );
  };

  const deleteNote = async (noteId) => {
    setItems((prevItems) =>
      prevItems.filter((item) => !(item.type === "note" && item.id === noteId)),
    );
  };

  const deleteCollection = async (collectionId) => {
    setItems((prevItems) =>
      prevItems.filter(
        (item) => !(item.type === "collection" && item.id === collectionId),
      ),
    );
  };

  const addNewNote = (note) => {
    const noteWithType = { ...note, type: "note" };
    setItems((prevItems) => [noteWithType, ...prevItems]);
    setNewNoteId(note.id);

    setTimeout(() => setNewNoteId(null), 2000);
  };

  const handleSearch = useCallback(
    (newSearchText, newListSlugs) => {
      let url = `/search/?q=${encodeURIComponent(newSearchText || "")}`;
      if (selectedCategorySlug) {
        url += `&list_slug=${encodeURIComponent(selectedCategorySlug)}`;
      } else if (selectedWorkspaceSlug) {
        const workspace = workspaces.find(
          (ws) => ws.slug === selectedWorkspaceSlug,
        );
        if (workspace && workspace.categories) {
          const workspaceCategorySlugs = workspace.categories
            .map((cat) => cat.slug)
            .join(",");
          url += `&list_slug=${encodeURIComponent(workspaceCategorySlugs)}`;
        }
      }
      router.push(url);
    },
    [router, selectedWorkspaceSlug, selectedCategorySlug],
  );

  const handlePageChange = (newPage) => {
    updateUrlParams({ page: newPage });
  };

  const handleCategoryChange = (categorySlug) => {
    updateUrlParams({ category: categorySlug, page: 1 });
  };

  useEffect(() => {
    const selectedList = selectedCategorySlug
      ? noteLists.find((lst) => lst.slug === selectedCategorySlug)
      : null;
    if (selectedList) {
      document.title = `${selectedList.name} - Notes`;
    } else {
      document.title = "Feed - Notes";
    }
  }, [selectedCategorySlug, noteLists]);

  return (
    <div dir="ltr" style={{ minHeight: "100vh", overflow: "auto" }}>
      <SearchBar onSearch={handleSearch} />
      <div dir="ltr">
        <Row className="m-0 p-0">
          <Col
            xs={12}
            lg={3}
            className="mb-3 mb-lg-0 order-2 order-lg-1 pe-lg-3 mt-lg-3"
          >
            <FiltersBar
              selectedCategorySlug={selectedCategorySlug}
              onCategoryChange={handleCategoryChange}
              showHidden={showHidden}
              onShowHiddenChange={setShowHidden}
              date={date}
              onDateChange={showMessagesForDate}
              trendingHashtags={trendingHashtags}
              hashtagsLoading={hashtagsLoading}
            />
          </Col>
          <Col
            xs={12}
            lg={7}
            className="px-3 px-lg-0 order-3 order-lg-2"
            dir="ltr"
          >
            <div className="d-none d-lg-block">
              <PaginationComponent
                currentPage={currentPage}
                totalCount={totalCount}
                perPage={perPage}
                onPageChange={handlePageChange}
              />
            </div>
            {displayMode === DISPLAY_MODES.CENTER && (
              <ImportantNotesCenter
                importantNotes={importantNotes}
                isLoading={importantLoading}
                showHidden={showHidden}
                onUpdateNote={updateNote}
                onDeleteNote={deleteNote}
                refreshNotes={getRecords}
                onToggleDisplayMode={toggleDisplayMode}
              />
            )}
            {isBusy ? (
              <div className="text-center py-5">Loading...</div>
            ) : (
              items.map((item) =>
                item.type === "collection" ? (
                  <CollectionCard
                    key={`collection-${item.id}`}
                    collection={item}
                    onDeleteCollection={deleteCollection}
                    refreshCollections={getRecords}
                  />
                ) : (
                  <NoteList
                    key={`note-${item.id}`}
                    notes={[item]}
                    isBusy={false}
                    showHidden={showHidden}
                    onUpdateNote={updateNote}
                    onDeleteNote={deleteNote}
                    refreshNotes={getRecords}
                    newNoteId={newNoteId}
                    highlightNoteId={highlightNoteId}
                  />
                ),
              )
            )}
          </Col>
          <Col
            xs={12}
            lg={2}
            className="mb-3 mb-lg-0 order-1 order-lg-3 ps-lg-3 mt-3  "
          >
            <Button
              variant="outline-primary"
              className="w-100 mb-2 d-none d-md-block "
              onClick={() => setShowCreateCollectionModal(true)}
            >
              + New Collection
            </Button>
            <ImportantNotesSidebar
              importantNotes={importantNotes}
              isLoading={importantLoading}
              listSlug={selectedCategorySlug}
              selectedWorkspaceSlug={selectedWorkspaceSlug}
              showHidden={showHidden}
              basePath="/"
              displayMode={displayMode}
              onToggleDisplayMode={toggleDisplayMode}
            />
          </Col>
        </Row>
      </div>
      <MessageInput
        onNoteSaved={addNewNote}
        listSlug={selectedCategorySlug || "All"}
        selectedWorkspaceSlug={selectedWorkspaceSlug}
        currentPage={currentPage}
        totalPages={Math.ceil(totalCount / perPage)}
        onPageChange={handlePageChange}
      />
      <CreateCollectionModal
        show={showCreateCollectionModal}
        onHide={() => setShowCreateCollectionModal(false)}
        defaultCategory={
          selectedCategorySlug
            ? noteLists.find((lst) => lst.slug === selectedCategorySlug)?.id
            : null
        }
        onCreated={getRecords}
      />
    </div>
  );
}
