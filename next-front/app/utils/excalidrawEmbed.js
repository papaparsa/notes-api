export const EXCALIDRAW_ALT_PREFIX = "excalidraw|";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createExcalidrawEmbedId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `drawing-${Date.now()}`;
};

export const parseExcalidrawAlt = (alt = "") => {
  if (!alt || !alt.startsWith(EXCALIDRAW_ALT_PREFIX)) return null;
  const parts = alt.split("|");
  if (parts.length < 3) return null;
  const id = parts[1]?.trim();
  const sceneUrl = parts.slice(2).join("|").trim();
  if (!id || !sceneUrl) return null;
  return { id, sceneUrl };
};

export const createExcalidrawEmbedLine = ({ id, imageUrl, sceneUrl }) => {
  return `![${EXCALIDRAW_ALT_PREFIX}${id}|${sceneUrl}](${imageUrl})`;
};

export const replaceExcalidrawEmbedLine = (text, drawingId, nextLine) => {
  const drawingIdPattern = escapeRegExp(drawingId);
  const linePattern = new RegExp(
    `!\\[${escapeRegExp(EXCALIDRAW_ALT_PREFIX)}${drawingIdPattern}\\|[^\\]]*\\]\\([^\\)]*\\)`,
  );

  if (linePattern.test(text)) {
    return text.replace(linePattern, nextLine);
  }

  return text + (text ? "\n" : "") + nextLine;
};
