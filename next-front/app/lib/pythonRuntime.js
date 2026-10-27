const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
const RUN_TIMEOUT_MS = 60000;
const LOAD_TIMEOUT_MS = 180000;

const PYTHON_HELPERS = `
import ast, io, json, os, sys, traceback, base64, warnings
os.environ.setdefault("MPLBACKEND", "AGG")
warnings.filterwarnings("ignore", message=".*[Pp]yarrow.*")

MAX_ROWS = 500

def __cell(value):
    try:
        import pandas as pd
        if pd.isna(value):
            return ""
    except (ImportError, TypeError, ValueError):
        pass
    return str(value)

def __format_value(value):
    if value is None:
        return {"type": "none"}
    if "pandas" in sys.modules:
        import pandas as pd
        if isinstance(value, pd.Series):
            value = value.to_frame()
        if isinstance(value, pd.DataFrame):
            frame = value
            if not isinstance(frame.index, pd.RangeIndex) or frame.index.name is not None:
                frame = frame.reset_index()
            columns = [" / ".join(map(str, c)) if isinstance(c, tuple) else str(c) for c in frame.columns]
            rows = [[__cell(v) for v in row] for row in frame.head(MAX_ROWS).itertuples(index=False)]
            return {"type": "table", "columns": columns, "rows": rows, "total": len(frame)}
    return {"type": "text", "text": repr(value)}

def __collect_figures():
    if "matplotlib.pyplot" not in sys.modules:
        return []
    import matplotlib.pyplot as plt
    images = []
    for number in plt.get_fignums():
        buffer = io.BytesIO()
        plt.figure(number).savefig(buffer, format="png", bbox_inches="tight")
        images.append(base64.b64encode(buffer.getvalue()).decode())
    plt.close("all")
    return images

def __format_error(error):
    frames = [f for f in traceback.extract_tb(error.__traceback__) if f.filename == "<snippet>"]
    lines = ["Traceback (most recent call last):\\n"] if frames else []
    lines += traceback.format_list(frames)
    lines += traceback.format_exception_only(type(error), error)
    return "".join(lines)

def __run_snippet(code, tables_csv, df_index, use_pandas, file_names):
    namespace = {"__name__": "__main__", "files": {name: "/files/" + name for name in file_names}}
    try:
        if use_pandas:
            import pandas as pd
            tables = [pd.read_csv(io.StringIO(csv)) for csv in tables_csv]
            namespace["pd"] = pd
            namespace["tables"] = tables
            namespace["df"] = tables[df_index] if df_index is not None and 0 <= df_index < len(tables) else None
        tree = ast.parse(code, "<snippet>")
        last = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last = ast.Expression(tree.body.pop().value)
        exec(compile(tree, "<snippet>", "exec"), namespace)
        value = eval(compile(last, "<snippet>", "eval"), namespace) if last else None
        return json.dumps({"value": __format_value(value), "figures": __collect_figures()})
    except BaseException as error:
        __collect_figures()
        return json.dumps({"error": __format_error(error)})
`;

const WORKER_SOURCE = `
importScripts("${PYODIDE_INDEX_URL}pyodide.js");

const ready = loadPyodide({ indexURL: "${PYODIDE_INDEX_URL}" }).then(async (pyodide) => {
  await pyodide.runPythonAsync(${JSON.stringify(PYTHON_HELPERS)});
  return pyodide;
});

let queue = Promise.resolve();

const run = async ({ id, code, tables, dfIndex, usePandas, files }) => {
  self.postMessage({ id, type: "status", status: "loading" });
  const pyodide = await ready;
  if (usePandas) await pyodide.loadPackage("pandas");
  if (usePandas && /read_excel/.test(code)) await pyodide.loadPackage("openpyxl");
  await pyodide.loadPackagesFromImports(code);
  pyodide.FS.mkdirTree("/files");
  for (const name of pyodide.FS.readdir("/files")) {
    if (name !== "." && name !== "..") pyodide.FS.unlink("/files/" + name);
  }
  for (const file of files) {
    pyodide.FS.writeFile("/files/" + file.name, new Uint8Array(file.bytes));
  }
  let stdout = "";
  pyodide.setStdout({ batched: (line) => { stdout += line + "\\n"; } });
  pyodide.setStderr({ batched: (line) => { stdout += line + "\\n"; } });
  self.postMessage({ id, type: "status", status: "running" });
  const runner = pyodide.globals.get("__run_snippet");
  const output = runner(
    code,
    pyodide.toPy(tables),
    dfIndex,
    usePandas,
    pyodide.toPy(files.map((file) => file.name)),
  );
  runner.destroy();
  self.postMessage({ id, type: "done", result: { ...JSON.parse(output), stdout } });
};

self.onmessage = (event) => {
  queue = queue.then(() =>
    run(event.data).catch((error) =>
      self.postMessage({
        id: event.data.id,
        type: "done",
        result: { error: String(error?.message || error), stdout: "" },
      }),
    ),
  );
};
`;

let worker = null;
let nextId = 1;
const pending = new Map();

const failAll = (message) => {
  pending.forEach(({ resolve, timer }) => {
    clearTimeout(timer);
    resolve({ error: message, stdout: "" });
  });
  pending.clear();
};

const resetWorker = (message) => {
  worker?.terminate();
  worker = null;
  failAll(message);
};

const getWorker = () => {
  if (worker) return worker;
  const url = URL.createObjectURL(
    new Blob([WORKER_SOURCE], { type: "text/javascript" }),
  );
  worker = new Worker(url);
  worker.onmessage = ({ data }) => {
    const job = pending.get(data.id);
    if (!job) return;
    if (data.type === "status") {
      job.onStatus?.(data.status);
      if (data.status === "running") {
        clearTimeout(job.timer);
        job.timer = setTimeout(
          () =>
            resetWorker(
              `Stopped: the code ran longer than ${RUN_TIMEOUT_MS / 1000}s. Python was restarted.`,
            ),
          RUN_TIMEOUT_MS,
        );
      }
      return;
    }
    clearTimeout(job.timer);
    pending.delete(data.id);
    job.resolve(data.result);
  };
  worker.onerror = (event) => {
    console.error("Python worker error", event);
    resetWorker(event.message || "Python failed to load.");
  };
  return worker;
};

export const runPython = (
  code,
  { tables = [], dfIndex = null, usePandas = false, files = [], onStatus } = {},
) =>
  new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(
      () =>
        resetWorker(
          `Python didn't finish loading within ${LOAD_TIMEOUT_MS / 1000}s. Check the browser console and network tab for cdn.jsdelivr.net.`,
        ),
      LOAD_TIMEOUT_MS,
    );
    pending.set(id, { resolve, onStatus, timer });
    try {
      getWorker().postMessage({ id, code, tables, dfIndex, usePandas, files });
    } catch (error) {
      console.error("Could not start Python", error);
      resetWorker(`Could not start Python: ${error?.message || error}`);
    }
  });

export const restartPython = () => resetWorker("Python was restarted.");
