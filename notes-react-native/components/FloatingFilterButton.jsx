import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { shadow } from '../styles/theme';

export default function FloatingFilterButton({ onPress, inline }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Filter by Categories"
      style={[
        { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
        inline ? null : { position: 'absolute', bottom: 16, right: 16, zIndex: 1050 },
        shadow(2),
      ]}
    >
      <Ionicons name="funnel" size={24} color="#fff" />
    </Pressable>
  );
}
