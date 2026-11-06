import { WORKER_SOURCE } from './pythonSource';
import { createJobManager } from './pythonJobs';
import { fetchWithAuth } from './api';

let worker = null;

const manager = createJobManager({
  send: (job) => getWorker().postMessage(job),
  reset: () => {
    worker?.terminate();
    worker = null;
  },
});

function getWorker() {
  if (worker) return worker;
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
  worker = new Worker(url);
  worker.onmessage = ({ data }) => manager.handle(data);
  worker.onerror = (event) => manager.restart(event.message || 'Python failed to load.');
  return worker;
}

export const runPython = manager.run;
export const restartPython = () => manager.restart('Python was restarted.');

export async function fetchFilePayload(url) {
  const response = await fetchWithAuth(url, {}, 60000);
  if (!response.ok) throw new Error(`Could not download ${url} (${response.status})`);
  return { bytes: await response.arrayBuffer() };
}
