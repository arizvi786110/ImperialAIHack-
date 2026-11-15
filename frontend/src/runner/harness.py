"""COGNIT browser test harness. Runs inside Pyodide in a Web Worker (see pyodide.worker.ts).

Implements backend/RUNNER_CONTRACT.md (A4), matching backend/app/scoring.py:
  - each example test calls  fn(*input)  and passes only when
    type(result) is type(expected) and result == expected   (so True doesn't count as 1)
  - result ids are "example-1", "example-2", ... (1-based)
  - syntax errors / blocked imports / missing function fail every test

Events are emitted as JSON strings via the `emit` callback so the main thread
receives per-test progress (and keeps partial results if it has to kill the
worker on a timeout). Timeouts are enforced by the main thread, not here.

PROTOTYPE ONLY: the import block is best effort, not a security boundary.
"""

import ast
import copy
import io
import json
import traceback
from contextlib import redirect_stderr, redirect_stdout

FILENAME = "solution.py"
MAX_STDOUT = 2000
# RUNNER_CONTRACT.md list (os, sys, subprocess, socket, js, pyodide.http), plus the
# other ways to reach the JS host or bypass the check.
BLOCKED_MODULES = {"os", "sys", "subprocess", "socket", "js", "pyodide", "pyodide_js", "importlib"}
BLOCKED_CALLS = {"__import__"}


def _blocked_import(tree):
    for node in ast.walk(tree):
        names = []
        if isinstance(node, ast.Import):
            names = [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            names = [node.module]
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALLS:
            return node.func.id
        for name in names:
            if name.split(".")[0] in BLOCKED_MODULES:
                return name
    return None


def _truncate(text):
    return text if len(text) <= MAX_STDOUT else text[:MAX_STDOUT] + "\n... (output truncated)"


def _last_line(exc):
    if isinstance(exc, SystemExit):
        return "SystemExit: exit()/quit() stops the program; return a value instead"
    lines = "".join(traceback.format_exception_only(type(exc), exc)).strip().splitlines()
    return lines[-1] if lines else type(exc).__name__


def _trace(exc):
    """Traceback limited to the student's own frames (hides harness internals)."""
    try:
        te = traceback.TracebackException.from_exception(exc)
        te.stack = traceback.StackSummary.from_list([f for f in te.stack if f.filename == FILENAME])
        return "".join(te.format()).strip()
    except Exception:  # pragma: no cover - formatting must never break a run
        return _last_line(exc)


def _json_safe(value, depth=0):
    """Return `value` if it round-trips through JSON unchanged, else its repr()."""

    def ok(v, d):
        if d > 20:
            return False
        if v is None or isinstance(v, (bool, int, str)):
            return True
        if isinstance(v, float):
            return v == v and v not in (float("inf"), float("-inf"))
        if type(v) is list:
            return all(ok(x, d + 1) for x in v)
        if type(v) is dict:
            return all(isinstance(k, str) and ok(x, d + 1) for k, x in v.items())
        return False  # tuples, sets, objects: show repr so "(1, 2)" isn't displayed as [1, 2]

    return value if ok(value, depth) else repr(value)


def run_all(code, fn_name, tests_json, emit):
    tests = json.loads(tests_json)

    def send(**event):
        emit(json.dumps(event))

    def fatal(error, trace=None, stdout=""):
        send(type="fatal", error=error, trace=trace, stdout=stdout)

    try:
        tree = ast.parse(code, FILENAME)
    except SyntaxError as e:
        return fatal(f"SyntaxError: {e.msg} (line {e.lineno})")

    blocked = _blocked_import(tree)
    if blocked:
        return fatal(f"BLOCKED_IMPORT: {blocked}")

    # Top-level code (definitions, stray prints, accidental infinite loops) is its own timed step.
    send(type="step", index=-1)
    namespace = {"__name__": "solution"}
    setup_out = io.StringIO()
    try:
        with redirect_stdout(setup_out), redirect_stderr(setup_out):
            exec(compile(tree, FILENAME, "exec"), namespace)
    except BaseException as e:  # includes SystemExit from exit()/quit()
        return fatal(_last_line(e), _trace(e), _truncate(setup_out.getvalue()))

    fn = namespace.get(fn_name)
    if not callable(fn):
        return fatal(f"NameError: function '{fn_name}' not defined", None, _truncate(setup_out.getvalue()))
    send(type="setup", stdout=_truncate(setup_out.getvalue()))

    for i, test in enumerate(tests):
        send(type="step", index=i)
        result = {"id": f"example-{i + 1}", "pass": False, "actual": None, "error": None}
        out = io.StringIO()
        trace = None
        try:
            args = copy.deepcopy(test.get("input"))
            if not isinstance(args, list):
                args = [args]  # contract says list of positional args; tolerate a bare value
            with redirect_stdout(out), redirect_stderr(out):
                value = fn(*args)
            result["actual"] = _json_safe(value)
            expected = test.get("expected")
            try:
                # Same rule as backend/app/scoring.py: exact type AND equal value.
                result["pass"] = type(value) is type(expected) and bool(value == expected)
            except Exception:
                result["pass"] = False
        except BaseException as e:
            result["error"] = _last_line(e)
            trace = _trace(e)
        send(type="test", index=i, result=result, stdout=_truncate(out.getvalue()), trace=trace)

    send(type="done")
