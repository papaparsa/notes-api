import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

const THRESHOLD = 22;
const FLICK_DISTANCE = 10;
const FLICK_VELOCITY = 0.3;
const MAX = 40;
const BUTTON_SIZE = 40;

function ArrowButton({ side, disabled, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityLabel={side === 'left' ? 'Previous page' : 'Next page'}
      style={{
        position: 'absolute',
        top: '50%',
        marginTop: -BUTTON_SIZE / 2,
        [side === 'left' ? 'right' : 'left']: '100%',
        [side === 'left' ? 'marginRight' : 'marginLeft']: -22,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        borderWidth: 1.5,
        borderColor: colors.secondary,
        backgroundColor: colors.bodyBg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.2 : 0.6,
      }}
    >
      <Ionicons name={side === 'left' ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.secondary} />
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
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 && Math.abs(g.dx) > Math.abs(g.dy) && stateRef.current.totalPages > 1,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => offset.setValue(Math.max(-MAX, Math.min(MAX, g.dx)) * 0.5),
      onPanResponderRelease: (_, g) => {
        const { currentPage: page, totalPages: total, onPageChange: change } = stateRef.current;
        const next = g.dx > THRESHOLD || (g.dx > FLICK_DISTANCE && g.vx > FLICK_VELOCITY);
        const prev = g.dx < -THRESHOLD || (g.dx < -FLICK_DISTANCE && g.vx < -FLICK_VELOCITY);
        if (next && page < total) change(page + 1);
        else if (prev && page > 1) change(page - 1);
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
