import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

function PageItem({ label, onPress, active, disabled, first, last }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || active || !onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? colors.primary : colors.bodyBg,
        marginLeft: first ? 0 : -1,
        borderTopLeftRadius: first ? 6 : 0,
        borderBottomLeftRadius: first ? 6 : 0,
        borderTopRightRadius: last ? 6 : 0,
        borderBottomRightRadius: last ? 6 : 0,
      }}
    >
      <Text style={{ color: active ? '#fff' : disabled ? colors.muted : colors.primary }}>{label}</Text>
    </Pressable>
  );
}

export default function PaginationComponent({ currentPage, totalCount, perPage = 20, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / perPage));
  if (totalPages <= 1) return null;
  const start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, currentPage + 1);
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <PageItem first label="First" disabled={currentPage === 1} onPress={() => onPageChange(1)} />
      {start > 1 ? <PageItem label="…" /> : null}
      {pages.map((p) => (
        <PageItem key={p} label={String(p)} active={p === currentPage} onPress={() => onPageChange(p)} />
      ))}
      {end < totalPages ? <PageItem label="…" /> : null}
      <PageItem last label="Last" disabled={currentPage === totalPages} onPress={() => onPageChange(totalPages)} />
    </View>
  );
}
