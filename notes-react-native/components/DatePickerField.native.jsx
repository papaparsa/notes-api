import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { useTheme } from '../contexts/ThemeContext';
import { AppModal, Button } from './ui';

export default function DatePickerField({ value, onChange, mode = 'date', minimumDate, placeholder, style, format }) {
  const { colors, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || new Date());
  const label = value ? moment(value).format(format || (mode === 'time' ? 'HH:mm' : 'MMM D, YYYY')) : placeholder || '';

  const field = (
    <Pressable
      onPress={() => {
        setDraft(value || new Date());
        setOpen(true);
      }}
      style={[{ borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.bodyBg }, style]}
    >
      <Text style={{ color: value ? colors.text : colors.muted }}>{label}</Text>
    </Pressable>
  );

  if (Platform.OS === 'android') {
    return (
      <View>
        {field}
        {open ? (
          <DateTimePicker
            value={draft}
            mode={mode}
            minimumDate={minimumDate}
            onChange={(event, date) => {
              setOpen(false);
              if (event.type === 'set' && date) onChange(date);
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View>
      {field}
      <AppModal
        visible={open}
        onClose={() => setOpen(false)}
        title={mode === 'time' ? 'Pick time' : 'Pick date'}
        centered
        footer={
          <>
            <Button variant="secondary" title="Cancel" onPress={() => setOpen(false)} />
            <Button
              title="Done"
              onPress={() => {
                setOpen(false);
                onChange(draft);
              }}
            />
          </>
        }
      >
        <DateTimePicker value={draft} mode={mode} display={mode === 'date' ? 'inline' : 'spinner'} minimumDate={minimumDate} themeVariant={theme} onChange={(_, date) => date && setDraft(date)} />
      </AppModal>
    </View>
  );
}
