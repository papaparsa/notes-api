import { remark } from "remark";
import remarkGfm from "remark-gfm";

const DELIMITER_CELL = /^:?-+:?$/;

const splitUnescapedPipes = (line) => {
  const positions = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\") {
      i++;
      continue;
    }
    if (line[i] === "|") positions.push(i);
  }
  return positions;
};

const unescapeCell = (cell) => cell.replace(/\\\|/g, "|").trim();

const escapeCell = (cell) =>
  String(cell ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\\?\|/g, "\\|")
    .trim();

export const splitRow = (line) => {
  const trimmed = line.trim();
  const pipes = splitUnescapedPipes(trimmed);
  const bounds = [-1, ...pipes, trimmed.length];
  const cells = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    cells.push(trimmed.slice(bounds[i] + 1, bounds[i + 1]));
  }
  if (trimmed.startsWith("|")) cells.shift();
  if (pipes.length && pipes[pipes.length - 1] === trimmed.length - 1) {
    cells.pop();
  }
  return cells.map(unescapeCell);
};

const isDelimiterRow = (line) => {
  if (!line || !line.includes("-")) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => DELIMITER_CELL.test(cell));
};

const parseAlign = (cell) => {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
};

const normalizeModel = ({ headers, aligns, rows }) => {
  const colCount = Math.max(
    1,
    headers.length,
    ...rows.map((row) => row.length),
  );
  const pad = (cells) =>
    Array.from({ length: colCount }, (_, i) => cells[i] ?? "");
  return {
    headers: pad(headers),
    aligns: Array.from({ length: colCount }, (_, i) => aligns?.[i] ?? null),
    rows: rows.map(pad),
  };
};

export const parseTableBlock = (lines) => {
  const headers = splitRow(lines[0]);
  const aligns = splitRow(lines[1]).map(parseAlign);
  const rows = lines.slice(2).map(splitRow);
  return normalizeModel({ headers, aligns, rows });
};

const cellWidth = (text) => [...text].length;

export const serializeTable = (model) => {
  const { headers, aligns, rows } = normalizeModel(model);
  const escapedHeaders = headers.map(escapeCell);
  const escapedRows = rows.map((row) => row.map(escapeCell));
  const widths = escapedHeaders.map((header, col) =>
    Math.max(
      3,
      cellWidth(header),
      ...escapedRows.map((row) => cellWidth(row[col])),
    ),
  );
  const padCell = (text, col) =>
    text + " ".repeat(widths[col] - cellWidth(text));
  const formatRow = (cells) =>
    `| ${cells.map((cell, col) => padCell(cell, col)).join(" | ")} |`;
  const delimiter = `| ${widths
    .map((width, col) => {
      const align = aligns[col];
      if (align === "center") return `:${"-".repeat(width - 2)}:`;
      if (align === "right") return `${"-".repeat(width - 1)}:`;
      if (align === "left") return `:${"-".repeat(width - 1)}`;
      return "-".repeat(width);
    })
    .join(" | ")} |`;
  return [
    formatRow(escapedHeaders),
    delimiter,
    ...escapedRows.map(formatRow),
  ].join("\n");
};

export const emptyTable = (bodyRows, cols) =>
  normalizeModel({
    headers: Array.from({ length: cols }, (_, i) => `Column ${i + 1}`),
    aligns: [],
    rows: Array.from({ length: bodyRows }, () => []),
  });

