# A4: Browser runner ↔ backend contract

**Status: implemented (DS sign-off).** Runner: `frontend/src/runner/` (`pyodideRunner.ts`, `pyodide.worker.ts`, `harness.py`). Backend check: `backend/app/scoring.py`. This document describes what they actually do. Structure and scoring section are adapted from Aalia's `backend/a4-runner-sync` version.

Student code runs **only** in the browser (Pyodide 314.0.8 in a Web Worker). The backend never executes student code. Browser results are **untrusted evidence**: this is a prototype, not a secure exam sandbox.

## What the browser receives
`question.example_tests`: a list of `{input, expected}`.

- `input` is a **list of positional arguments**: `count_even([1, 2, 3])` → `input: [[1, 2, 3]]`; `count_target([1,2,2], 2)` → `input: [[1,2,2], 2]`.
- The function name comes from `question.function_signature`.
- Hidden tests are **never** sent to the browser. The code score is scaled from example tests only; the API adds the flag `server_tests_not_run`.

## What the browser runs
- **A fresh worker per Run/Submit**, terminated afterwards.
  - One spare worker is preloaded when the page opens. It has loaded Python but never run code, so runs don't wait for the ~10 MB Pyodide download.
- **Execution:** the student's file is executed once (top-level code), then `result = fn(*deepcopy(input))` for each example test.
- **Pass rule:** `pass` is true only if `type(result) is type(expected) and result == expected`. This is the same rule as `scoring.py`, so `True` doesn't count as `1`, and `1.0` doesn't count as `1`.
- **`print()` output:** captured per test (first 2,000 characters) and shown in the UI. It isn't sent to the backend.
- **Timeouts:** they start only once Python has loaded, so a slow first download can't time out a run.
  - **2 s per step:** top-level code, or one test.
  - **5 s for the whole run.**
  - On timeout the worker is terminated. Finished results are kept, and the remaining tests are reported as timed out.
- **Imports blocked (best effort, not security):** `os`, `sys`, `subprocess`, `socket`, `js`, `pyodide`, `pyodide_js`, `importlib`, and calls to `__import__`.
- **Submit:**
  - The tests are re-run on the exact code being submitted.
  - Each click sends an `Idempotency-Key` header, so a double click or a retry doesn't grade twice.

## What the browser sends to `POST /api/attempt`
`client_test_results`: one entry per example test, in order:

```json
{"id": "example-1", "pass": true,  "actual": 2,    "error": null}
{"id": "example-2", "pass": false, "actual": 4,    "error": null}
```

| Case | `pass` | `actual` | `error` |
|---|---|---|---|
| Correct | `true` | return value | `null` |
| Wrong answer (incl. wrong type, e.g. `True` for `1`) | `false` | return value | `null` |
| Return value JSON can't represent exactly (tuple, set, object) | `false` | its `repr()` string, e.g. `"(1, 2)"` | `null` |
| Exception in a test | `false` | `null` | `IndexError: list index out of range` (last line; full student-only traceback shown in the UI) |
| Syntax error | `false` for all | `null` | `SyntaxError: expected ':' (line 1)` |
| Wrong / missing function name | `false` for all | `null` | `NameError: function 'count_even' not defined` |
| Exception in top-level code | `false` for all | `null` | e.g. `ZeroDivisionError: division by zero` |
| `exit()` / `quit()` | `false` | `null` | `SystemExit: exit()/quit() stops the program; return a value instead` |
| Infinite loop / too slow | `false` for the current and remaining tests | `null` | `TIMEOUT: exceeded 2s` (or `TIMEOUT: run exceeded 5s`) |
| Blocked import | `false` for all | `null` | `BLOCKED_IMPORT: os` |
| Python failed to load (network) | not submitted | | the UI asks the student to retry |

## How the backend scores it (`app/scoring.py`, Ahmed's H3 verification)
- **Matching:** test `i` (1-based) is matched by id `example-i`. It counts only if **exactly one** result has that id, `pass` is true, `error` is empty, and `actual` equals the expected value **with the same type**.
- **Bad reports:** duplicate or invented results earn nothing for that test. Missing or extra results never crash grading.
- **Limits:** this catches inaccurate reports, but it **cannot prove** the student's code produced them; a determined user could fake them. Hence `client_tests_untrusted` on every attempt.
- **Flags:** every response's `flags` includes `client_tests_untrusted` and `server_tests_not_run`.

## Known gaps (prototype)
1. Pyodide loads from the jsDelivr CDN, so the first run needs a network connection.
2. Import blocking is an AST check on the submitted file. It is not a sandbox (for example, `eval` of a string can get around it).
