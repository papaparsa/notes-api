import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchJSON } from '../lib/api';
import { KEYS, getItem, getJSON, setItem, setJSON } from '../lib/storage';
import { on } from '../lib/events';
import { handleApiError } from '../lib/errorHandler';
import * as auth from '../lib/auth';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [noteLists, setNoteLists] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceSlug, setSelectedWorkspaceSlug] = useState(null);
  const savedSlugRef = useRef(null);

  const applyWorkspaceSelection = useCallback((data) => {
    const saved = savedSlugRef.current;
    const resolved = data.find((ws) => ws.slug === saved) || data.find((ws) => ws.is_default) || data[0] || null;
    const slug = resolved?.slug ?? null;
    savedSlugRef.current = slug;
    setSelectedWorkspaceSlug(slug);
    setItem(KEYS.selectedWorkspace, slug);
  }, []);

  const refreshLists = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/note/list/');
      const sorted = [...data].sort((a, b) => a.archived - b.archived);
      setNoteLists(sorted);
      setJSON(KEYS.noteLists, sorted);
    } catch (err) {
      handleApiError(err);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/note/workspaces/');
      setWorkspaces(data);
      setJSON(KEYS.workspaces, data);
      applyWorkspaceSelection(data);
    } catch (err) {
      handleApiError(err);
    }
  }, [applyWorkspaceSelection]);

  const loadInitialData = useCallback(async () => {
    savedSlugRef.current = await getItem(KEYS.selectedWorkspace);
    setSelectedWorkspaceSlug(savedSlugRef.current);
    const [cachedLists, cachedWorkspaces] = await Promise.all([getJSON(KEYS.noteLists), getJSON(KEYS.workspaces)]);
    if (cachedLists) setNoteLists(cachedLists);
    if (cachedWorkspaces) {
      setWorkspaces(cachedWorkspaces);
      applyWorkspaceSelection(cachedWorkspaces);
    }
    refreshLists();
    refreshWorkspaces();
  }, [applyWorkspaceSelection, refreshLists, refreshWorkspaces]);

  useEffect(() => {
    getItem(KEYS.loggedIn).then((v) => setIsAuthenticated(v === '1'));
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadInitialData();
  }, [isAuthenticated, loadInitialData]);

  useEffect(() => {
    const offs = [
      on('updateNoteLists', refreshLists),
      on('updateWorkspaces', refreshWorkspaces),
      on('sessionExpired', async () => {
        await auth.logout();
        setNoteLists([]);
        setWorkspaces([]);
        setIsAuthenticated(false);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [refreshLists, refreshWorkspaces]);

  const selectWorkspaceSlug = useCallback((slug) => {
    savedSlugRef.current = slug;
    setSelectedWorkspaceSlug(slug);
    setItem(KEYS.selectedWorkspace, slug);
  }, []);

  const login = useCallback(async (username, password) => {
    await auth.login(username, password);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    setNoteLists([]);
    setWorkspaces([]);
    setSelectedWorkspaceSlug(null);
    savedSlugRef.current = null;
    setIsAuthenticated(false);
  }, []);

  const selectedWorkspace = useMemo(
    () => workspaces.find((ws) => ws.slug === selectedWorkspaceSlug) || null,
    [workspaces, selectedWorkspaceSlug],
  );

  const value = useMemo(
    () => ({
      isAuthenticated,
      login,
      logout,
      noteLists,
      workspaces,
      setWorkspaces,
      selectedWorkspaceSlug,
      selectedWorkspace,
      selectWorkspaceSlug,
      refreshLists,
      refreshWorkspaces,
    }),
    [isAuthenticated, login, logout, noteLists, workspaces, selectedWorkspaceSlug, selectedWorkspace, selectWorkspaceSlug, refreshLists, refreshWorkspaces],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);

export const useCategoryById = () => {
  const { noteLists } = useApp();
  return useCallback((id) => noteLists.find((l) => l.id === id), [noteLists]);
};

export const useWorkspaceCategories = () => {
  const { noteLists, selectedWorkspace } = useApp();
  return useMemo(() => {
    if (!selectedWorkspace) return noteLists;
    const ids = new Set((selectedWorkspace.categories || []).map((c) => c.id));
    return noteLists.filter((l) => ids.has(l.id));
  }, [noteLists, selectedWorkspace]);
};