export const isInsideFence = (text, offset) => {
  const before = text.slice(0, offset);
  const fences = before.match(/^[ \t]*(```|~~~)/gm);
  return Boolean(fences && fences.length % 2 === 1);
};

export const cellRanges = (line) => {
  const pipes = splitUnescapedPipes(line);
  const contentStart = line.length - line.trimStart().length;
  const contentEnd = line.trimEnd().length;
  const bounds = [...pipes];
  if (!line.trimStart().startsWith("|")) bounds.unshift(contentStart - 1);
  if (bounds[bounds.length - 1] !== contentEnd - 1) bounds.push(contentEnd);
  const ranges = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const segStart = bounds[i] + 1;
    const segEnd = bounds[i + 1];
    const segment = line.slice(segStart, segEnd);
    if (!segment.trim()) {
      const pos = Math.min(segStart + 1, segEnd);
      ranges.push({ start: pos, end: pos });
    } else {
      ranges.push({
        start: segStart + (segment.length - segment.trimStart().length),
        end: segEnd - (segment.length - segment.trimEnd().length),
      });
    }
  }
  return ranges;
};

export const findTableBlockAt = (text, offset) => {
  if (isInsideFence(text, offset)) return null;
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") lineStarts.push(i + 1);
  }
  const lines = text.split("\n");
  let cursorLine = lineStarts.length - 1;
  for (let i = 0; i < lineStarts.length; i++) {
    if (lineStarts[i] > offset) {
      cursorLine = i - 1;
      break;
    }
  }
  const isRowLine = (line) =>
    line !== undefined &&
    line.trim() !== "" &&
    line.includes("|") &&
    !line.trimStart().startsWith(">");
  if (!isRowLine(lines[cursorLine])) return null;

  let first = cursorLine;
  while (first > 0 && isRowLine(lines[first - 1])) first--;
  let last = cursorLine;
  while (last < lines.length - 1 && isRowLine(lines[last + 1])) last++;

  let headerLine = -1;
  for (let i = first; i < last; i++) {
    if (!isDelimiterRow(lines[i]) && isDelimiterRow(lines[i + 1])) {
      headerLine = i;
      break;
    }
  }
  if (headerLine === -1 || cursorLine < headerLine) return null;

  const blockLines = lines.slice(headerLine, last + 1);
  const lineIndex = cursorLine - headerLine;
  const lineOffset = offset - lineStarts[cursorLine];
  const cursorText = lines[cursorLine];
  const pipesBefore = splitUnescapedPipes(cursorText).filter(
    (pos) => pos < lineOffset,
  ).length;
  const model = parseTableBlock(blockLines);
  const col = Math.min(
    Math.max(pipesBefore - (cursorText.trimStart().startsWith("|") ? 1 : 0), 0),
    model.headers.length - 1,
  );

  const start = lineStarts[headerLine];
  const end = lineStarts[last] + lines[last].length;
  return {
    start,
    end,
    lineIndex,
    col,
    model,
  };
};

export const truncationIndex = (text, limit) => {
  if (text.length <= limit) return text.length;
  const block = findTableBlockAt(text, limit);
  return block ? Math.max(limit, block.end) : limit;
};

const collectTables = (text) => {
  const tree = remark().use(remarkGfm).parse(text);
  const tables = [];
  const visit = (node) => {
    if (node.type === "table") {
      tables.push(node);
      return;
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  return tables;
};

const tableNodeToModel = (node, text) => {
  const cellSource = (cell) => {
    if (!cell.children.length) return "";
    const start = cell.children[0].position.start.offset;
    const end = cell.children[cell.children.length - 1].position.end.offset;
    return unescapeCell(text.slice(start, end));
  };
  const [headerRow, ...bodyRows] = node.children;
  return normalizeModel({
    headers: headerRow.children.map(cellSource),
    aligns: node.align || [],
    rows: bodyRows.map((row) => row.children.map(cellSource)),
  });
};

export const findTables = (text) =>
  collectTables(text).map((node) => ({
    start: node.position.start.offset,
    end: node.position.end.offset,
    model: tableNodeToModel(node, text),
  }));

export const RUNNABLE_LANGUAGES = ["pandas", "python"];

const setHProperties = (node, properties) => {
  node.data = node.data || {};
  node.data.hProperties = { ...(node.data.hProperties || {}), ...properties };
};

export const remarkTableIndex = () => (tree) => {
  let tableIndex = 0;
  const snippets = [];
  const visit = (node) => {
    if (node.type === "table") {
      setHProperties(node, { "data-table-index": tableIndex++ });
      return;
    }
    if (node.type === "code" && RUNNABLE_LANGUAGES.includes(node.lang)) {
      setHProperties(node, {
        "data-df-index": tableIndex - 1,
        "data-snippet-index": snippets.length,
      });
      snippets.push(node);
      return;
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  snippets.forEach((node) =>
    setHProperties(node, { "data-snippet-count": snippets.length }),
  );
};

export const getTableModel = (text, index) =>
  findTables(text)[index]?.model ?? null;

export const replaceTableInText = (text, index, model) => {
  const table = findTables(text)[index];
  if (!table) return text;
  const lineStart = text.lastIndexOf("\n", table.start - 1) + 1;
  const continuation = text
    .slice(lineStart, table.start)
    .replace(/[^>\s]/g, " ");
  const serialized = serializeTable(model)
    .split("\n")
    .map((line, i) => (i === 0 ? line : continuation + line))
    .join("\n");
  return text.slice(0, table.start) + serialized + text.slice(table.end);
};

export const tsvToModel = (str) => {
  const lines = str.replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n");
  if (lines.length < 2 || !lines.some((line) => line.includes("\t"))) {
    return null;
  }
  const [headers, ...rows] = lines.map((line) => line.split("\t"));
  return normalizeModel({ headers, aligns: [], rows });
};

export const htmlTableToModel = (html) => {
  if (!html || !/<table[\s>]/i.test(html) || typeof DOMParser === "undefined") {
    return null;
  }
  const table = new DOMParser()
    .parseFromString(html, "text/html")
    .querySelector("table");
  if (!table) return null;
  const rows = Array.from(table.rows).map((row) =>
    Array.from(row.cells).map((cell) =>
      cell.textContent.replace(/\s+/g, " ").trim(),
    ),
  );
  if (!rows.length || (rows.length < 2 && rows[0].length < 2)) return null;
  const [headers, ...body] = rows;
  return normalizeModel({ headers, aligns: [], rows: body });
};

export const replaceRange = (textarea, start, end, newText) => {
  textarea.focus();
  textarea.setSelectionRange(start, end);
  let inserted = false;
  try {
    inserted = document.execCommand("insertText", false, newText);
  } catch {
    inserted = false;
  }
  if (!inserted) {
    textarea.setRangeText(newText, start, end, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
};

export const blockForInsert = (text, start, end, block) => {
  const before = text.slice(0, start);
  const after = text.slice(end);
  let prefix = "";
  if (before.length && !before.endsWith("\n\n")) {
    prefix = before.endsWith("\n") ? "\n" : "\n\n";
  }
  let suffix = "";
  if (!after.startsWith("\n\n")) {
    suffix = after.startsWith("\n") ? "\n" : after.length ? "\n\n" : "\n";
  }
  return { insertText: prefix + block + suffix, blockOffset: prefix.length };
};

const csvField = (value) =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export const tableElementToCsv = (tableEl) =>
  Array.from(tableEl.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => csvField(cell.innerText.trim()))
        .join(","),
    )
    .join("\r\n");

export const downloadCsv = (csv, filename) => {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
