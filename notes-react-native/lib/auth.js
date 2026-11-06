import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiUrl, refreshCsrf, getCsrf, clearCsrf } from './api';
import { KEYS, setItem, removeItems } from './storage';

const deviceName = () => {
  const name = Constants.deviceName || (Platform.OS === 'web' ? 'Browser' : 'Device');
  return `${name} (${Platform.OS} app)`;
};

export async function login(username, password) {
  const token = await refreshCsrf();
  const response = await fetch(apiUrl('/api/account/login/'), {
    method: 'POST',
    headers: { 'X-CSRFToken': token || '', 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password, device_name: deviceName() }),
  });
  if (!response.ok) throw new Error('Login failed');
  clearCsrf();
  await refreshCsrf();
  await setItem(KEYS.loggedIn, '1');
  return response.json().catch(() => ({}));
}

export async function signup(username, email, password) {
  const token = await refreshCsrf();
  const response = await fetch(apiUrl('/api/account/signup/'), {
    method: 'POST',
    headers: { 'X-CSRFToken': token || '', 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Signup failed');
  return data;
}

export async function confirmEmail(token) {
  const response = await fetch(apiUrl(`/api/account/confirm-email/${token}/`));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Email confirmation failed');
  return data;
}

export async function logout() {
  try {
    const token = await getCsrf();
    await fetch(apiUrl('/api/account/logout/'), {
      method: 'POST',
      headers: { 'X-CSRFToken': token, 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch {}
  clearCsrf();
  await removeItems([KEYS.loggedIn, KEYS.csrf, KEYS.noteLists, KEYS.workspaces, KEYS.selectedWorkspace]);
}
