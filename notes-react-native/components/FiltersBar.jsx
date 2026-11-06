import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { KEYS, getItem, setItem } from '../lib/storage';
import CategorySelector from './CategorySelector';
import DatePickerField from './DatePickerField';
import TrendingHashtags from './TrendingHashtags';
import { Checkbox, T } from './ui';

export default function FiltersBar({ category, onCategoryChange, showHidden, onShowHiddenChange, date, onDateChange }) {
  const { colors } = useTheme();
  const { lg } = useBreakpoint();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    getItem(KEYS.filtersCollapsed).then((v) => setCollapsed(v !== 'false'));
  }, []);

  const toggle = () => {
    setCollapsed((v) => {
      setItem(KEYS.filtersCollapsed, String(!v));
      return !v;
    });
  };

  const content = (
    <View>
      <CategorySelector value={category} onChange={onCategoryChange} />
      <Checkbox checked={showHidden} onChange={onShowHiddenChange} label="Show Hidden" style={{ marginVertical: 8 }} />
      <T small style={{ marginBottom: 4 }}>Show messages for</T>
      <DatePickerField value={date} onChange={onDateChange} mode="date" placeholder="yyyy-mm-dd" format="YYYY-MM-DD" />
      <TrendingHashtags />
    </View>
  );

  if (lg) return content;

  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable onPress={toggle} style={{ padding: 12, borderRadius: 8, backgroundColor: colors.tertiaryBg, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', letterSpacing: 0.5, color: colors.text }}>FILTERS</Text>
        <Text style={{ color: colors.muted, transform: [{ rotate: collapsed ? '-90deg' : '0deg' }] }}>▼</Text>
      </Pressable>
      {!collapsed ? <View style={{ paddingTop: 12 }}>{content}</View> : null}
    </View>
  );
}
