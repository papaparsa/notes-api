const listeners = new Map();

export const on = (name, fn) => {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => listeners.get(name)?.delete(fn);
};

export const emit = (name, detail) => {
  listeners.get(name)?.forEach((fn) => fn(detail));
};

export const showWaitingModal = (title) => emit('showWaitingModal', title);
export const hideWaitingModal = () => emit('hideWaitingModal');
export const showToastEvent = (title, body, delay = 3000, variant = 'primary') =>
  emit('showToast', { title, body, delay, variant });
