import { API_URL } from '../config';
import { KEYS, getItem, setItem } from './storage';
import { emit } from './events';

let csrfToken = null;

export const absoluteUrl = (url) => {
  if (!url) return url;
  if (/^(https?:|data:|blob:|file:)/.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const apiUrl = (path) => {
  if (/^https?:\/\//.test(path)) return path;
  const [base, query] = path.split(/\?(.*)/s);
  const withSlash = base.endsWith('/') ? base : `${base}/`;
  return absoluteUrl(withSlash) + (query ? `?${query}` : '');
};

export const buildQuery = (params) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

export async function refreshCsrf() {
  try {
    const response = await fetch(apiUrl('/api/account/csrf/'), { credentials: 'include' });
    const token = response.headers.get('x-csrftoken');
    if (token) {
      csrfToken = token;
      await setItem(KEYS.csrf, token);
    }
  } catch {}
  return csrfToken;
}

export async function getCsrf() {
  if (csrfToken) return csrfToken;
  csrfToken = await getItem(KEYS.csrf);
  if (!csrfToken) await refreshCsrf();
  return csrfToken || '';
}

export const clearCsrf = () => {
  csrfToken = null;
};

const isFormData = (body) => typeof FormData !== 'undefined' && body instanceof FormData;

async function rawFetch(url, options, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const token = await getCsrf();
  const headers = { ...(options.headers || {}), 'X-CSRFToken': token };
  if (options.body && !isFormData(options.body) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    return await fetch(apiUrl(url), {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithAuth(url, options = {}, timeout = 5000) {
  let response = await rawFetch(url, options, timeout);
  if (response.status === 403 && (options.method || 'GET') !== 'GET') {
    const detail = await response.clone().json().catch(() => ({}));
    if (String(detail?.detail || '').toLowerCase().includes('csrf')) {
      await refreshCsrf();
      response = await rawFetch(url, options, timeout);
    }
  }
  if (response.status === 401 || response.status === 403) {
    emit('sessionExpired');
    throw new Error('Session expired');
  }
  return response;
}

export async function fetchJSON(url, options = {}, timeout = 5000) {
  const response = await fetchWithAuth(
    url,
    options.body && typeof options.body !== 'string' && !isFormData(options.body)
      ? { ...options, body: JSON.stringify(options.body) }
      : options,
    timeout,
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err = new Error(data?.error || data?.detail || `Request failed (${response.status})`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function publicFetchJSON(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(apiUrl(url), { signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function uploadFile(file, { kind, compress, noteId } = {}, timeout = 30000) {
  const form = new FormData();
  if (file.blob) form.append('file', file.blob, file.name);
  else form.append('file', { uri: file.uri, name: file.name, type: file.type || 'application/octet-stream' });
  if (compress !== undefined) form.append('compress_image', compress ? 'true' : 'false');
  if (kind) form.append('kind', kind);
  if (noteId) form.append('note_id', String(noteId));
  return fetchJSON('/api/note/upload/', { method: 'POST', body: form }, timeout);
}
