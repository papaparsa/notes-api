"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import styles from "../NoteCard.module.css";
import { runPython } from "../../../lib/pythonRuntime";
import { downloadCsv, tableElementToCsv } from "../../../utils/markdownTable";

const RUN_ALL_EVENT = "runNoteSnippets";

const STATUS_LABEL = {
  loading: "Loading Python…",
  running: "Running…",
};

const collectNoteTables = (root) =>
  root
    ? Array.from(root.querySelectorAll("table[data-table-index]"))
        .sort(
          (a, b) => Number(a.dataset.tableIndex) - Number(b.dataset.tableIndex),
        )
        .map(tableElementToCsv)
    : [];

const ResultTable = ({ value }) => {
  const tableRef = useRef(null);
  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableScroll}>
        <table
          ref={tableRef}
          className={`${styles.markdownTable} table table-sm table-bordered table-hover align-middle mb-0 w-auto`}
        >
          <thead>
            <tr>
              {value.columns.map((column, i) => (
                <th key={i}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {value.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {value.total > value.rows.length && (
          <div className="small text-body-secondary mt-1">
            Showing {value.rows.length} of {value.total} rows
          </div>
        )}
      </div>
      <div className={styles.tableActions}>
        <Button
          variant="outline-secondary"
          size="sm"
          className={styles.tableActionButton}
          title="Download as CSV"
          onClick={() =>
            tableRef.current &&
            downloadCsv(tableElementToCsv(tableRef.current), "result.csv")
          }
        >
          ⤓
        </Button>
      </div>
    </div>
  );
};

const RunnableCodeBlock = ({
  code,
  language,
  dfIndex,
  snippetCount,
  onCopy,
}) => {
  const containerRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const usePandas = language === "pandas";

  const run = async () => {
    if (status) return;
    const root = containerRef.current?.closest("[data-note-root]");
    setStatus("loading");
    try {
      const output = await runPython(code, {
        usePandas,
        tables: usePandas ? collectNoteTables(root) : [],
        dfIndex: usePandas && dfIndex >= 0 ? dfIndex : null,
        onStatus: setStatus,
      });
      setResult(output);
    } catch (error) {
      console.error("Snippet run failed", error);
      setResult({ error: String(error?.message || error), stdout: "" });
    } finally {
      setStatus(null);
    }
  };

  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const handleRunAll = (event) => {
      const root = containerRef.current?.closest("[data-note-root]");
      if (root && root === event.detail) runRef.current();
    };
    window.addEventListener(RUN_ALL_EVENT, handleRunAll);
    return () => window.removeEventListener(RUN_ALL_EVENT, handleRunAll);
  }, []);

  const runAll = () => {
    const root = containerRef.current?.closest("[data-note-root]");
    if (root) {
      window.dispatchEvent(new CustomEvent(RUN_ALL_EVENT, { detail: root }));
    }
  };

  const value = result?.value;

  return (
    <div ref={containerRef} className={styles.runnableBlock} dir="ltr">
      <div className="d-flex align-items-center gap-2 mb-1">
        <span className="badge text-bg-secondary">{language}</span>
        <Button
          variant="outline-success"
          size="sm"
          className="py-0"
          onClick={run}
          disabled={Boolean(status)}
        >
          ▶ Run
        </Button>
        {snippetCount > 1 && (
          <Button
            variant="outline-success"
            size="sm"
            className="py-0"
            onClick={runAll}
            disabled={Boolean(status)}
          >
            ▶▶ Run all
          </Button>
        )}
        <Button
          variant="outline-primary"
          size="sm"
          className="py-0"
          onClick={onCopy}
        >
          Copy
        </Button>
        {result && !status && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="py-0"
            onClick={() => setResult(null)}
          >
            Clear
          </Button>
        )}
        {status && (
          <span className="small text-body-secondary d-flex align-items-center gap-1">
            <Spinner animation="border" size="sm" />
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
      <pre className={`${styles.codeBlock} bg-body border mb-0`}>
        <code className={styles.codeSnippet}>{code}</code>
      </pre>
      {result && (
        <div className={`${styles.runnableResult} border border-top-0 p-2`}>
          {result.stdout && (
            <pre className="small mb-2 text-body-secondary">
              {result.stdout}
            </pre>
          )}
          {result.error && (
            <pre className="small mb-0 text-danger">{result.error}</pre>
          )}
          {value?.type === "table" && <ResultTable value={value} />}
          {value?.type === "text" && (
            <pre className="small mb-0">{value.text}</pre>
          )}
          {result.figures?.map((png, i) => (
            <img
              key={i}
              src={`data:image/png;base64,${png}`}
              alt={`Figure ${i + 1}`}
              className="img-fluid d-block my-2"
            />
          ))}
          {!result.error &&
            !result.stdout &&
            value?.type === "none" &&
            !result.figures?.length && (
              <span className="small text-body-secondary">No output</span>
            )}
        </div>
      )}
    </div>
  );
};

export default RunnableCodeBlock;
