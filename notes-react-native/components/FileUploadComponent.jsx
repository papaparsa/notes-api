import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { uploadFile } from '../lib/api';
import { pickDocuments, pickImages, fileFromDomFile } from '../lib/pickFiles';
import { readClipboardImage } from '../lib/pasteImage';
import { AppModal, Button, Checkbox, T } from './ui';

export default function FileUploadComponent({ onSuccess, onFileUploaded, noteId, buttonStyle, size = 'sm' }) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const [file, setFile] = useState(null);
  const [compress, setCompress] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [dragging, setDragging] = useState(false);
  const zoneRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !show) return;
    const node = zoneRef.current;
    if (!node?.addEventListener) return;
    const over = (e) => {
      e.preventDefault();
      setDragging(true);
    };
    const leave = () => setDragging(false);
    const drop = (e) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) setFile(fileFromDomFile(f));
    };
    const paste = (e) => {
      const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
      const f = item?.getAsFile();
      if (f) setFile(fileFromDomFile(f));
    };
    node.addEventListener('dragover', over);
    node.addEventListener('dragleave', leave);
    node.addEventListener('drop', drop);
    window.addEventListener('paste', paste);
    return () => {
      node.removeEventListener('dragover', over);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
      window.removeEventListener('paste', paste);
    };
  }, [show, zoneRef.current]);

  const flash = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 3000);
  };

  const choose = async (picker) => {
    const files = await picker();
    if (files[0]) setFile(files[0]);
  };

  const pasteImage = async () => {
    const img = await readClipboardImage().catch(() => null);
    if (img) setFile(img);
    else flash('No image in clipboard');
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('Uploading...');
    try {
      const data = await uploadFile(file, { compress, noteId });
      flash('Upload complete!');
      if (onSuccess) onSuccess(data);
      else onFileUploaded?.(data.url);
      setFile(null);
      setShow(false);
    } catch {
      flash('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Button size={size} variant="outline-secondary" icon="attach" onPress={() => setShow(true)} accessibilityLabel="Upload file" style={buttonStyle} />
      {status && !show ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {uploading ? <ActivityIndicator size="small" /> : null}
          <Text style={{ color: colors.muted, fontSize: 13 }}>{status}</Text>
        </View>
      ) : null}
      <AppModal
        visible={show}
        onClose={() => setShow(false)}
        title="Upload File"
        size="lg"
        footer={
          <>
            <Button title={uploading ? 'Uploading...' : 'Upload'} onPress={upload} disabled={!file || uploading} />
            <Button variant="secondary" title="Close" onPress={() => setShow(false)} />
          </>
        }
      >
        <Pressable
          ref={zoneRef}
          onPress={() => choose(() => pickDocuments())}
          style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: dragging ? colors.primary : '#ccc', borderRadius: 5, padding: 20, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Ionicons name="cloud-upload-outline" size={36} color={colors.muted} />
          <T style={{ textAlign: 'center' }}>{Platform.OS === 'web' ? 'Drag and drop your file here or click to select a file' : 'Tap to select a file'}</T>
          <T muted small style={{ textAlign: 'center' }}>You can also paste an image from your clipboard</T>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {Platform.OS !== 'web' ? <Button size="sm" variant="outline-primary" icon="images-outline" title="Photo Library" onPress={() => choose(() => pickImages())} /> : null}
          <Button size="sm" variant="outline-primary" icon="clipboard-outline" title="Paste Image" onPress={pasteImage} />
        </View>
        {file ? <T style={{ marginTop: 12 }}>Selected file: {file.name.replace(/\.[^.]+$/, '')}</T> : null}
        <Checkbox checked={compress} onChange={setCompress} label="Compress Image" style={{ marginTop: 12 }} />
        {status ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
            {uploading ? <ActivityIndicator size="small" /> : null}
            <Text style={{ color: colors.muted }}>{status}</Text>
          </View>
        ) : null}
      </AppModal>
    </>
  );
}
