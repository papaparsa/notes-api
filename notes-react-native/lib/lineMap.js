export const interpolate = (points, x, fromKey, toKey) => {
  if (!points.length) return 0;
  if (x <= points[0][fromKey]) return points[0][toKey];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (x <= b[fromKey]) {
      const span = b[fromKey] - a[fromKey] || 1;
      return a[toKey] + ((x - a[fromKey]) / span) * (b[toKey] - a[toKey]);
    }
  }
  return points[points.length - 1][toKey];
};

export const monotonic = (points) => {
  const sorted = [...points].sort((a, b) => a.line - b.line);
  const out = [];
  sorted.forEach((p) => {
    const last = out[out.length - 1];
    if (!last || (p.line > last.line && p.y >= last.y)) out.push(p);
  });
  return out;
};

export const estimateEditorLines = (text, width, fontSize, lineHeight, padding) => {
  const charsPerRow = Math.max(10, Math.floor((width - padding * 2) / (fontSize * 0.6)));
  let y = padding;
  const points = [];
  text.split('\n').forEach((line, i) => {
    points.push({ line: i + 1, y });
    y += Math.max(1, Math.ceil([...line].length / charsPerRow)) * lineHeight;
  });
  points.push({ line: points.length + 1, y: y + padding });
  return points;
};
