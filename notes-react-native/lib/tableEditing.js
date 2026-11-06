import { blockForInsert, cellRanges, emptyTable, findTableBlockAt, htmlTableToModel, isInsideFence, serializeTable, tsvToModel } from './markdownTable';

const lineOffsetInBlock = (serialized, lineIndex) =>
  serialized
    .split('\n')
    .slice(0, lineIndex)
    .reduce((sum, line) => sum + line.length + 1, 0);

const cellSelection = (blockStart, serialized, row, col) => {
  const lineIndex = row === -1 ? 0 : row + 2;
  const line = serialized.split('\n')[lineIndex];
  const range = cellRanges(line)[col] || { start: 2, end: 2 };
  const base = blockStart + lineOffsetInBlock(serialized, lineIndex);
  return { start: base + range.start, end: base + range.end };
};

const cloneModel = (model) => ({ ...model, rows: model.rows.map((r) => [...r]) });

const writeTable = (text, block, model, row, col) => {
  const serialized = serializeTable(model);
  return {
    text: text.slice(0, block.start) + serialized + text.slice(block.end),
    selection: cellSelection(block.start, serialized, row, col),
  };
};

export const tableTab = (text, offset, backwards) => {
  const block = findTableBlockAt(text, offset);
  if (!block) return null;
  const model = cloneModel(block.model);
  const colCount = model.headers.length;
  let row = block.lineIndex <= 1 ? -1 : block.lineIndex - 2;
  let col = block.col;
  if (backwards) {
    col -= 1;
    if (col < 0) {
      if (row === -1) col = 0;
      else {
        row -= 1;
        col = colCount - 1;
      }
    }
  } else {
    col += 1;
    if (col >= colCount) {
      row += 1;
      col = 0;
      if (row >= model.rows.length) model.rows.push(Array(colCount).fill(''));
    }
  }
  return writeTable(text, block, model, row, col);
};

export const tableEnter = (text, offset) => {
  const block = findTableBlockAt(text, offset);
  if (!block) return null;
  const model = cloneModel(block.model);
  const colCount = model.headers.length;
  const row = block.lineIndex <= 1 ? -1 : block.lineIndex - 2;
  if (row >= 0 && model.rows[row].every((cell) => !cell.trim())) {
    model.rows.splice(row, 1);
    const serialized = serializeTable(model);
    const after = text.slice(block.end);
    const replacement = serialized + (after.startsWith('\n') ? '\n' : '\n\n');
    const caret = block.start + serialized.length + 1;
    return { text: text.slice(0, block.start) + replacement + after, selection: { start: caret, end: caret } };
  }
  model.rows.splice(row + 1, 0, Array(colCount).fill(''));
  return writeTable(text, block, model, row + 1, 0);
};

export const insertModelAt = (text, start, end, model, selectFirstHeader) => {
  const serialized = serializeTable(model);
  const { insertText, blockOffset } = blockForInsert(text, start, end, serialized);
  const next = text.slice(0, start) + insertText + text.slice(end);
  const blockStart = start + blockOffset;
  const selection = selectFirstHeader ? cellSelection(blockStart, serialized, -1, 0) : { start: start + insertText.length, end: start + insertText.length };
  return { text: next, selection };
};

export const insertEmptyTable = (text, start, end, bodyRows, cols) => insertModelAt(text, start, end, emptyTable(bodyRows, cols), true);

export const pasteAsTable = (text, start, end, { html, plain }) => {
  if (findTableBlockAt(text, start) || isInsideFence(text, start)) return null;
  const model = htmlTableToModel(html) || tsvToModel(plain || '');
  if (!model) return null;
  return insertModelAt(text, start, end, model, false);
};

export const detectTableKeystroke = (prev, next, prevSelection) => {
  if (next.length !== prev.length + 1) return null;
  const at = prevSelection?.start ?? -1;
  if (at < 0 || prevSelection.start !== prevSelection.end) return null;
  if (next.slice(0, at) !== prev.slice(0, at) || next.slice(at + 1) !== prev.slice(at)) return null;
  const ch = next[at];
  if (ch === '\t') return tableTab(prev, at, false);
  if (ch === '\n') return tableEnter(prev, at);
  return null;
};

export const toggleQuoteLines = (text, start, end) => {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = text.length;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const allQuoted = lines.every((l) => l.startsWith('> '));
  const nextLines = allQuoted ? lines.map((l) => l.slice(2)) : lines.map((l) => `> ${l}`);
  const delta = allQuoted ? -2 : 2;
  return {
    text: text.slice(0, lineStart) + nextLines.join('\n') + text.slice(lineEnd),
    selection: { start: Math.max(lineStart, start + delta), end: Math.max(lineStart, end + delta * lines.length) },
  };
};
