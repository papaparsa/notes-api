"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "react-bootstrap";
import styles from "../NoteCard.module.css";
import { runPython } from "../../../lib/pythonRuntime";
import { fetchWithAuth } from "../../../lib/api";
import { downloadCsv, tableElementToCsv } from "../../../utils/markdownTable";
import { safeUrlEncode } from "./UrlUtils";

const RUN_ALL_EVENT = "runNoteSnippets";

const DATA_FILE_EXTENSIONS = /\.(csv|tsv|txt|json|xlsx)$/i;
const FILE_LINK = /(?<!!)\[([^\]]*)\]\(([^)\s]*\/api\/note\/files\/[^)\s]*)\)/g;
const fileCache = new Map();
const attachedCache = new Map();

const fileKey = (href) => {
  const path = href.slice(href.indexOf("/api/note/files/"));
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

const findDataFiles = (noteText, attached = []) => {
  const linked = Array.from((noteText || "").matchAll(FILE_LINK)).map(
    ([, label, href]) => {
      const fallback = decodeURIComponent(href.split("/").pop() || "");
      return { label: label.trim() || fallback, href };
    },
  );
  const linkedKeys = new Set(linked.map(({ href }) => fileKey(href)));
  const used = new Set();
  return [
    ...linked,
    ...attached.filter(({ href }) => !linkedKeys.has(fileKey(href))),
  ]
    .filter(({ href }) => DATA_FILE_EXTENSIONS.test(fileKey(href)))
    .map(({ label, href }) => {
      const extension = fileKey(href).match(DATA_FILE_EXTENSIONS)[0];
      const named = DATA_FILE_EXTENSIONS.test(label) ? label : label + extension;
      const base = named.replace(/[\/\\]/g, "_");
      let name = base;
      for (let i = 2; used.has(name); i++) {
        name = base.replace(/(\.[^.]+)$/, `_${i}$1`);
      }
      used.add(name);
      return { name, href };
    });
};

const requestAttachedFiles = async (noteId) => {
  try {
    const response = await fetchWithAuth(`/api/note/message/${noteId}/files/`);
    if (!response.ok) return [];
    const files = await response.json();
    return files.map((file) => ({
      label: file.original_name || file.name,
      href: file.url,
    }));
  } catch (error) {
    console.error("Could not list attached files", error);
    return [];
  }
};

const fetchAttachedFiles = (noteId, refresh = false) => {
  if (!noteId) return Promise.resolve([]);
  if (refresh || !attachedCache.has(noteId)) {
    attachedCache.set(noteId, requestAttachedFiles(noteId));
  }
  return attachedCache.get(noteId);
};

const listDataFiles = async (noteText, noteId, refresh = false) =>
  findDataFiles(noteText, await fetchAttachedFiles(noteId, refresh));

const loaderSnippet = (name) => {
  const path = `files[${JSON.stringify(name)}]`;
  const extension = name.split(".").pop().toLowerCase();
  if (extension === "tsv") return `pd.read_csv(${path}, sep="\\t")`;
  if (extension === "xlsx") return `pd.read_excel(${path})`;
  if (extension === "json") return `pd.read_json(${path})`;
  if (extension === "txt") return `open(${path}).read()`;
  return `pd.read_csv(${path})`;
};

const fetchFileBytes = (href) => {
  const url = safeUrlEncode(href);
  if (!fileCache.has(url)) {
    const request = fetchWithAuth(url, {}, 60000).then((response) => {
      if (!response.ok) {
        throw new Error(`Could not download ${url} (${response.status})`);
      }
      return response.arrayBuffer();
    });
    request.catch(() => fileCache.delete(url));
    fileCache.set(url, request);
  }
  return fileCache.get(url);
};

const loadDataFiles = (files) =>
  Promise.all(
    files.map(async ({ name, href }) => ({
      name,
      bytes: await fetchFileBytes(href),
    })),
  );

const STATUS_LABEL = {
  files: "Fetching attached files…",
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
  noteText,
  noteId,
  onCopy,
  onCopyText,
}) => {
  const containerRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [dataFiles, setDataFiles] = useState(() => findDataFiles(noteText));
  const usePandas = language === "pandas";

  useEffect(() => {
    let active = true;
    listDataFiles(noteText, noteId).then((files) => {
      if (active) setDataFiles(files);
    });
    return () => {
      active = false;
    };
  }, [noteText, noteId]);

  const run = async () => {
    if (status) return;
    const root = containerRef.current?.closest("[data-note-root]");
    setStatus("files");
    try {
      const listed = await listDataFiles(noteText, noteId, true);
      setDataFiles(listed);
      const files = await loadDataFiles(listed);
      setStatus("loading");
      const output = await runPython(code, {
        usePandas,
        files,
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
      {dataFiles.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-1 mb-1 small">
          <span className="text-body-secondary">Files:</span>
          {dataFiles.map(({ name }) => (
            <Button
              key={name}
              variant="outline-secondary"
              size="sm"
              className={styles.fileChip}
              title={`Copy ${loaderSnippet(name)}`}
              onClick={() => onCopyText?.(loaderSnippet(name))}
            >
              📎 {name}
            </Button>
          ))}
        </div>
      )}
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
