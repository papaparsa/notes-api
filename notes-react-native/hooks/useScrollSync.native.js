import { useRef } from 'react';
import { estimateEditorLines, interpolate, monotonic } from '../lib/lineMap';

export default function useScrollSync({ enabled, text, editorLayout, previewRef, fontSize = 16, lineHeight = 25.6, padding = 12 }) {
  const previewPoints = useRef({});
  const previewHeight = useRef(0);

  const onBlockLayout = (line, y) => {
    previewPoints.current[line] = y;
  };

  const onPreviewContentSize = (_, h) => {
    previewHeight.current = h;
  };

  const onEditorScroll = (e) => {
    if (!enabled || !editorLayout.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const editorPoints = estimateEditorLines(text, editorLayout.current.width, fontSize, lineHeight, padding);
    const lines = editorPoints.length;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 2) {
      previewRef.current?.scrollToEnd({ animated: false });
      return;
    }
    const line = interpolate(editorPoints, contentOffset.y, 'y', 'line');
    const pts = monotonic([{ line: 1, y: 0 }, ...Object.entries(previewPoints.current).map(([l, y]) => ({ line: Number(l), y })), { line: lines + 1, y: previewHeight.current }]);
    previewRef.current?.scrollTo({ y: interpolate(pts, line, 'line', 'y'), animated: false });
  };

  return { onBlockLayout, onEditorScroll, onPreviewScroll: undefined, onPreviewContentSize };
}
