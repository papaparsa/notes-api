import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { getItem, setItem } from '../../lib/storage';
import { useTheme } from '../../contexts/ThemeContext';

export default function YouTubeLink({ url, shouldLoadLinks, onOpen }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shouldLoadLinks) return;
    let alive = true;
    (async () => {
      const cached = await getItem(url);
      if (cached) {
        alive && setTitle(cached);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`https://youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        const data = await res.json();
        if (data?.title) {
          setItem(url, data.title);
          alive && setTitle(data.title);
        }
      } catch {}
      alive && setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [url, shouldLoadLinks]);

  const short = title && title.length > 50 ? `${title.slice(0, 50)}...` : title;
  return (
    <Text>
      <Text onPress={onOpen} style={{ color: colors.primary, textDecorationLine: 'underline' }}>{url}</Text>
      {loading ? <ActivityIndicator size="small" /> : null}
      {short ? (
        <Text onPress={onOpen} style={{ backgroundColor: colors.secondaryBg }}>
          {'  '}
          <Text style={{ color: 'red', fontSize: 12 }}>▶ </Text>
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{short} </Text>
        </Text>
      ) : null}
    </Text>
  );
}
