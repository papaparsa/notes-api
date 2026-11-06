import { absoluteUrl } from './api';

export async function downloadCsv(csv, filename) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function openFileUrl(url) {
  window.open(absoluteUrl(url), '_blank', 'noopener,noreferrer');
}
