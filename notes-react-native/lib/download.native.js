import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { absoluteUrl } from './api';

export async function downloadCsv(csv, filename) {
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, '﻿' + csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
}

export async function openFileUrl(url) {
  await WebBrowser.openBrowserAsync(absoluteUrl(url));
}
