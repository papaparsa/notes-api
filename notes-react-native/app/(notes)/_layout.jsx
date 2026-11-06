import { View } from 'react-native';
import { Stack } from 'expo-router';
import TopNavbar from '../../components/TopNavbar';
import { useTheme } from '../../contexts/ThemeContext';

export default function NotesLayout() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <TopNavbar />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.pageBg }, animation: 'fade' }} />
    </View>
  );
}
