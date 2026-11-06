import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { on } from '../lib/events';
import { WEBVIEW_HTML } from '../lib/pythonSource';
import { handlePythonMessage, registerPythonHost, unregisterPythonHost } from '../lib/pythonRuntime';

export default function PythonRuntimeHost() {
  const [mounted, setMounted] = useState(false);
  const [generation, setGeneration] = useState(0);
  const ref = useRef(null);

  useEffect(() => on('pythonHostMount', () => setMounted(true)), []);

  useEffect(() => {
    if (!mounted) return;
    registerPythonHost({
      inject: (js) => ref.current?.injectJavaScript(js),
      reload: () => setGeneration((g) => g + 1),
    });
    return unregisterPythonHost;
  }, [mounted]);

  if (!mounted) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: -10, top: -10 }}>
      <WebView
        key={generation}
        ref={ref}
        originWhitelist={['*']}
        source={{ html: WEBVIEW_HTML, baseUrl: 'https://cdn.jsdelivr.net/' }}
        onMessage={(e) => handlePythonMessage(e.nativeEvent.data)}
        javaScriptEnabled
      />
    </View>
  );
}
