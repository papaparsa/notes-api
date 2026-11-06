import { showToastEvent } from './events';

export function handleApiError(error) {
  if (error?.message === 'Session expired') return;
  if (error?.status === 429) {
    showToastEvent('Too Many Requests', `Please try again in ${error.data?.timeout_in_seconds ?? 'a few'} seconds`, 3000, 'danger');
    return;
  }
  if (error?.status === 400) {
    const errors = error.data?.errors;
    showToastEvent('Error', Array.isArray(errors) ? errors[0] : error.message, 3000, 'danger');
    return;
  }
  if (error?.status === 404) {
    showToastEvent('Error', 'API not found', 3000, 'danger');
    return;
  }
  if (error?.status >= 500) {
    showToastEvent('Error', 'Server Error', 3000, 'danger');
    return;
  }
  showToastEvent('Unknown Error', error?.message || String(error), 3000, 'danger');
}
