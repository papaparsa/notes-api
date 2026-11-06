import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { fetchJSON } from '../lib/api';
import { formatDateShort } from '../lib/dateFormatters';
import { Card, CardBody, CardHeader, Spinner, T } from './ui';

export default function StatsDisplay({ title, endpoint }) {
  const { colors } = useTheme();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchJSON(endpoint)
      .then((d) => setData(Array.isArray(d) ? d : []))
      .catch(() => setData([]));
  }, [endpoint]);

  const max = Math.max(1, ...(data || []).map((d) => d.count));
  const total = (data || []).reduce((s, d) => s + d.count, 0);

  return (
    <Card style={{ marginBottom: 24 }}>
      <CardHeader style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <T style={{ fontSize: 18 }}>{title} (Last 7 Days)</T>
        <T muted>
          Total {title}: {total}
        </T>
      </CardHeader>
      <CardBody>
        {!data ? (
          <Spinner />
        ) : (
          <View style={{ height: 300, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            {data.map((d) => (
              <View key={d.date} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <Text style={{ color: colors.text, fontSize: 12, marginBottom: 4 }}>{d.count}</Text>
                <View style={{ width: '70%', height: `${(d.count / max) * 80}%`, minHeight: d.count > 0 ? 4 : 0, backgroundColor: colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4, textAlign: 'center' }} numberOfLines={2}>{formatDateShort(d.date)}</Text>
              </View>
            ))}
          </View>
        )}
      </CardBody>
    </Card>
  );
}
