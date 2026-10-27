import React, { useEffect, useRef, useState } from "react";
import { Modal, Button, ButtonGroup, Form } from "react-bootstrap";

const ALIGN_CYCLE = [null, "left", "center", "right"];
const ALIGN_LABEL = { null: "–", left: "⇤", center: "↔", right: "⇥" };

const TableEditorModal = ({ show, table, onHide, onSave }) => {
  const [grid, setGrid] = useState([[""]]);
  const [aligns, setAligns] = useState([null]);
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const [pendingFocus, setPendingFocus] = useState(null);
  const inputRefs = useRef({});

  useEffect(() => {
    if (show && table) {
      setGrid([[...table.headers], ...table.rows.map((row) => [...row])]);
      setAligns([...table.aligns]);
      setFocus({ r: 0, c: 0 });
      setPendingFocus({ r: 0, c: 0 });
    }
  }, [show, table]);

  useEffect(() => {
    if (!pendingFocus) return;
    const input = inputRefs.current[`${pendingFocus.r}:${pendingFocus.c}`];
    if (input) {
      input.focus();
      input.select();
    }
    setPendingFocus(null);
  }, [pendingFocus, grid]);

  const colCount = grid[0]?.length ?? 0;
  const moveFocus = (r, c) => setPendingFocus({ r, c });

  const updateCell = (r, c, value) =>
    setGrid((prev) =>
      prev.map((row, ri) =>
        ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
      ),
    );

  const addRow = (offset) => {
    const index = Math.max(1, focus.r + offset);
    setGrid((prev) => [
      ...prev.slice(0, index),
      Array(colCount).fill(""),
      ...prev.slice(index),
    ]);
    moveFocus(index, focus.c);
  };

  const deleteRow = () => {
    if (focus.r === 0) return;
    setGrid((prev) => prev.filter((_, ri) => ri !== focus.r));
    moveFocus(Math.min(focus.r, grid.length - 2), focus.c);
  };

  const moveRow = (direction) => {
    const target = focus.r + direction;
    if (focus.r === 0 || target < 1 || target >= grid.length) return;
    setGrid((prev) => {
      const next = [...prev];
      [next[focus.r], next[target]] = [next[target], next[focus.r]];
      return next;
    });
    moveFocus(target, focus.c);
  };

  const addCol = (offset) => {
    const index = focus.c + offset;
    setGrid((prev) =>
      prev.map((row) => [...row.slice(0, index), "", ...row.slice(index)]),
    );
    setAligns((prev) => [...prev.slice(0, index), null, ...prev.slice(index)]);
    moveFocus(focus.r, index);
  };

  const deleteCol = () => {
    if (colCount <= 1) return;
    setGrid((prev) => prev.map((row) => row.filter((_, ci) => ci !== focus.c)));
    setAligns((prev) => prev.filter((_, ci) => ci !== focus.c));
    moveFocus(focus.r, Math.min(focus.c, colCount - 2));
  };

  const cycleAlign = (c) =>
    setAligns((prev) =>
      prev.map((align, ci) =>
        ci === c
          ? ALIGN_CYCLE[(ALIGN_CYCLE.indexOf(align) + 1) % ALIGN_CYCLE.length]
          : align,
      ),
    );

  const handleKeyDown = (e, r, c) => {
    if (e.nativeEvent?.isComposing) return;
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
      return;
    }
    if (e.key === "Enter" || e.key === "ArrowDown") {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (r > 0) moveFocus(r - 1, c);
        return;
      }
      e.preventDefault();
      if (r + 1 < grid.length) {
        moveFocus(r + 1, c);
      } else if (e.key === "Enter") {
        setGrid((prev) => [...prev, Array(colCount).fill("")]);
        moveFocus(r + 1, c);
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (r > 0) moveFocus(r - 1, c);
    }
  };

  const handlePaste = (e, r, c) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text || (!text.includes("\t") && !text.includes("\n"))) return;
    e.preventDefault();
    const pasted = text
      .replace(/\r\n?/g, "\n")
      .replace(/\n+$/, "")
      .split("\n")
      .map((line) => line.split("\t"));
    const neededCols = Math.max(
      colCount,
      c + Math.max(...pasted.map((l) => l.length)),
    );
    const neededRows = Math.max(grid.length, r + pasted.length);
    setGrid((prev) => {
      const next = Array.from({ length: neededRows }, (_, ri) =>
        Array.from({ length: neededCols }, (_, ci) => prev[ri]?.[ci] ?? ""),
      );
      pasted.forEach((line, pr) =>
        line.forEach((value, pc) => {
          next[r + pr][c + pc] = value.trim();
        }),
      );
      return next;
    });
    setAligns((prev) =>
      Array.from({ length: neededCols }, (_, ci) => prev[ci] ?? null),
    );
  };

  const handleSave = () => {
    const [headers, ...rows] = grid;
    onSave({ headers, aligns, rows });
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="md-down">
      <Modal.Header closeButton className="p-2">
        <Modal.Title className="fs-6">Edit Table</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <ButtonGroup size="sm">
            <Button variant="outline-secondary" onClick={() => addRow(0)}>
              Row above
            </Button>
            <Button variant="outline-secondary" onClick={() => addRow(1)}>
              Row below
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => moveRow(-1)}
              disabled={focus.r <= 1}
              title="Move row up"
            >
              ↑
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => moveRow(1)}
              disabled={focus.r === 0 || focus.r >= grid.length - 1}
              title="Move row down"
            >
              ↓
            </Button>
            <Button
              variant="outline-danger"
              onClick={deleteRow}
              disabled={focus.r === 0}
            >
              Delete row
            </Button>
          </ButtonGroup>
          <ButtonGroup size="sm">
            <Button variant="outline-secondary" onClick={() => addCol(0)}>
              Column left
            </Button>
            <Button variant="outline-secondary" onClick={() => addCol(1)}>
              Column right
            </Button>
            <Button
              variant="outline-danger"
              onClick={deleteCol}
              disabled={colCount <= 1}
            >
              Delete column
            </Button>
          </ButtonGroup>
        </div>
        <div style={{ overflow: "auto", maxHeight: "65vh" }}>
          <table className="table table-sm table-bordered mb-0 w-auto">
            <thead>
              <tr>
                {aligns.map((align, c) => (
                  <th key={c} className="p-0 text-center bg-body-tertiary">
                    <Button
                      variant="link"
                      size="sm"
                      className="py-0 text-decoration-none"
                      title={`Alignment: ${align || "default"}`}
                      onClick={() => cycleAlign(c)}
                    >
                      {ALIGN_LABEL[align]}
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`p-0 ${
                        focus.r === r && focus.c === c ? "table-active" : ""
                      }`}
                    >
                      <Form.Control
                        ref={(el) => {
                          inputRefs.current[`${r}:${c}`] = el;
                        }}
                        size="sm"
                        dir="auto"
                        value={cell}
                        onChange={(e) => updateCell(r, c, e.target.value)}
                        onFocus={() => setFocus({ r, c })}
                        onKeyDown={(e) => handleKeyDown(e, r, c)}
                        onPaste={(e) => handlePaste(e, r, c)}
                        className={`border-0 rounded-0 ${
                          r === 0 ? "fw-bold bg-body-tertiary" : ""
                        }`}
                        style={{
                          minWidth: "8rem",
                          textAlign: aligns[c] || undefined,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TableEditorModal;
