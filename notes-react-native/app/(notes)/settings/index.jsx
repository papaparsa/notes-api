import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { fetchWithAuth } from '../../../lib/api';
import ScrollPage from '../../../components/ScrollPage';
import { Alert, Button, ButtonGroup, Card, CardBody, CardHeader, Field, H, Input, Radio, T } from '../../../components/ui';

function SettingsCard({ title, children }) {
  const { md } = useBreakpoint();
  return (
    <Card style={{ marginBottom: 24, flex: md ? 1 : undefined }}>
      <CardHeader>
        <T style={{ fontSize: 18 }}>{title}</T>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function HelpLink({ text, url, label }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
      {text}{' '}
      <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(url)}>
        {label}
      </Text>
    </Text>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { md } = useBreakpoint();
  const [channel, setChannel] = useState('email');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWithAuth('/api/account/notification-profile/')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setChannel(data.notification_channel || 'email');
        setBotToken(data.telegram_bot_token || '');
        setChatId(data.telegram_chat_id || '');
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = { notification_channel: channel, ...(channel === 'telegram' ? { telegram_bot_token: botToken, telegram_chat_id: chatId } : {}) };
      const r = await fetchWithAuth('/api/account/notification-profile/', { method: 'PATCH', body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (r.ok) setMessage({ variant: 'success', text: 'Settings saved.' });
      else setMessage({ variant: 'danger', text: data.error || data.telegram_error || 'Failed to save settings.' });
    } catch {
      setMessage({ variant: 'danger', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const row = { flexDirection: md ? 'row' : 'column', gap: md ? 24 : 0 };

  return (
    <ScrollPage contentContainerStyle={{ padding: 12, paddingTop: 24, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
      <H level={2} style={{ marginBottom: 24 }}>Settings</H>
      <View style={row}>
        <SettingsCard title="Statistics">
          <T style={{ marginBottom: 12 }}>View statistics about your notes, revisions and file access.</T>
          <Button title="View Statistics" onPress={() => router.push('/settings/stats')} />
        </SettingsCard>
        <SettingsCard title="Active Sessions">
          <T style={{ marginBottom: 12 }}>Manage the devices that are logged in to your account.</T>
          <Button title="Manage Sessions" onPress={() => router.push('/settings/sessions')} />
        </SettingsCard>
      </View>
      <View style={row}>
        <SettingsCard title="Theme">
          <ButtonGroup>
            <Button variant={theme === 'light' ? 'primary' : 'outline-primary'} title="☀️ Light" onPress={() => setTheme('light')} />
            <Button variant={theme === 'dark' ? 'primary' : 'outline-primary'} title="🌙 Dark" onPress={() => setTheme('dark')} />
          </ButtonGroup>
        </SettingsCard>
        <SettingsCard title="Notifications">
          {message ? (
            <Alert variant={message.variant} onClose={() => setMessage(null)}>
              {message.text}
            </Alert>
          ) : null}
          <Field label="Notification channel">
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <Radio checked={channel === 'email'} onPress={() => setChannel('email')} label="Email" />
              <Radio checked={channel === 'telegram'} onPress={() => setChannel('telegram')} label="Telegram" />
            </View>
          </Field>
          {channel === 'telegram' ? (
            <>
              <Field label="Bot Token">
                <Input value={botToken} onChangeText={setBotToken} placeholder="123456:ABC-DEF..." autoCapitalize="none" autoCorrect={false} />
                <HelpLink text="Create a bot and get its token from" url="https://t.me/BotFather" label="@BotFather" />
              </Field>
              <Field label="Your Telegram Chat ID">
                <Input value={chatId} onChangeText={setChatId} autoCapitalize="none" keyboardType="numbers-and-punctuation" />
                <HelpLink text="Get your chat ID from" url="https://t.me/userinfobot" label="@userinfobot" />
              </Field>
            </>
          ) : null}
          <Button title="Save" onPress={save} loading={saving} />
        </SettingsCard>
      </View>
    </ScrollPage>
  );
}
