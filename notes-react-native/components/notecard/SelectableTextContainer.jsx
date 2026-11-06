import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fonts } from '../../styles/theme';

export default function SelectableTextContainer({ text, selection, onSelectionChange, showPreview = true }) {
  const { colors } = useTheme();
  const hasSelection = selection && selection.end > selection.start;
  const preview = hasSelection ? text.slice(selection.start, selection.end) : '';
  return (
    <View>
      <TextInput
        value={text}
        multiline
        onChangeText={() => {}}
        showSoftInputOnFocus={false}
        caretHidden
        contextMenuHidden={false}
        onSelectionChange={(e) => onSelectionChange(e.nativeEvent.selection)}
        style={[
          {
            fontFamily: fonts.mono,
            fontSize: 14.4,
            lineHeight: 23,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 6,
            maxHeight: 300,
            backgroundColor: colors.tertiaryBg,
            color: colors.text,
            textAlignVertical: 'top',
          },
          Platform.OS === 'web' && { outlineStyle: 'none', minHeight: 120 },
        ]}
      />
      {showPreview && hasSelection ? (
        <View style={{ marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Selected Preview:</Text>
            <Text style={{ color: colors.text }}>
              {preview.slice(0, 100)}
              {preview.length > 100 ? '...' : ''}
            </Text>
          </View>
          <Pressable onPress={() => onSelectionChange({ start: 0, end: 0 })} accessibilityLabel="Clear selection">
            <Text style={{ color: colors.muted }}>✕</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
