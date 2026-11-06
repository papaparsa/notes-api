import { useRef } from 'react';
import { Modal, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { EXCALIDRAW_HTML } from '../../lib/excalidrawHtml';
import { Button, Spinner, T } from '../ui';

export default function ExcalidrawEditor({ visible, initialData, loading, saving, onCancel, onSaved, onError }) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const ref = useRef(null);

  const onMessage = (e) => {
    let msg;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'ready') ref.current?.injectJavaScript(`window.__init(${JSON.stringify({ initialData, theme })}); true;`);
    if (msg.type === 'saved') onSaved({ pngBase64: msg.png, scene: msg.scene });
    if (msg.type === 'error') onError?.(msg.message);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: colors.bodyBg, paddingTop: insets.top }}>
        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <T style={{ fontSize: 20 }}>Draw</T>
        </View>
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Spinner />
            </View>
          ) : visible ? (
            <WebView ref={ref} originWhitelist={['*']} source={{ html: EXCALIDRAW_HTML, baseUrl: 'https://unpkg.com/' }} onMessage={onMessage} javaScriptEnabled domStorageEnabled />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12, paddingBottom: 12 + insets.bottom, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button variant="secondary" title="Cancel" onPress={onCancel} disabled={saving} />
          <Button title={saving ? 'Saving...' : 'Save Drawing'} disabled={saving || loading} onPress={() => ref.current?.injectJavaScript('window.__save(); true;')} />
        </View>
      </View>
    </Modal>
  );
}
