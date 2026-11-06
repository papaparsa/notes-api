import { useRef } from 'react';
import { interpolate, monotonic } from '../lib/lineMap';

const MIRRORED = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'wordSpacing', 'lineHeight', 'tabSize', 'textIndent', 'direction', 'boxSizing', 'borderLeftWidth', 'borderRightWidth'];

const editorLineMap = (textarea, text) => {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  MIRRORED.forEach((k) => {
    mirror.style[k] = style[k];
  });
  Object.assign(mirror.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', width: `${textarea.clientWidth}px`, top: '0', left: '-9999px' });
  const lines = text.split('\n');
  lines.forEach((line) => {
    const div = document.createElement('div');
    div.textContent = line || '​';
    mirror.appendChild(div);
  });
  document.body.appendChild(mirror);
  const points = Array.from(mirror.children).map((child, i) => ({ line: i + 1, y: child.offsetTop }));
  points.push({ line: lines.length + 1, y: mirror.scrollHeight });
  mirror.remove();
  return points;
};

export default function useScrollSync({ enabled, text, editorInputRef, previewRef }) {
  const previewPoints = useRef({});
  const previewHeight = useRef(0);
  const lock = useRef(null);

  const previewMap = (lines) => monotonic([{ line: 1, y: 0 }, ...Object.entries(previewPoints.current).map(([l, y]) => ({ line: Number(l), y })), { line: lines + 1, y: previewHeight.current }]);

  const onBlockLayout = (line, y) => {
    previewPoints.current[line] = y;
  };

  const onPreviewContentSize = (_, h) => {
    previewHeight.current = h;
  };

  const release = (who) => requestAnimationFrame(() => lock.current === who && (lock.current = null));

  const onEditorScroll = () => {
    const textarea = editorInputRef.current?.node?.();
    const preview = previewRef.current?.getScrollableNode?.();
    if (!enabled || !textarea || !preview || lock.current === 'editor') return;
    lock.current = 'preview';
    if (textarea.scrollTop + textarea.clientHeight >= textarea.scrollHeight - 2) preview.scrollTop = preview.scrollHeight;
    else {
      const em = editorLineMap(textarea, text);
      const line = interpolate(em, textarea.scrollTop, 'y', 'line');
      preview.scrollTop = interpolate(previewMap(em.length), line, 'line', 'y');
    }
    release('preview');
  };

  const onPreviewScroll = () => {
    const textarea = editorInputRef.current?.node?.();
    const preview = previewRef.current?.getScrollableNode?.();
    if (!enabled || !textarea || !preview || lock.current === 'preview') return;
    lock.current = 'editor';
    if (preview.scrollTop + preview.clientHeight >= preview.scrollHeight - 2) textarea.scrollTop = textarea.scrollHeight;
    else {
      const em = editorLineMap(textarea, text);
      const line = interpolate(previewMap(em.length), preview.scrollTop, 'y', 'line');
      textarea.scrollTop = interpolate(em, line, 'line', 'y');
    }
    release('editor');
  };

  return { onBlockLayout, onEditorScroll, onPreviewScroll, onPreviewContentSize };
}
