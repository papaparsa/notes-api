const rawUrl = (process.env.EXPO_PUBLIC_API_URL || 'https://notes.astute-cat.shop').trim().replace(/\/+$/, '');

export const API_URL = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`;
