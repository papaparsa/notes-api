import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { fetchJSON } from '../../../lib/api';
import { formatDateSmall } from '../../../lib/dateFormatters';
import ScrollPage from '../../../components/ScrollPage';
import { Alert, Button, ConfirmModal, H, ListItem, Spinner } from '../../../components/ui';

export default function SessionsPage() {
  const { colors } = useTheme();
  const { md } = useBreakpoint();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);
  const [target, setTarget] = useState(null);

  const load = async () => {
    try {
      const data = await fetchJSON('/api/account/sessions/');
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.message);
      setSessions([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async () => {
    const key = target;
    setTarget(null);
    try {
      await fetchJSON(`/api/account/sessions/${key}/`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.session_key !== key));
    } catch (err) {
      setError(err.message);
    }
  };

  const row = (label, value) => (
    <Text style={{ color: colors.text, marginBottom: 2 }}>
      <Text style={{ fontWeight: '700' }}>{label}:</Text> {value}
    </Text>
  );

  return (
    <ScrollPage onRefresh={load} contentContainerStyle={{ padding: 12, paddingTop: 24, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
      <H level={2} style={{ marginBottom: 24 }}>Active Sessions</H>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {!sessions ? <Spinner /> : null}
      {sessions?.map((s, i) => (
        <ListItem key={s.session_key} first={i === 0} last={i === sessions.length - 1} style={{ flexDirection: md ? 'row' : 'column', alignItems: md ? 'center' : 'stretch', gap: 8 }}>
          <View style={{ flex: md ? 2 : undefined }}>
            {row('Device', s.device_name)}
            {row('IP', s.ip_address)}
            {row('User Agent', s.user_agent)}
            {row('Created At', formatDateSmall(s.created_at))}
            {row('Last Activity', formatDateSmall(s.last_activity))}
          </View>
          <View style={{ flex: md ? 1 : undefined, alignItems: md ? 'flex-end' : 'flex-start' }}>
            <Button variant="danger" title="Delete" onPress={() => setTarget(s.session_key)} />
          </View>
        </ListItem>
      ))}
      <ConfirmModal visible={!!target} title="Delete Session" body="This will log out that device. Continue?" onCancel={() => setTarget(null)} onConfirm={remove} />
    </ScrollPage>
  );
}
