import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import AuthCard from '../../components/auth/AuthCard';
import { Button, Divider, H, Input, Link, T } from '../../components/ui';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function LoginPage() {
  const { login } = useApp();
  const { colors } = useTheme();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await login(username.trim(), password);
      router.replace('/');
    } catch {
      setError('Invalid login');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <H level={4} style={{ marginBottom: 24 }}>Login to your account</H>
      <Input size="lg" placeholder="enter username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} style={{ marginBottom: 16 }} returnKeyType="next" />
      <Input size="lg" placeholder="pw" value={password} onChangeText={setPassword} secureTextEntry style={{ marginBottom: 16 }} onSubmitEditing={submit} returnKeyType="go" />
      <Button size="lg" block title="sign in" onPress={submit} loading={busy} />
      {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}
      <Divider />
      <T>
        Don't have an account? <Link onPress={() => router.push('/signup')}>Sign up</Link>
      </T>
    </AuthCard>
  );
}
