import {
  blockForInsert,
  cellRanges,
  emptyTable,
  findTableBlockAt,
  htmlTableToModel,
  isInsideFence,
  replaceRange,
  serializeTable,
  tsvToModel,
} from "../utils/markdownTable";

const lineOffsetInBlock = (serialized, lineIndex) =>
  serialized
    .split("\n")
    .slice(0, lineIndex)
    .reduce((sum, line) => sum + line.length + 1, 0);

const selectCell = (textarea, blockStart, serialized, row, col) => {
  const lineIndex = row === -1 ? 0 : row + 2;
  const line = serialized.split("\n")[lineIndex];
  const range = cellRanges(line)[col] || { start: 2, end: 2 };
  const base = blockStart + lineOffsetInBlock(serialized, lineIndex);
  textarea.setSelectionRange(base + range.start, base + range.end);
};

const useTableEditing = (textareaRef, setText) => {
  const writeTable = (textarea, block, model, row, col) => {
    const serialized = serializeTable(model);
    replaceRange(textarea, block.start, block.end, serialized);
    selectCell(textarea, block.start, serialized, row, col);
  };

  const handleTab = (textarea, block, backwards) => {
    const model = {
      ...block.model,
      rows: block.model.rows.map((r) => [...r]),
    };
    const colCount = model.headers.length;
    let row = block.lineIndex <= 1 ? -1 : block.lineIndex - 2;
    let col = block.col;

    if (backwards) {
      col -= 1;
      if (col < 0) {
        if (row === -1) {
          col = 0;
        } else {
          row -= 1;
          col = colCount - 1;
        }
      }
    } else {
      col += 1;
      if (col >= colCount) {
        row += 1;
        col = 0;
        if (row >= model.rows.length) {
          model.rows.push(Array(colCount).fill(""));
        }
      }
    }
    writeTable(textarea, block, model, row, col);
  };

  const handleEnter = (textarea, block) => {
    const model = {
      ...block.model,
      rows: block.model.rows.map((r) => [...r]),
    };
    const colCount = model.headers.length;
    const row = block.lineIndex <= 1 ? -1 : block.lineIndex - 2;

    if (row >= 0 && model.rows[row].every((cell) => !cell.trim())) {
      model.rows.splice(row, 1);
      const serialized = serializeTable(model);
      const after = textarea.value.slice(block.end);
      const replacement = serialized + (after.startsWith("\n") ? "\n" : "\n\n");
      replaceRange(textarea, block.start, block.end, replacement);
      const caret = block.start + serialized.length + 1;
      textarea.setSelectionRange(caret, caret);
      return;
    }

    model.rows.splice(row + 1, 0, Array(colCount).fill(""));
    writeTable(textarea, block, model, row + 1, 0);
  };

  const handleTableKeyDown = (e) => {
    if (e.key !== "Tab" && e.key !== "Enter") return false;
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === "Enter" && e.shiftKey) return false;
    if (e.nativeEvent?.isComposing) return false;

    const textarea = e.currentTarget;
    if (
      textarea.selectionStart !== textarea.selectionEnd &&
      e.key === "Enter"
    ) {
      return false;
    }
    const block = findTableBlockAt(textarea.value, textarea.selectionStart);
    if (!block) return false;

    e.preventDefault();
    if (e.key === "Tab") {
      handleTab(textarea, block, e.shiftKey);
    } else {
      handleEnter(textarea, block);
    }
    return true;
  };

  const insertModel = (textarea, model) => {
    const serialized = serializeTable(model);
    const { selectionStart: start, selectionEnd: end, value } = textarea;
    const { insertText, blockOffset } = blockForInsert(
      value,
      start,
      end,
      serialized,
    );
    replaceRange(textarea, start, end, insertText);
    return { serialized, blockStart: start + blockOffset };
  };

  const handleTablePaste = (e) => {
    const textarea = e.currentTarget;
    const clipboard = e.clipboardData;
    if (!clipboard) return false;
    if (findTableBlockAt(textarea.value, textarea.selectionStart)) return false;
    if (isInsideFence(textarea.value, textarea.selectionStart)) return false;

    const model =
      htmlTableToModel(clipboard.getData("text/html")) ||
      tsvToModel(clipboard.getData("text/plain"));
    if (!model) return false;

    e.preventDefault();
    insertModel(textarea, model);
    return true;
  };

  const insertTable = (bodyRows, cols) => {
    const model = emptyTable(bodyRows, cols);
    const textarea = textareaRef.current;
    if (!textarea || !textarea.isConnected) {
      const serialized = serializeTable(model);
      setText((prev) => {
        const { insertText } = blockForInsert(
          prev,
          prev.length,
          prev.length,
          serialized,
        );
        return prev + insertText;
      });
      return;
    }
    const { serialized, blockStart } = insertModel(textarea, model);
    selectCell(textarea, blockStart, serialized, -1, 0);
  };

  return { handleTableKeyDown, handleTablePaste, insertTable };
};

export default useTableEditing;
