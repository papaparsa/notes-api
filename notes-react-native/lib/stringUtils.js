const rtlRx = /[؀-ۿ]/;

export const isRTL = (text) => rtlRx.test(text || '');

export function extractMarkdownTitle(text) {
  if (!text) return 'related';
  const lines = text.split('\n').filter((line) => line.trim());
  const headerMatch = (lines[0] || '').match(/^#{1,6}\s+(.+)$/);
  return headerMatch ? headerMatch[1].trim() : 'related';
}

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const fileTimestamp = () =>
  new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const removeFileFromText = (text, src) => {
  const esc = escapeRegExp(src);
  return text
    .replace(new RegExp(`!\\[[^\\]]*\\]\\(${esc}\\)\\n?`, 'g'), '')
    .replace(new RegExp(`\\[[^\\]]*\\]\\(${esc}\\)\\n?`, 'g'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
};

export const isExternalLink = (href) => {
  if (!href) return false;
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) return false;
  return /^https?:\/\//i.test(href) || /^[a-z]+:/i.test(href);
};

export const safeUrlEncode = (url) => {
  if (!/^https?:\/\//i.test(url || '')) return url;
  return url.replace(/ /g, '%20');
};

export const isImageFile = (name = '', contentType = '') =>
  contentType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

export const fileIcon = (name = '', contentType = '') => {
  if (isImageFile(name, contentType)) return '🖼️';
  if (/pdf/.test(contentType) || /\.pdf$/i.test(name)) return '📕';
  if (/video/.test(contentType)) return '🎬';
  if (/audio/.test(contentType)) return '🎵';
  if (/zip|compressed|tar/.test(contentType)) return '🗜️';
  if (/sheet|excel|csv/.test(contentType) || /\.(csv|xlsx?|tsv)$/i.test(name)) return '📊';
  if (/json/.test(contentType) || /\.json$/i.test(name)) return '🧾';
  return '📄';
};
