import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { shadow } from '../../styles/theme';

export default function AuthCard({ children }) {
  const { colors, theme } = useTheme();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme === 'dark' ? colors.pageBg : '#fbfcfe' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }} keyboardShouldPersistTaps="handled">
        <View style={[{ width: '100%', maxWidth: 500, backgroundColor: colors.bodyBg, borderRadius: 6, borderWidth: 1, borderColor: colors.border, padding: 24 }, shadow(1)]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
