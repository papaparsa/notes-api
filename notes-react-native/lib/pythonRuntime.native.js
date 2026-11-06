import { createJobManager } from './pythonJobs';
import { emit } from './events';
import { fetchWithAuth } from './api';

let host = null;
let ready = false;
const queue = [];

const flush = () => {
  if (!host || !ready) return;
  while (queue.length) {
    const job = queue.shift();
    host.inject(`window.__runJob(${JSON.stringify(job)}); true;`);
  }
};

const manager = createJobManager({
  send: (job) => {
    queue.push(job);
    if (!host) emit('pythonHostMount');
    flush();
  },
  reset: () => {
    ready = false;
    queue.length = 0;
    host?.reload();
  },
});

export const registerPythonHost = (h) => {
  host = h;
  ready = false;
};

export const unregisterPythonHost = () => {
  host = null;
  ready = false;
};

export const handlePythonMessage = (raw) => {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }
  if (data.type === 'ready') {
    ready = true;
    flush();
    return;
  }
  manager.handle(data);
};

export const runPython = manager.run;
export const restartPython = () => manager.restart('Python was restarted.');

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export async function fetchFilePayload(url) {
  const response = await fetchWithAuth(url, {}, 60000);
  if (!response.ok) throw new Error(`Could not download ${url} (${response.status})`);
  return { b64: await blobToBase64(await response.blob()) };
}
