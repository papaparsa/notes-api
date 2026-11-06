import { useEffect, useRef } from 'react';
import { Modal, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { EXCALIDRAW_HTML } from '../../lib/excalidrawHtml';
import { Button, Spinner, T } from '../ui';

export default function ExcalidrawEditor({ visible, initialData, loading, saving, onCancel, onSaved, onError }) {
  const { colors, theme } = useTheme();
  const frameRef = useRef(null);
  const propsRef = useRef({ initialData, theme, onSaved, onError });
  propsRef.current = { initialData, theme, onSaved, onError };

  useEffect(() => {
    if (!visible) return;
    const handler = (event) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const p = propsRef.current;
      if (msg.type === 'ready') frameRef.current.contentWindow.postMessage(JSON.stringify({ cmd: 'init', payload: { initialData: p.initialData, theme: p.theme } }), '*');
      if (msg.type === 'saved') p.onSaved({ pngBase64: msg.png, scene: msg.scene });
      if (msg.type === 'error') p.onError?.(msg.message);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: colors.bodyBg }}>
        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <T style={{ fontSize: 20 }}>Draw</T>
        </View>
        <View style={{ flex: 1, minHeight: '80vh' }}>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Spinner />
            </View>
          ) : visible ? (
            <iframe ref={frameRef} title="Draw" srcDoc={EXCALIDRAW_HTML} style={{ border: 0, width: '100%', height: '100%', flex: 1 }} sandbox="allow-scripts allow-same-origin allow-popups allow-downloads" />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button variant="secondary" title="Cancel" onPress={onCancel} disabled={saving} />
          <Button title={saving ? 'Saving...' : 'Save Drawing'} disabled={saving || loading} onPress={() => frameRef.current?.contentWindow?.postMessage(JSON.stringify({ cmd: 'save' }), '*')} />
        </View>
      </View>
    </Modal>
  );
}
