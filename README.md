# ImperialAIHack-

COGNIT: a real-time university Python assessment prototype. See [MASTER_PLAN.md](MASTER_PLAN.md).

Run the backend first, then the frontend, in two terminals.

## Backend

FastAPI + SQLite, in [`backend/`](backend/). It uses the shared AI services in [`cognit_ai/`](cognit_ai/) and the contracts in [`contracts/`](contracts/). Python 3.12 (as in the `Dockerfile`; also tested locally on 3.13).

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
copy .env.example .env                           # macOS/Linux: cp. Add ANTHROPIC_API_KEY, or set COGNIT_AI_ENABLED=false
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

With `COGNIT_AI_ENABLED=false` nothing calls the API: the tutor and grader use safe fallbacks, and grades are flagged for teacher review.

See [`backend/README.md`](backend/README.md) for tests, the question bank, deployment (Dockerfile) and the endpoint list.

## Frontend

Vite + React + TypeScript + Monaco + Tailwind, in [`frontend/`](frontend/). Requires Node 20+.

```bash
cd frontend
npm install
cp .env.example .env   # optional: VITE_API_BASE_URL (empty = same origin via the dev proxy)
npm run dev            # http://localhost:5173
```

The frontend needs the backend running. In dev, Vite proxies `/api` and `/health` to `http://localhost:8000`, so `VITE_API_BASE_URL` can be left empty, or set to `http://localhost:8000` (CORS allows it). `VITE_API_URL` is accepted as an alias. When deployed, set `VITE_API_BASE_URL` to the backend's URL, and set the backend's `ALLOWED_ORIGINS` to the frontend's URL. Monaco and Pyodide both load from the jsDelivr CDN, so a network connection is needed. `npm run build` type-checks and builds to `frontend/dist/`; `npm run lint` runs oxlint.

### Student (`/student`)
- **Session:** start with an alias (demo only, no real names). The session id and drafts are kept in `localStorage`, so a refresh resumes where you were (`GET /api/session/{id}`).
- **Code tab:**
  - Monaco editor and an explanation box. **Run** with Ctrl/Cmd+Enter; **Submit** with Ctrl/Cmd+Shift+Enter.
  - Submit re-runs the example tests, then sends the code, explanation, attached plan, browser test results and help log to `POST /api/attempt`, with an `Idempotency-Key`.
  - The result card shows the provisional score (code /70 + explanation /30), flags and the next step. **Next question** calls `POST /api/next`, and a banner says why that question was chosen (transfer, harder, same or remedial).
- **Reference tab:** docs lookup (`mode: lookup`). Available at any time; shows the decision, reason and docs.python.org sources.
- **Hints and Plan Mode:** unlock after the first attempt on each question (the server's `allowed_help`).
  - **Hints** follow a ladder of 3.
  - **Plan Mode:** the student writes their own plan, and the planner raises one issue at a time. "Use this plan" attaches it to the next attempt.
  - Both mark the question as assisted.

### Teacher (`/teacher?session=<id>`)
Demo only: no authentication and no real student data. It reads `GET /api/teacher/session/{id}` and shows:
- a review queue;
- the difficulty-weighted score breakdown;
- assisted vs independent means and the transfer gap;
- mastery by skill (labelled as a heuristic indicator);
- an expandable attempt log: code, explanation, plan, browser test results, the AI rubric breakdown and the audit history;
- the help log.

Teachers can override or approve the concept score with a required note (`POST /api/teacher/review`). Every review is kept as an append-only audit record.

### Running Python (D2)
**Run** executes the student's code with [Pyodide](https://pyodide.org) (pinned version in `src/runner/pyodide.worker.ts`) inside a Web Worker, following [`backend/RUNNER_CONTRACT.md`](backend/RUNNER_CONTRACT.md):
- each example test calls `fn(*input)`. It passes only when the result has the **same type** and value as `expected`, matching `backend/app/scoring.py`. Result ids are `example-1`, `example-2`, …
- a fresh worker for every run, with a pre-loaded spare so runs don't wait for Python to download again;
- timeouts: 2 s per test (or top-level code) and 5 s per run, starting once Python has loaded. A runaway loop gets its worker terminated, and the page stays responsive;
- syntax errors, exceptions (with traceback), a missing function, `print()` output and blocked imports (`os`, `sys`, `subprocess`, `socket`, `js`, `pyodide`, `importlib`, `__import__`) all produce readable results.

The test harness is plain Python (`src/runner/harness.py`), so you can exercise it with CPython.

**In-browser execution is a prototype only. It is not a secure exam sandbox**: the import block is best effort, and results sent to the API are untrusted evidence.
