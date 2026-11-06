import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { shadow } from '../../styles/theme';
import { Button, Input } from '../ui';

export default function SearchBar({ initialValue = '', onSearch }) {
  const { colors } = useTheme();
  const { lg } = useBreakpoint();
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);
  const submit = () => onSearch(value);
  return (
    <View style={[{ backgroundColor: colors.tertiaryBg, paddingVertical: 4, alignItems: 'center' }, shadow(1)]}>
      <View style={{ width: '100%', maxWidth: 1320, paddingHorizontal: 12 }}>
        <View style={{ width: '83.33%', paddingHorizontal: lg ? 48 : 0, flexDirection: 'row' }}>
          <Input value={value} onChangeText={setValue} placeholder="Search notes" onSubmitEditing={submit} returnKeyType="search" style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRadius: 999 }} autoCapitalize="none" />
          <Button variant="outline-secondary" title="🔍" onPress={submit} style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: -1 }} accessibilityLabel="Search" />
        </View>
      </View>
    </View>
  );
}
