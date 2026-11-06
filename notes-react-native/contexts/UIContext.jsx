import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { on } from '../lib/events';
import { useTheme } from './ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { AppModal, Button, T } from '../components/ui';
import { shadow } from '../styles/theme';

const ToastContext = createContext(() => {});
const WaitingContext = createContext({ show: () => {}, hide: () => {} });
const ExternalLinkContext = createContext({ openExternalLink: () => {} });

function ToastView({ toast, onHide }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { lg } = useBreakpoint();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: Platform.OS !== 'web' }).start(onHide);
    }, toast.delay);
    return () => clearTimeout(timer);
  }, [toast]);

  const bgMap = { primary: colors.primary, success: colors.success, danger: colors.danger, warning: colors.warning, info: colors.info, secondary: colors.secondary };
  const bg = bgMap[toast.variant] || colors.primary;
  const fg = ['warning', 'info'].includes(toast.variant) ? '#000' : '#fff';
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        { position: 'absolute', top: insets.top + 16, zIndex: 2000, opacity, width: 350, maxWidth: '92%' },
        lg ? { right: 16 } : { alignSelf: 'center' },
      ]}
    >
      <Pressable onPress={onHide} style={[{ borderRadius: 6, overflow: 'hidden', backgroundColor: bg }, shadow(2)]}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row' }}>
          <Text style={{ fontWeight: '700', color: '#212529', flex: 1 }}>{toast.title}</Text>
          <Text style={{ color: '#6c757d' }}>×</Text>
        </View>
        {toast.body ? <Text style={{ color: fg, padding: 12 }}>{toast.body}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

export function UIProvider({ children }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [externalUrl, setExternalUrl] = useState(null);

  const showToast = useCallback((title, body, delay = 3000, variant = 'primary') => {
    setToast({ title, body, delay, variant, key: Date.now() });
  }, []);

  const show = useCallback((title) => setWaiting(title || 'Please wait'), []);
  const hide = useCallback(() => setWaiting(null), []);

  useEffect(() => {
    const offs = [
      on('showToast', (d) => showToast(d.title, d.body, d.delay, d.variant)),
      on('showWaitingModal', (t) => show(typeof t === 'string' ? t : t?.title)),
      on('hideWaitingModal', hide),
    ];
    return () => offs.forEach((off) => off());
  }, [showToast, show, hide]);

  const openExternalLink = useCallback((url) => setExternalUrl(url), []);

  const proceed = async () => {
    const url = externalUrl;
    setExternalUrl(null);
    if (Platform.OS === 'web') window.open(url, '_blank', 'noopener,noreferrer');
    else await WebBrowser.openBrowserAsync(url);
  };

  return (
    <ToastContext.Provider value={showToast}>
      <WaitingContext.Provider value={{ show, hide }}>
        <ExternalLinkContext.Provider value={{ openExternalLink }}>
          <View style={{ flex: 1 }}>
            {children}
            {toast ? <ToastView key={toast.key} toast={toast} onHide={() => setToast(null)} /> : null}
          </View>
          <Modal visible={!!waiting} transparent animationType="fade">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' }]}>
              <View style={{ backgroundColor: colors.bodyBg, borderRadius: 8, width: 320, maxWidth: '90%' }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 20, fontWeight: '500', color: colors.text }}>{waiting}</Text>
                </View>
                <View style={{ minHeight: 200, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color={colors.primary} style={{ transform: [{ scale: 2.5 }] }} />
                </View>
              </View>
            </View>
          </Modal>
          <AppModal
            visible={!!externalUrl}
            onClose={() => setExternalUrl(null)}
            title="External Link"
            centered
            footer={
              <>
                <Button variant="secondary" title="Cancel" onPress={() => setExternalUrl(null)} />
                <Button title="Continue" onPress={proceed} />
              </>
            }
          >
            <T>You are about to leave this site and visit:</T>
            <View style={{ backgroundColor: colors.secondaryBg, padding: 8, borderRadius: 6, marginVertical: 8 }}>
              <Text selectable style={{ color: colors.primary, fontSize: 14 }}>{externalUrl}</Text>
            </View>
            <T muted small>Make sure you trust this link before proceeding.</T>
          </AppModal>
        </ExternalLinkContext.Provider>
      </WaitingContext.Provider>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
export const useWaiting = () => useContext(WaitingContext);
export const useExternalLink = () => useContext(ExternalLinkContext);
