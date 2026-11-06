import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { buildQuery, fetchJSON } from '../lib/api';
import { formatLocale } from '../lib/dateFormatters';
import { Alert, Badge, Button, H, Input, ListItem, Select, Spinner, T } from './ui';

const IP_RX = /^\d{1,3}(\.\d{1,3}){0,3}$|^[0-9a-f:]+$/i;
const LIMITS = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));

export default function FileAccessStats() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [view, setView] = useState({ type: 'overview' });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});

  const load = useCallback(async () => {
    setError(null);
    setData(null);
    const params = { limit, ip: view.type === 'ip' ? view.value : undefined, file: view.type === 'file' ? view.value : undefined };
    try {
      setData(await fetchJSON(`/api/note/stats/access/${buildQuery(params)}`, {}, 15000));
    } catch (err) {
      setError(err.message);
    }
  }, [limit, view]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  const submit = () => {
    const v = search.trim();
    if (!v) return setView({ type: 'overview' });
    setView(IP_RX.test(v) && /[.:]/.test(v) ? { type: 'ip', value: v } : { type: 'file', value: v });
  };

  const reset = () => {
    setSearch('');
    setView({ type: 'overview' });
  };

  return (
    <View style={{ marginTop: 8 }}>
      <H level={4}>File Access Statistics</H>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input value={search} onChangeText={setSearch} placeholder="Search by IP or filename" style={{ flex: 1, minWidth: 180 }} onSubmitEditing={submit} autoCapitalize="none" />
        <Select value={limit} options={LIMITS} onChange={setLimit} style={{ width: 90 }} />
        <Button title="Search" onPress={submit} />
        <Button variant="outline-secondary" title="Reset" onPress={reset} />
      </View>
      {view.type !== 'overview' ? <Button size="sm" variant="link" title="← Back to Overview" onPress={reset} style={{ marginBottom: 8 }} /> : null}
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {!data && !error ? <Spinner /> : null}
      {data && view.type === 'overview'
        ? (data.recent_accesses || []).map((entry, i, arr) => (
            <ListItem key={entry.ip} first={i === 0} last={i === arr.length - 1} style={{ padding: 0 }}>
              <Pressable onPress={() => setOpen((o) => ({ ...o, [entry.ip]: !o[entry.ip] }))} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                <Text style={{ color: colors.text, fontWeight: '500' }}>{entry.ip}</Text>
                <Badge bg="primary" pill>{`${entry.files.length} file(s)`}</Badge>
              </Pressable>
              {open[entry.ip] ? (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Button size="sm" variant="outline-primary" title="View All Files Accessed" onPress={() => setView({ type: 'ip', value: entry.ip })} style={{ marginBottom: 8 }} />
                  {entry.files.map((f, j) => (
                    <Pressable key={j} onPress={() => setView({ type: 'file', value: f.path })} style={{ paddingVertical: 4 }}>
                      <Text style={{ color: colors.primary, fontSize: 14 }}>{f.path}</Text>
                      <T small muted>{formatLocale(f.timestamp)}</T>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </ListItem>
          ))
        : null}
      {data && view.type === 'ip' ? (
        <View>
          <T bold style={{ marginBottom: 8 }}>Files accessed by {data.ip || view.value}</T>
          {(data.accessed_files || []).map((f, i, arr) => (
            <ListItem key={i} first={i === 0} last={i === arr.length - 1} onPress={() => setView({ type: 'file', value: f.file_path })}>
              <Text style={{ color: colors.primary }}>{f.file_path}</Text>
              <T small muted>{formatLocale(f.last_access)}</T>
            </ListItem>
          ))}
        </View>
      ) : null}
      {data && view.type === 'file' ? (
        <View>
          <T bold style={{ marginBottom: 8 }}>IPs that accessed {data.file_path || view.value}</T>
          {(data.accessing_ips || []).map((ip, i, arr) => (
            <ListItem key={i} first={i === 0} last={i === arr.length - 1} onPress={() => setView({ type: 'ip', value: ip.ip })}>
              <Text style={{ color: colors.primary }}>{ip.ip}</Text>
              <T small muted>{formatLocale(ip.last_access)}</T>
            </ListItem>
          ))}
        </View>
      ) : null}
    </View>
  );
}
