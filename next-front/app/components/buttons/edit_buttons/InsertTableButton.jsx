import React, { useState } from "react";
import { Dropdown } from "react-bootstrap";

const MAX_ROWS = 6;
const MAX_COLS = 8;

const InsertTableButton = ({ onInsert, className, size }) => {
  const [show, setShow] = useState(false);
  const [hover, setHover] = useState({ rows: 0, cols: 0 });

  const pick = (rows, cols) => {
    onInsert(Math.max(1, rows - 1), cols);
    setShow(false);
    setHover({ rows: 0, cols: 0 });
  };

  return (
    <Dropdown show={show} onToggle={(next) => setShow(next)}>
      <Dropdown.Toggle
        variant="outline-secondary"
        size={size}
        className={className}
        title="Insert Table"
      >
        ▦
      </Dropdown.Toggle>
      <Dropdown.Menu className="p-2">
        <div
          className="d-grid gap-1"
          style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 18px)` }}
          onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
        >
          {Array.from({ length: MAX_ROWS }, (_, r) =>
            Array.from({ length: MAX_COLS }, (_, c) => {
              const active = r < hover.rows && c < hover.cols;
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  aria-label={`${c + 1} × ${r + 1}`}
                  className={`border rounded-1 p-0 ${
                    active ? "bg-primary border-primary" : "bg-body"
                  }`}
                  style={{ width: 18, height: 18 }}
                  onMouseEnter={() => setHover({ rows: r + 1, cols: c + 1 })}
                  onFocus={() => setHover({ rows: r + 1, cols: c + 1 })}
                  onClick={() => pick(r + 1, c + 1)}
                />
              );
            }),
          )}
        </div>
        <div className="text-center small text-body-secondary mt-2">
          {hover.cols ? `${hover.cols} × ${hover.rows}` : "Insert table"}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default InsertTableButton;
