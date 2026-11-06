import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { fileTimestamp } from './stringUtils';

export async function readClipboardImage() {
  if (!(await Clipboard.hasImageAsync())) return null;
  const image = await Clipboard.getImageAsync({ format: 'png' });
  if (!image?.data) return null;
  const base64 = image.data.split(',')[1] || image.data;
  const name = `pasted_image_${fileTimestamp()}.png`;
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return { uri, name, type: 'image/png' };
}

export const base64ToUploadFile = async (base64, name, type) => {
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return { uri, name, type };
};

export const textToUploadFile = async (text, name, type) => {
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
  return { uri, name, type };
};
