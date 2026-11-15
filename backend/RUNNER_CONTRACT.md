# A4: Browser runner ↔ backend contract

**Status: implemented.** The runner lives in `frontend/src/runner/python.worker.js` and `pyodideRunner.ts`; the backend checks results in `backend/app/scoring.py`. This document describes what they actually do.

Student code runs **only** in the browser (Pyodide 0.27.7 in a Web Worker). The backend never executes student code. Browser results are **untrusted evidence**: this is a prototype, not a secure exam sandbox.

## What the browser receives
`question.example_tests`: a list of `{input, expected}`.

- `input` is a **list of positional arguments**: `count_even([1, 2, 3])` → `input: [[1, 2, 3]]`; `count_target([1,2,2], 2)` → `input: [[1,2,2], 2]`.
- The function name comes from `question.function_signature`.
- Hidden tests are **never** sent to the browser. The code score is scaled from example tests only; the API adds the flag `server_tests_not_run`.

## What the browser runs
- A **fresh worker per run**, terminated afterwards.
- The student's file is executed once, then `result = fn(*input)` for each example test.
- `pass` is true only if `type(result) is type(expected) and result == expected`, so `True` doesn't count as `1`.
- `print()` output is captured (first 2,000 chars) and shown in the UI. It isn't sent to the backend.
- **Timeout: 12 s for the whole run**, including Pyodide loading on the first run. Then the worker is terminated and every test is reported as `Timed out`.
- No import blocking (prototype).

## What the browser sends to `POST /api/attempt`
`client_test_results`: one entry per example test, in order:

```json
{"id": "example-1", "pass": true,  "actual": 2,    "error": null}
{"id": "example-2", "pass": false, "actual": 4,    "error": null}
```

| Case | `pass` | `actual` | `error` (examples verified against the worker's Python) |
|---|---|---|---|
| Correct | `true` | return value | `null` |
| Wrong answer | `false` | return value | `null` |
| Exception in a test | `false` | `null` | `IndexError: list index out of range` |
| Syntax error | `false` for all | `null` | `SyntaxError: expected ':' (<student>, line 1)` |
| Wrong / missing function name | `false` for all | `null` | `NameError: Function not defined: count_even` |
| Return value not JSON-serialisable (e.g. a set) | `false` | `null` | `TypeError: Object of type set is not JSON serializable` |
| Infinite loop / too slow | `false` for all | `null` | `Timed out` (worker terminated after 12 s) |

## How the backend scores it (`app/scoring.py`)
- Test `i` (1-based) is matched by id `example-i`. It counts only if **exactly one** result has that id, `pass` is true, `error` is empty, and `actual` equals the expected value **with the same type**.
- Duplicate or invented results earn nothing for that test. Missing or extra results never crash grading.
- This catches inaccurate reports, but it **cannot prove** the student's code produced them (a determined user could fake them). Hence `client_tests_untrusted` on every attempt.
- Every response's `flags` includes `client_tests_untrusted` and `server_tests_not_run`.

## Known gaps (prototype)
1. The 12 s budget includes the first Pyodide download (~10 MB from the CDN). On a slow connection the first run can time out. Preloading Pyodide on page load would fix this.
2. The frontend doesn't send an `Idempotency-Key` header on Submit yet. The backend supports it (duplicate submits return the original result), and adding it to `submitAttempt` in `frontend/src/api/client.ts` would turn it on.
