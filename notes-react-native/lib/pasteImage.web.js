import { fileTimestamp } from './stringUtils';

export async function readClipboardImage() {
  if (!navigator.clipboard?.read) return null;
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) {
      const blob = await item.getType(type);
      return { blob, name: `pasted_image_${fileTimestamp()}.png`, type };
    }
  }
  return null;
}

export const base64ToUploadFile = async (base64, name, type) => {
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { blob: new Blob([arr], { type }), name, type };
};

export const textToUploadFile = async (text, name, type) => ({ blob: new Blob([text], { type }), name, type });
