# COGNIT backend (FastAPI)

## Run locally
```
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt      # macOS/Linux: .venv/bin/pip
copy .env.example .env                              # then fill in ANTHROPIC_API_KEY (never commit .env)
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs. Data: SQLite at `backend/cognit.db` (auto-created; delete it to reset).

No API key? Set `COGNIT_AI_ENABLED=false`: the tutor and grader use safe fallbacks and grades are flagged for teacher review.

## Tests (no API spend)
```
backend\.venv\Scripts\python backend\scripts\smoke_e2e.py          # full student + teacher journey, 35 checks
backend\.venv\Scripts\python backend\scripts\smoke_failures.py     # AI down / bad JSON / injection / #2 / #4, mocked model, 29 checks
backend\.venv\Scripts\python backend\scripts\smoke_persistence.py  # all 7 tables persist + reload, secret checks
backend\.venv\Scripts\python -m pytest -q tests --ignore=tests/test_live_tutor.py   # Shreyaa's AI service tests
```

## Question bank
The backend always loads Shreyaa's 6 vetted templates (loops / hashing / complexity, each with a transfer partner).
To add hand-written questions (Ahmed's H1):

1. Copy `app/data/bank.example.json` to `app/data/bank.json` and replace the questions. Rules:
   - `input` is a **list of positional args**: `f(values, target)` → `[[1, 2], 2]`.
   - A transfer question sets `transfer_id` to the id of the question it transfers **from**, and shares a skill tag with it.
   - `"start"` is the first question students get (should be difficulty 1). Only `"review_status": "vetted"` questions are served.
2. Check it: `backend\.venv\Scripts\python backend\scripts\validate_bank.py`. This checks structure and runs each reference solution against all its tests in an isolated process (offline only; the server never runs question or student code).
3. Restart the server. If `bank.json` is invalid, the server refuses to start and lists the errors.

## Deploy
A `Dockerfile` at the repo root builds the backend (it needs `cognit_ai/` and `contracts/` from the root). It works on Render, Railway or Fly.io.

| Host setting | Value |
|---|---|
| Build | Dockerfile at repo root (`docker build -t cognit-backend .`) |
| Start command (if not using Docker) | from `backend/`: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `GET /health` |
| `ALLOWED_ORIGINS` | the deployed frontend URL, e.g. `https://cognit.vercel.app` |
| `DATABASE_URL` | `sqlite:////data/cognit.db`, with a **persistent disk mounted at `/data`**. Without one, data is lost on every redeploy. |
| `ANTHROPIC_API_KEY`, `COGNIT_*` | set in the host's secret/env settings; **never** in the repo or image |

The image excludes `.env`, databases, the frontend and tests (`.dockerignore`).

## Endpoints
All responses: `{ok, data?, error?:{code,message}}`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| POST | `/api/session/start` | New session + first question |
| GET | `/api/session/{id}` | Reload progress after refresh |
| POST | `/api/attempt` | Submit code + explanation + browser test results → scores, flags, next action. Optional `Idempotency-Key` header |
| POST | `/api/assist` | Lookup / Plan Mode / Hint (Hint and Plan need a prior attempt) |
| POST | `/api/next` | Next question: transfer / harder / same / remedial |
| GET | `/api/teacher/session/{id}` | Dashboard data (demo only, no auth) |
| POST | `/api/teacher/review` | Override/approve concept score, append-only audit log |

Browser runner format: see [RUNNER_CONTRACT.md](RUNNER_CONTRACT.md).

## Design notes / limitations
- Student code never runs on the server (nor do question reference solutions; those only run in the offline `validate_bank.py`). Browser test results are **untrusted**; hidden tests aren't run yet.
- **Scoring is a temporary stand-in** (`app/scoring.py`) until Ahmed's `scoring.py`: 70 code points scaled from example tests + 30 concept points from the AI grader. Difficulty weights x1 / x1.5 / x2.
- "Assisted" = Hint or Plan Mode used on that question (server log). Docs Lookup doesn't count.
- AI grades are provisional; low-confidence or unavailable grades are flagged for teacher review.
- Guards: rate limits (10 attempts, 20 assists per minute per session), session caps (40 attempts, 40 assists, 8 questions).
- The API key is read only by `cognit_ai/provider.py` from the environment; it's never stored, logged or returned.
