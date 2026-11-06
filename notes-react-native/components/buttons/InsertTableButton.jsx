import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Popover, useAnchor } from '../ui';

const ROWS = 6;
const COLS = 8;

export default function InsertTableButton({ onInsert, size = 'sm' }) {
  const { colors } = useTheme();
  const a = useAnchor();
  const [hover, setHover] = useState(null);

  const pick = (r, c) => {
    a.close();
    setHover(null);
    onInsert(Math.max(1, r - 1), c);
  };

  return (
    <>
      <View ref={a.ref} collapsable={false}>
        <Button size={size} variant="outline-secondary" title="▦" onPress={a.open} accessibilityLabel="Insert Table" />
      </View>
      <Popover visible={a.visible} anchor={a.anchor} onClose={a.close} width={COLS * 22 + 24}>
        <View style={{ paddingHorizontal: 12 }}>
          {Array.from({ length: ROWS }, (_, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {Array.from({ length: COLS }, (_, c) => {
                const on = hover && r < hover.r && c < hover.c;
                return (
                  <Pressable
                    key={c}
                    accessibilityLabel={`${c + 1} × ${r + 1}`}
                    onHoverIn={() => setHover({ r: r + 1, c: c + 1 })}
                    onPressIn={() => setHover({ r: r + 1, c: c + 1 })}
                    onPress={() => pick(r + 1, c + 1)}
                    style={{ width: 18, height: 18, margin: 2, borderWidth: 1, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : colors.bodyBg }}
                  />
                );
              })}
            </View>
          ))}
          <Text style={{ textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 4 }}>{hover ? `${hover.c} × ${hover.r}` : 'Insert table'}</Text>
        </View>
      </Popover>
    </>
  );
}
