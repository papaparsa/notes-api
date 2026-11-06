import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AppProvider, useApp } from '../contexts/AppContext';
import { UIProvider } from '../contexts/UIContext';
import PythonRuntimeHost from '../components/PythonRuntimeHost';
import { Spinner } from '../components/ui';

function AuthGate() {
  const { isAuthenticated } = useApp();
  const { colors, theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === null) return;
    const inAuth = segments[0] === '(auth)';
    const isPublic = segments[0] === 'pp';
    if (!isAuthenticated && !inAuth && !isPublic) router.replace('/login');
    else if (isAuthenticated && inAuth) router.replace('/');
  }, [isAuthenticated, segments]);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pageBg }}>
        <Spinner />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.pageBg } }} />
      <PythonRuntimeHost />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Vazir: require('../assets/fonts/Vazirmatn-Light.ttf') });
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppProvider>
            <UIProvider>
              <AuthGate />
            </UIProvider>
          </AppProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
