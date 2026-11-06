import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import AuthCard from '../../components/auth/AuthCard';
import { Button, Divider, H, Input, Link, T } from '../../components/ui';
import { signup } from '../../lib/auth';
import { useTheme } from '../../contexts/ThemeContext';

export default function SignupPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const data = await signup(username.trim(), email.trim(), password);
      setSuccess(data.message || 'Signup successful! Please check your email to confirm your account.');
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard>
      <H level={4} style={{ marginBottom: 24 }}>Create your account</H>
      <Input size="lg" placeholder="username" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} style={{ marginBottom: 16 }} />
      <Input size="lg" placeholder="email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ marginBottom: 16 }} />
      <Input size="lg" placeholder="password" value={password} onChangeText={setPassword} secureTextEntry style={{ marginBottom: 16 }} onSubmitEditing={submit} />
      <Button size="lg" block title="sign up" onPress={submit} loading={busy} />
      {success ? <Text style={{ color: colors.success, marginTop: 8 }}>{success}</Text> : null}
      {error ? <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text> : null}
      <Divider />
      <T>
        Already have an account? <Link onPress={() => router.replace('/login')}>Sign in</Link>
      </T>
    </AuthCard>
  );
}
