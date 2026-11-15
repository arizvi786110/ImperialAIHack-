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

For development with hot reload, run `npm run dev` from `frontend/` and FastAPI on port 8000. Vite proxies `/api` to FastAPI.

## Demo questions

Starts with **Count even numbers**. There are six simple curated tasks across loops, hashing and complexity, with paired transfer tasks. All browser test reports remain **untrusted**, and the teacher dashboard has **no authentication**. Use synthetic student data only.

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
