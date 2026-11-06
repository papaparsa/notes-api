import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AuthCard from '../../../components/auth/AuthCard';
import { Button, H, Spinner, T } from '../../../components/ui';
import { confirmEmail } from '../../../lib/auth';
import { useTheme } from '../../../contexts/ThemeContext';

export default function ConfirmEmailPage() {
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const [state, setState] = useState({ status: 'loading', message: 'Confirming your email...' });

  useEffect(() => {
    let timer;
    confirmEmail(token)
      .then((data) => {
        setState({ status: 'success', message: data.message || 'Email confirmed.' });
        timer = setTimeout(() => router.replace('/login'), 3000);
      })
      .catch((err) => setState({ status: 'error', message: err.message }));
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <AuthCard>
      <H level={4} style={{ marginBottom: 16 }}>Email Confirmation</H>
      {state.status === 'loading' ? (
        <>
          <Spinner />
          <T style={{ marginTop: 8 }}>{state.message}</T>
        </>
      ) : null}
      {state.status === 'success' ? (
        <>
          <Text style={{ color: colors.success }}>{state.message}</Text>
          <T muted style={{ marginTop: 8 }}>Redirecting to login...</T>
        </>
      ) : null}
      {state.status === 'error' ? (
        <>
          <Text style={{ color: colors.danger, marginBottom: 16 }}>{state.message}</Text>
          <Button title="Go to Login" onPress={() => router.replace('/login')} />
        </>
      ) : null}
    </AuthCard>
  );
}
