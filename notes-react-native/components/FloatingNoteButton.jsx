import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, Text } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { shadow } from '../styles/theme';

export default function FloatingNoteButton({ onPress, inline, pulse }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const green = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    const native = Platform.OS !== 'web';
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.05, duration: 300, useNativeDriver: native }),
        Animated.timing(green, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: native }),
        Animated.timing(green, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]),
    ]).start();
  }, [pulse]);

  const bg = green.interpolate({ inputRange: [0, 1], outputRange: [colors.primary, colors.success] });

  return (
    <Animated.View style={[inline ? null : { position: 'absolute', bottom: 20, right: 20, zIndex: 1050 }, { transform: [{ scale }] }]}>
      <Animated.View style={[{ borderRadius: 50, backgroundColor: bg }, shadow(2)]}>
        <Pressable onPress={onPress} accessibilityLabel="New note" style={{ paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 32, lineHeight: 34, fontWeight: '500' }}>+</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
