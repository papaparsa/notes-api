import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const fromAsset = (a, fallbackName) => ({
  uri: a.uri,
  name: a.name || a.fileName || fallbackName || a.uri.split('/').pop(),
  type: a.mimeType || a.type || 'application/octet-stream',
  blob: a.file || undefined,
  size: a.size || a.fileSize,
});

export async function pickDocuments({ multiple = false } = {}) {
  const result = await DocumentPicker.getDocumentAsync({ multiple, copyToCacheDirectory: true });
  if (result.canceled) return [];
  return result.assets.map((a) => fromAsset(a));
}

export async function pickImages({ multiple = false } = {}) {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: multiple, quality: 1 });
  if (result.canceled) return [];
  return result.assets.map((a, i) => fromAsset(a, `image_${Date.now()}_${i}.${(a.mimeType || 'image/jpeg').split('/')[1]}`));
}

export const fileFromDomFile = (file) => ({ uri: '', name: file.name, type: file.type, blob: file, size: file.size });
