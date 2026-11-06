import { Alert, Button, T } from '../ui';

export default function RefreshPrompt({ visible, onRefresh }) {
  if (!visible) return null;
  return (
    <Alert variant="warning">
      <T style={{ flex: 1, color: '#664d03' }}>This note was updated elsewhere.</T>
      <Button size="sm" variant="outline-primary" title="Refresh" onPress={onRefresh} />
    </Alert>
  );
}
