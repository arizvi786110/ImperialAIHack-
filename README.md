# Cognit | Imperial AI Hackathon

Cognit is a **demo-only Python assessment** designed to distinguish executable answers from explanations of the underlying concept. Students can run code in a browser, use restricted reference help, and submit reasoning for provisional AI grading and teacher review.

## One-URL team demo

The root [Dockerfile](Dockerfile) builds the React app and serves it through FastAPI on **one origin**. For a shared HTTPS link, follow [docs/TEAM_DEPLOY.md](docs/TEAM_DEPLOY.md). It includes Railway setup, persistent SQLite storage, and a real browser acceptance checklist.

Routes: `/student`, `/teacher`, `/api/*`, `/health`.

## Local run (single URL)

Requires Python 3.11+ and Node 24+.

```sh
python -m pip install -r backend/requirements.txt -r requirements.txt
cd frontend
npm install
npm run build
cd ..
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000/student**. The React bundle and FastAPI live in the same process.

For development with hot reload, run `npm run dev` from `frontend/` (http://localhost:5173) and FastAPI on port 8000. Vite proxies `/api` and `/health` to FastAPI, so `VITE_API_BASE_URL` can be left empty (`VITE_API_URL` is accepted as an alias). If the frontend is hosted separately, set `VITE_API_BASE_URL` to the backend's URL and the backend's `ALLOWED_ORIGINS` to the frontend's URL. Monaco and Pyodide both load from the jsDelivr CDN, so a network connection is needed. `npm run lint` runs oxlint.

See [`backend/README.md`](backend/README.md) for the question bank and the endpoint list.

## Demo questions

Starts with **Count even numbers**. There are six simple curated tasks across loops, hashing and complexity, with paired transfer tasks. All browser test reports remain **untrusted**, and the teacher dashboard has **no authentication**. Use synthetic student data only.

## Student (`/student`)

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

## Teacher (`/teacher?session=<id>`)

Demo only: no authentication and no real student data. It reads `GET /api/teacher/session/{id}` and shows:
- a review queue;
- the difficulty-weighted score breakdown;
- assisted vs independent means and the transfer gap;
- mastery by skill (labelled as a heuristic indicator);
- an expandable attempt log: code, explanation, plan, browser test results, the AI rubric breakdown and the audit history;
- the help log.

Teachers can override or approve the concept score with a required note (`POST /api/teacher/review`). Every review is kept as an append-only audit record.

## Running Python in the browser

**Run** executes the student's code with [Pyodide](https://pyodide.org) (pinned version in `frontend/src/runner/pyodide.worker.ts`) inside a Web Worker, following [`backend/RUNNER_CONTRACT.md`](backend/RUNNER_CONTRACT.md):
- each example test calls `fn(*input)`. It passes only when the result has the **same type** and value as `expected`, matching `backend/app/scoring.py`. Result ids are `example-1`, `example-2`, …
- a fresh worker for every run, with a pre-loaded spare so runs don't wait for Python to download again;
- timeouts: 2 s per test (or top-level code) and 5 s per run, starting once Python has loaded. A runaway loop gets its worker terminated, and the page stays responsive;
- syntax errors, exceptions (with traceback), a missing function, `print()` output and blocked imports (`os`, `sys`, `subprocess`, `socket`, `js`, `pyodide`, `importlib`, `__import__`) all produce readable results.

The test harness is plain Python (`frontend/src/runner/harness.py`), so you can exercise it with CPython.

**In-browser execution is a prototype only. It is not a secure exam sandbox**: the import block is best effort, and results sent to the API are untrusted evidence.

## Tests

```sh
python backend/scripts/validate_bank.py
python backend/scripts/smoke_e2e.py
python backend/scripts/smoke_persistence.py
python backend/scripts/smoke_failures.py
python -m pytest -q tests --ignore=tests/test_live_tutor.py
```

The GitHub Actions workflow also builds the frontend, checks single-origin routes, and builds the deployment Docker image.

## AI configuration

The app operates without model credits with `COGNIT_AI_ENABLED=false`: concept scores are provisional zero, flagged for teacher review. For live grading, put a **new, private** `ANTHROPIC_API_KEY` in the hosting service's environment and set `COGNIT_AI_ENABLED=true`. Never commit API keys.

See [MASTER_PLAN.md](MASTER_PLAN.md) for team ownership and product scope. **This is not a cheat-proof exam or a psychometrically validated assessment.**
