# A4: Browser runner ↔ backend contract (DRAFT, needs DS sign-off)

Student code runs **only** in the browser (Pyodide in a Web Worker). The backend never executes student code. Results the browser sends are recorded as **untrusted evidence**: this is a prototype, not a secure exam sandbox.

## What the browser receives
`question.example_tests`: a list of `{input, expected}`.

- `input` is a **list of positional arguments**: `first_unique("aab")` → `input: ["aab"]`; `count_target([1,2,2], 2)` → `input: [[1,2,2], 2]`.
- The function name comes from `question.function_signature` (e.g. `def count_target(values, target):` → `count_target`).
- Hidden tests are **never** sent to the browser. For now the code score is scaled from example tests only (agreed); the API adds the flag `server_tests_not_run`.

## What the browser runs
For each example test `i`:

```
result = <function_name>(*input)
pass   = (result == expected)
```

Use a **fresh worker per Run/Submit**. Terminate the worker if a run exceeds the timeout.

| Setting | Proposed value |
|---|---|
| Per-test timeout | 2 s |
| Whole-run timeout (all tests) | 5 s, then terminate the worker and recreate it |
| Max captured stdout per test | 2,000 chars (truncate) |
| Disallowed imports (best effort, not security) | `os`, `sys`, `subprocess`, `socket`, `js`, `pyodide.http` |

## What the browser sends to `POST /api/attempt`
`client_test_results`: one entry per example test, in order:

```json
{"id": "ex0", "pass": true,  "actual": 0,    "error": null}
{"id": "ex1", "pass": false, "actual": 3,    "error": null}
```

| Case | `pass` | `actual` | `error` |
|---|---|---|---|
| Normal, correct | `true` | the return value (JSON-safe; else `repr()` string) | `null` |
| Normal, wrong | `false` | the return value | `null` |
| Exception | `false` | `null` | `"ValueError: message"` (last line of traceback; full trace may be shown in UI) |
| Syntax error (whole file) | `false` for every test | `null` | `"SyntaxError: ... (line N)"` |
| Wrong / missing function name | `false` for every test | `null` | `"NameError: function 'x' not defined"` |
| Timeout / infinite loop | `false` | `null` | `"TIMEOUT: exceeded 2s"` |
| Disallowed import | `false` for every test | `null` | `"BLOCKED_IMPORT: os"` |

- `id` = `"ex" + index` into `example_tests`. Duplicate ids are counted once.
- Send `Idempotency-Key: <uuid>` header on Submit (one uuid per click) so a double click or retry doesn't grade twice.
- `help_events` is optional context only; the server decides "assisted" from its own log.

## Backend guarantees
- Missing/extra results never crash grading; passed tests are capped at `len(example_tests)`.
- Every response's `flags` includes `client_tests_untrusted` and `server_tests_not_run`.
- Errors always come back as `{ok:false, error:{code, message}}`.

## Open questions for DS
1. Are the timeouts OK for Pyodide on a slow laptop (first load is slow; start the timer after Pyodide is ready)?
2. Show `stdout` in the UI only, or also send it? (Not sent at the moment: not needed for scoring.)
