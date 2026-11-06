import { useState } from 'react';
import { View } from 'react-native';
import moment from 'moment';
import { useToast } from '../../contexts/UIContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { fetchJSON } from '../../lib/api';
import DatePickerField from '../DatePickerField';
import { AppModal, Button, Field, Input, Select, T } from '../ui';
import SelectableTextContainer from './SelectableTextContainer';

const FREQUENCIES = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const presets = () => {
  const now = moment();
  return [
    { label: 'In 1 h', value: now.clone().add(1, 'hour') },
    { label: 'Tonight 8 pm', value: now.clone().hour(20).minute(0).second(0) },
    { label: 'Tomorrow 9 am', value: now.clone().add(1, 'day').hour(9).minute(0).second(0) },
    { label: 'Next Mon', value: now.clone().add(1, 'week').isoWeekday(1).hour(9).minute(0).second(0) },
  ];
};

export default function ReminderModal({ visible, onClose, note }) {
  const showToast = useToast();
  const { md } = useBreakpoint();
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [frequency, setFrequency] = useState('once');
  const [submitting, setSubmitting] = useState(false);

  const combined = date && time ? moment(date).hour(moment(time).hour()).minute(moment(time).minute()).second(0) : null;

  const applyPreset = (m) => {
    setDate(m.toDate());
    setTime(m.toDate());
  };

  const reset = () => {
    setSelection({ start: 0, end: 0 });
    setDescription('');
    setDate(null);
    setTime(null);
    setFrequency('once');
  };

  const submit = async () => {
    if (!combined) return;
    setSubmitting(true);
    const hasSel = selection.end > selection.start;
    try {
      await fetchJSON('/api/note/reminders/', {
        method: 'POST',
        body: {
          note: note.id,
          description,
          scheduled_time: combined.format('YYYY-MM-DDTHH:mm'),
          frequency,
          highlight_start: hasSel ? selection.start : null,
          highlight_end: hasSel ? selection.end : null,
          is_active: true,
        },
      });
      showToast('Success', 'Reminder created successfully', 3000, 'success');
      reset();
      onClose();
    } catch (err) {
      const data = err.data && typeof err.data === 'object' ? err.data : null;
      const msg = data ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : err.message;
      showToast('Error', msg, 5000, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Create Reminder"
      size="lg"
      footer={
        <>
          <Button variant="secondary" title="Cancel" onPress={onClose} />
          <Button title={submitting ? 'Creating…' : 'Create Reminder'} onPress={submit} disabled={submitting || !combined} />
        </>
      }
    >
      <Field label="Select text to highlight (optional)" help="Tap and drag to select the part of the note you want to be reminded about.">
        <SelectableTextContainer text={note?.text || ''} selection={selection} onSelectionChange={setSelection} />
      </Field>
      <Field label="Description (Optional)">
        <Input multiline rows={2} placeholder="Add a description..." value={description} onChangeText={setDescription} />
      </Field>
      <View style={{ flexDirection: md ? 'row' : 'column', gap: 16 }}>
        <View style={{ flex: md ? 2 : undefined }}>
          <Field label="When">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {presets().map((p) => (
                <Button key={p.label} size="sm" variant="outline-secondary" title={p.label} active={combined && combined.isSame(p.value, 'minute')} onPress={() => applyPreset(p.value)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <DatePickerField value={date} onChange={setDate} mode="date" minimumDate={new Date()} placeholder="Pick date…" style={{ minWidth: 150 }} />
              <DatePickerField value={time} onChange={setTime} mode="time" placeholder="--:--" style={{ width: 120 }} />
            </View>
          </Field>
        </View>
        <View style={{ flex: md ? 1 : undefined }}>
          <Field label="Frequency">
            <Select value={frequency} options={FREQUENCIES} onChange={setFrequency} />
          </Field>
        </View>
      </View>
      {combined ? <T muted>Reminder set for {combined.format('dddd, MMMM D [at] h:mm A')}</T> : null}
    </AppModal>
  );
}
