const VERSION = '0.18.1';
const ASSET_PATH = `https://unpkg.com/@excalidraw/excalidraw@${VERSION}/dist/prod/`;

export const EXCALIDRAW_HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="${ASSET_PATH}index.css">
<style>html,body,#root{height:100%;margin:0;padding:0;overflow:hidden}#loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#6c757d}</style>
<script>window.EXCALIDRAW_ASSET_PATH = "${ASSET_PATH}";</script>
</head><body><div id="loading">Loading…</div><div id="root"></div>
<script type="module">
import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Excalidraw, exportToBlob } from "https://esm.sh/@excalidraw/excalidraw@${VERSION}?deps=react@18.3.1,react-dom@18.3.1";

const post = (msg) => {
  const data = JSON.stringify(msg);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
  else window.parent.postMessage(data, "*");
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

let api = null;
const root = createRoot(document.getElementById("root"));

window.__init = ({ initialData, theme }) => {
  document.getElementById("loading").style.display = "none";
  const data = initialData
    ? { elements: initialData.elements || [], appState: { ...(initialData.appState || {}), collaborators: new Map() }, files: initialData.files || {} }
    : null;
  root.render(React.createElement(Excalidraw, { excalidrawAPI: (a) => { api = a; }, initialData: data, theme: theme || "light" }));
};

window.__save = async () => {
  try {
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const files = api.getFiles();
    const blob = await exportToBlob({ elements, appState, files, mimeType: "image/png" });
    post({ type: "saved", png: await blobToBase64(blob), scene: { type: "excalidraw", version: 2, source: "notes-api", elements, appState: { ...appState, collaborators: [] }, files } });
  } catch (error) {
    post({ type: "error", message: String(error?.message || error) });
  }
};

window.addEventListener("message", (event) => {
  let msg;
  try { msg = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
  if (msg?.cmd === "init") window.__init(msg.payload);
  if (msg?.cmd === "save") window.__save();
});

post({ type: "ready" });
</script></body></html>`;
