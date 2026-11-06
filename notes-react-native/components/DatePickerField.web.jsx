import moment from 'moment';
import { useTheme } from '../contexts/ThemeContext';

export default function DatePickerField({ value, onChange, mode = 'date', minimumDate, style }) {
  const { colors } = useTheme();
  const fmt = mode === 'time' ? 'HH:mm' : 'YYYY-MM-DD';
  return (
    <input
      type={mode}
      value={value ? moment(value).format(fmt) : ''}
      min={minimumDate && mode === 'date' ? moment(minimumDate).format('YYYY-MM-DD') : undefined}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onChange(null);
        if (mode === 'time') {
          const [h, m] = v.split(':').map(Number);
          const d = new Date(value || Date.now());
          d.setHours(h, m, 0, 0);
          onChange(d);
        } else {
          onChange(moment(v, 'YYYY-MM-DD').toDate());
        }
      }}
      style={{ border: `1px solid ${colors.border}`, borderRadius: 6, padding: '6px 12px', fontSize: 16, color: colors.text, background: colors.bodyBg, colorScheme: 'light dark', ...(style || {}) }}
    />
  );
}
