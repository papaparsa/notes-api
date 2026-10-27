import { useEffect, useRef } from "react";

const MIRRORED_STYLES = [
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "tabSize",
  "wordSpacing",
  "textIndent",
  "direction",
];

const measureEditorPoints = (textarea, text) => {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  MIRRORED_STYLES.forEach((prop) => {
    mirror.style[prop] = computed[prop];
  });
  Object.assign(mirror.style, {
    position: "absolute",
    visibility: "hidden",
    top: "0",
    left: "-99999px",
    boxSizing: "border-box",
    border: "0",
    width: `${textarea.clientWidth}px`,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  });

  const lines = text.split("\n");
  const lineEls = lines.map((line) => {
    const el = document.createElement("div");
    el.textContent = line || "​";
    mirror.appendChild(el);
    return el;
  });
  document.body.appendChild(mirror);

  const points = lineEls.map((el, i) => ({ line: i + 1, pos: el.offsetTop }));
  points.push({ line: lines.length + 1, pos: mirror.scrollHeight });
  document.body.removeChild(mirror);
  return points;
};

const measurePreviewPoints = (preview, totalLines) => {
  const containerTop = preview.getBoundingClientRect().top - preview.scrollTop;
  const points = [{ line: 1, pos: 0 }];
  preview.querySelectorAll("[data-sl]").forEach((el) => {
    const line = Number(el.getAttribute("data-sl"));
    const pos = el.getBoundingClientRect().top - containerTop;
    const last = points[points.length - 1];
    if (line > last.line && pos >= last.pos) {
      points.push({ line, pos });
    }
  });
  const end = { line: totalLines + 1, pos: preview.scrollHeight };
  if (end.line > points[points.length - 1].line) points.push(end);
  return points;
};

const interpolate = (points, value, from, to) => {
  if (!points.length) return 0;
  if (value <= points[0][from]) return points[0][to];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (value <= b[from]) {
      const span = b[from] - a[from];
      const ratio = span > 0 ? (value - a[from]) / span : 0;
      return a[to] + ratio * (b[to] - a[to]);
    }
  }
  return points[points.length - 1][to];
};

const useScrollSync = (editorRef, previewRef, text, enabled) => {
  const editorPoints = useRef([]);
  const previewPoints = useRef([]);
  const lockedPane = useRef(null);

  useEffect(() => {
    if (!enabled) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    const totalLines = text.split("\n").length;

    const measure = () => {
      editorPoints.current = measureEditorPoints(editor, text);
      previewPoints.current = measurePreviewPoints(preview, totalLines);
    };

    const sync = (source, target, sourcePoints, targetPoints) => {
      let next;
      if (source.scrollTop + source.clientHeight >= source.scrollHeight - 2) {
        next = target.scrollHeight;
      } else {
        const line = interpolate(sourcePoints, source.scrollTop, "pos", "line");
        next = interpolate(targetPoints, line, "line", "pos");
      }
      if (Math.abs(target.scrollTop - next) < 1) return;
      lockedPane.current = target;
      target.scrollTop = next;
      requestAnimationFrame(() => {
        lockedPane.current = null;
      });
    };

    const syncFromEditor = () =>
      sync(editor, preview, editorPoints.current, previewPoints.current);
    const syncFromPreview = () =>
      sync(preview, editor, previewPoints.current, editorPoints.current);

    const onEditorScroll = () => {
      if (lockedPane.current === editor) return;
      syncFromEditor();
    };
    const onPreviewScroll = () => {
      if (lockedPane.current === preview) return;
      syncFromPreview();
    };

    let timer = null;
    const remeasure = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        measure();
        syncFromEditor();
      }, 150);
    };

    remeasure();
    editor.addEventListener("scroll", onEditorScroll);
    preview.addEventListener("scroll", onPreviewScroll);
    preview.addEventListener("load", remeasure, true);
    const resizeObserver = new ResizeObserver(remeasure);
    resizeObserver.observe(editor);
    resizeObserver.observe(preview);

    return () => {
      clearTimeout(timer);
      editor.removeEventListener("scroll", onEditorScroll);
      preview.removeEventListener("scroll", onPreviewScroll);
      preview.removeEventListener("load", remeasure, true);
      resizeObserver.disconnect();
    };
  }, [editorRef, previewRef, text, enabled]);
};

export default useScrollSync;
