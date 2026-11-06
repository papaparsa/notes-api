import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  loggedIn: 'loggedIn',
  csrf: 'csrftoken',
  noteLists: 'cachedNoteLists',
  workspaces: 'cachedWorkspaces',
  selectedWorkspace: 'selectedWorkspaceSlug',
  theme: 'theme',
  filtersCollapsed: 'filtersBarCollapsed',
  importantMode: 'importantNotesDisplayMode',
  scrollSync: 'editorScrollSync',
};

export const getItem = async (key) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
};

export const setItem = async (key, value) => {
  try {
    if (value === null || value === undefined) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, String(value));
  } catch {}
};

export const getJSON = async (key) => {
  const raw = await getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setJSON = (key, value) => setItem(key, JSON.stringify(value));

export const removeItems = async (keys) => {
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {}
};
