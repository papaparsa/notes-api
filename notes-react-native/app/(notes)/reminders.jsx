import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/UIContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { buildQuery, fetchJSON } from '../../lib/api';
import { handleApiError } from '../../lib/errorHandler';
import ScrollPage from '../../components/ScrollPage';
import { Alert, Badge, Button, Card, CardBody, ConfirmModal, H, Select, Spinner, T } from '../../components/ui';

const FREQ_BADGE = { once: 'secondary', daily: 'primary', weekly: 'info', monthly: 'warning' };
const FILTERS = [
  { value: 'all', label: 'All Reminders' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
];

const notePath = (url) => {
  if (!url) return null;
  const m = /\/message\/(\d+)/.exec(url);
  return m ? `/message/${m[1]}` : url;
};

export default function RemindersPage() {
  const { colors } = useTheme();
  const router = useRouter();
  const showToast = useToast();
  const { md, lg } = useBreakpoint();
  const [reminders, setReminders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchJSON(`/api/note/reminders/${buildQuery({ is_active: filter === 'all' ? undefined : filter === 'active' ? 'true' : 'false' })}`);
      setReminders(data || []);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const toggle = async (r) => {
    try {
      await fetchJSON(`/api/note/reminders/${r.id}/`, { method: 'PUT', body: { is_active: !r.is_active } });
      showToast('Success', `Reminder ${r.is_active ? 'deactivated' : 'activated'}`, 3000, 'success');
      load();
    } catch (err) {
      handleApiError(err);
    }
  };

  const remove = async () => {
    const r = deleteTarget;
    setDeleteTarget(null);
    try {
      await fetchJSON(`/api/note/reminders/${r.id}/`, { method: 'DELETE' });
      setReminders((prev) => prev.filter((x) => x.id !== r.id));
      showToast('Success', 'Reminder deleted', 3000, 'success');
    } catch (err) {
      handleApiError(err);
    }
  };

  const colWidth = lg ? '33.333%' : md ? '50%' : '100%';

  return (
    <ScrollPage onRefresh={load} contentContainerStyle={{ padding: 12, paddingTop: 24, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <H level={2} style={{ marginBottom: 0 }}>My Reminders</H>
        <Select value={filter} options={FILTERS} onChange={setFilter} style={{ width: 200 }} />
      </View>
      {loading ? (
        <Spinner />
      ) : !reminders.length ? (
        <Alert variant="info">
          <View>
            <Text style={{ fontWeight: '700', color: '#087990' }}>No reminders found</Text>
            <Text style={{ color: '#087990' }}>You can create reminders from any note's menu using "Create Reminder".</Text>
          </View>
        </Alert>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -12 }}>
          {reminders.map((r) => (
            <View key={r.id} style={{ width: colWidth, paddingHorizontal: 12, marginBottom: 16, opacity: r.is_active ? 1 : 0.75 }}>
              <Card style={{ flex: 1 }}>
                <CardBody>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 4, flexWrap: 'wrap' }}>
                    <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                      <Badge bg={FREQ_BADGE[r.frequency] || 'secondary'}>{r.frequency}</Badge>
                      {r.snoozed_until ? <Badge bg="warning">{`⏰ Snoozed until ${new Date(r.snoozed_until).toLocaleString()}`}</Badge> : null}
                    </View>
                    <Badge bg={r.is_active ? 'success' : 'secondary'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '500', color: colors.text, marginBottom: 8 }}>{r.description || 'No description'}</Text>
                  {r.highlighted_text ? (
                    <T small muted style={{ marginBottom: 8, fontStyle: 'italic' }}>
                      "{r.highlighted_text.slice(0, 100)}
                      {r.highlighted_text.length > 100 ? '...' : ''}"
                    </T>
                  ) : null}
                  <T small>
                    <Text style={{ fontWeight: '700' }}>Scheduled:</Text> {new Date(r.scheduled_time).toLocaleString()}
                  </T>
                  {r.last_sent ? (
                    <T small>
                      <Text style={{ fontWeight: '700' }}>Last sent:</Text> {new Date(r.last_sent).toLocaleString()}
                    </T>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {r.note_url ? <Button size="sm" variant="outline-primary" title="View Note" onPress={() => router.push(notePath(r.note_url))} /> : null}
                    <Button size="sm" variant={r.is_active ? 'outline-warning' : 'outline-success'} title={r.is_active ? 'Deactivate' : 'Activate'} onPress={() => toggle(r)} />
                    <Button size="sm" variant="outline-danger" title="Delete" onPress={() => setDeleteTarget(r)} />
                  </View>
                </CardBody>
              </Card>
            </View>
          ))}
        </View>
      )}
      <ConfirmModal visible={!!deleteTarget} title="Delete Reminder" body="Are you sure you want to delete this reminder?" onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
    </ScrollPage>
  );
}
