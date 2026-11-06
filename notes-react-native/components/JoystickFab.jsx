import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const THRESHOLD = 50;
const MAX = 60;

function ArrowButton({ side, disabled, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={side === 'left' ? 'Previous page' : 'Next page'}
      style={{
        position: 'absolute',
        top: '50%',
        marginTop: -15,
        [side === 'left' ? 'right' : 'left']: '100%',
        [side === 'left' ? 'marginRight' : 'marginLeft']: -22,
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: colors.secondary,
        backgroundColor: colors.bodyBg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.2 : 0.6,
      }}
    >
      <Ionicons name={side === 'left' ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.secondary} />
    </Pressable>
  );
}

export default function JoystickFab({ currentPage, totalPages, onPageChange, children }) {
  const { lg, xl } = useBreakpoint();
  const { colors } = useTheme();
  const offset = useRef(new Animated.Value(0)).current;
  const [flash, setFlash] = useState(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const firstRender = useRef(true);
  const stateRef = useRef({ currentPage, totalPages, onPageChange });
  stateRef.current = { currentPage, totalPages, onPageChange };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (xl) return;
    setFlash(currentPage);
    flashAnim.setValue(0);
    Animated.timing(flashAnim, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start();
    const timer = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(timer);
  }, [currentPage]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && stateRef.current.totalPages > 1,
      onPanResponderMove: (_, g) => offset.setValue(Math.max(-MAX, Math.min(MAX, g.dx)) * 0.3),
      onPanResponderRelease: (_, g) => {
        const { currentPage: page, totalPages: total, onPageChange: change } = stateRef.current;
        if (g.dx > THRESHOLD && page < total) change(page + 1);
        else if (g.dx < -THRESHOLD && page > 1) change(page - 1);
        Animated.spring(offset, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start();
      },
      onPanResponderTerminate: () => Animated.spring(offset, { toValue: 0, useNativeDriver: Platform.OS !== 'web' }).start(),
    }),
  ).current;

  if (lg) return null;
  const multi = totalPages > 1;

  return (
    <>
      <View style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1050 }}>
        {multi ? <ArrowButton side="left" disabled={currentPage <= 1} onPress={() => onPageChange(currentPage - 1)} /> : null}
        {multi ? <ArrowButton side="right" disabled={currentPage >= totalPages} onPress={() => onPageChange(currentPage + 1)} /> : null}
        <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: offset }] }}>
          {children}
        </Animated.View>
      </View>
      {flash !== null ? (
        <Modal transparent visible animationType="none">
          <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.Text
              style={{
                fontSize: 64,
                fontWeight: '800',
                color: colors.text,
                opacity: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
                transform: [{ scale: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              }}
            >
              {flash}
            </Animated.Text>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
