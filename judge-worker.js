importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');

let pyodide;

async function initialize() {
  try {
    pyodide = await loadPyodide();
    self.postMessage({ type: 'ready' });
  } catch (error) {
    self.postMessage({ type: 'load-error', error: String(error) });
  }
}

initialize();

self.onmessage = async (event) => {
  if (event.data.type !== 'judge' || !pyodide) return;
  const { code, tests } = event.data;
  const results = [];

  try {
    for (const [input, expected] of tests) {
      pyodide.globals.set('__student_code', code);
      pyodide.globals.set('__test_input', input);
      const actual = await pyodide.runPythonAsync(`
import sys, io, contextlib
_output = io.StringIO()
_namespace = {"__name__": "__main__"}
try:
    with contextlib.redirect_stdout(_output):
        with contextlib.redirect_stderr(_output):
            sys.stdin = io.StringIO(__test_input)
            exec(compile(__student_code, "main.py", "exec"), _namespace)
except SystemExit:
    pass
_output.getvalue()
      `);
      const normalizedActual = String(actual).trim();
      const normalizedExpected = expected.trim();
      results.push({ pass: normalizedActual === normalizedExpected, actual: normalizedActual });
    }
    self.postMessage({ type: 'result', results });
  } catch (error) {
    self.postMessage({ type: 'result', error: String(error), errorName: error.name });
  }
};
