import { Stack } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';

export default function SettingsLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.pageBg } }} />;
}
