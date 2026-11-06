import { LOAD_TIMEOUT_MS, RUN_TIMEOUT_MS } from './pythonSource';

export function createJobManager({ send, reset }) {
  let nextId = 1;
  const pending = new Map();

  const failAll = (message) => {
    pending.forEach(({ resolve, timer }) => {
      clearTimeout(timer);
      resolve({ error: message, stdout: '' });
    });
    pending.clear();
  };

  const restart = (message) => {
    reset();
    failAll(message);
  };

  const handle = (data) => {
    const job = pending.get(data.id);
    if (!job) return;
    if (data.type === 'status') {
      job.onStatus?.(data.status);
      if (data.status === 'running') {
        clearTimeout(job.timer);
        job.timer = setTimeout(() => restart(`Stopped: the code ran longer than ${RUN_TIMEOUT_MS / 1000}s. Python was restarted.`), RUN_TIMEOUT_MS);
      }
      return;
    }
    clearTimeout(job.timer);
    pending.delete(data.id);
    job.resolve(data.result);
  };

  const run = (code, { tables = [], dfIndex = null, usePandas = false, files = [], onStatus } = {}) =>
    new Promise((resolve) => {
      const id = nextId++;
      const timer = setTimeout(() => restart(`Python didn't finish loading within ${LOAD_TIMEOUT_MS / 1000}s. Check your network connection to cdn.jsdelivr.net.`), LOAD_TIMEOUT_MS);
      pending.set(id, { resolve, onStatus, timer });
      try {
        send({ id, code, tables, dfIndex, usePandas, files });
      } catch (error) {
        restart(`Could not start Python: ${error?.message || error}`);
      }
    });

  return { run, handle, restart };
}
