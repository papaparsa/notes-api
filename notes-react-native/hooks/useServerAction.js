import { useToast, useWaiting } from '../contexts/UIContext';
import { emit } from '../lib/events';
import { fetchJSON } from '../lib/api';

export default function useServerAction() {
  const showToast = useToast();
  const waiting = useWaiting();
  return async (path, options, { success, events = [], title = 'Waiting for server response' } = {}) => {
    waiting.show(title);
    try {
      const data = await fetchJSON(path, options);
      if (success) showToast('Success', success, 3000, 'success');
      events.forEach((e) => emit(e));
      return data ?? true;
    } catch (err) {
      showToast('Error', err.message, 4000, 'danger');
      return null;
    } finally {
      waiting.hide();
    }
  };
}
