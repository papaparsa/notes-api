import * as Clipboard from 'expo-clipboard';

export const copyText = async (text) => {
  await Clipboard.setStringAsync(text ?? '');
  return true;
};

export const readText = () => Clipboard.getStringAsync();
