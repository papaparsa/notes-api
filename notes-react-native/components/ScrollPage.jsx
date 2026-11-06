import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const ScrollPage = forwardRef(function ScrollPage({ children, contentContainerStyle, onRefresh, refreshing = false, onScroll, overlay, ...props }, ref) {
  const { colors } = useTheme();
  const scrollRef = useRef(null);
  const [showTop, setShowTop] = useState(false);

  useImperativeHandle(ref, () => ({
    scrollTo: (opts) => scrollRef.current?.scrollTo(opts),
    scrollToTop: () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    getNode: () => scrollRef.current,
  }));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={64}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          setShowTop(y > 300);
          onScroll?.(e);
        }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        contentContainerStyle={[{ paddingBottom: 120 }, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
      {overlay}
      {showTop ? (
        <Pressable
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          accessibilityLabel="Back to top"
          style={{ position: 'absolute', bottom: 88, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, opacity: 0.85, alignItems: 'center', justifyContent: 'center', zIndex: 1040 }}
        >
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
});

export default ScrollPage;
