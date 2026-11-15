# COGNIT: one public URL for the four teammates

This repo now builds **React + FastAPI into one Docker service**. A deploy serves:
- `/`, `/student`: student editor, test execution in browser Pyodide
- `/teacher`: actual saved attempts and teacher score reviews (DEMO ONLY, unauthenticated)
- `/api/*`: the FastAPI backend
- `/health`: health check

## Recommended: Railway, one service

1. Connect [the team repository](https://github.com/arizvi786110/ImperialAIHack-) to a new Railway project using **Deploy from GitHub**. Choose the `main` branch and set root directory to repository root `/`.
2. Railway detects the root `Dockerfile` and builds the frontend and backend together. Do **not** set a custom frontend root or separate frontend service.
3. In service settings, configure **Healthcheck Path** to `/health`, then **Networking -> Generate Domain**. Share the resulting HTTPS URL with the team.
4. For persistent sessions, **attach a volume** to the service, mounted at `/data`, and add these service variables:
   - `DATABASE_URL=sqlite:////data/cognit.db`
   - `COGNIT_AI_ENABLED=false` (for a reliable no-spend demo)
   - `RAILWAY_RUN_UID=0` (Railway currently mounts volumes as root, which a non-root service otherwise may not be able to write)
5. Choose one instance only when using a SQLite volume. Confirm the deployed `/health` returns a 2xx response.
6. Open `https://<your-generated-domain>/student` and start a synthetic assessment. Ask each teammate to open the same base URL on their device. For a shared teacher dashboard, paste the exact session ID or use the student and teacher links in the **same browser**.

**No persistent volume?** For an urgent demo, the app can start with its default SQLite in the container. Sessions may disappear on restarts and redeployments. Do not describe that as persistent hosting.

## Live grading

Until an **entirely new** Anthropic key is added securely in Railway service Variables, leave `COGNIT_AI_ENABLED=false`. Concept grading then returns zero with a human-review flag. Do not expose keys in GitHub, frontend or team chat. The previously disclosed key should be revoked.

When a replacement key is configured, set `COGNIT_AI_ENABLED=true` and verify a real conceptual grade. This is an additional cost-bearing capability, not automatically proven by CI.

## Safety and limitations

The teacher dashboard has **no authentication**. Share a demo with synthetic aliases and fake student submissions only. Anyone who knows a session ID can see its evidence or make a review request. Do not accept real educational records. Student code runs in the user's **browser** with a timeout, not in a secure exam sandbox. Browser-reported test results remain untrusted evidence.

## Required final manual checks

1. From the public domain, load both `/student` and `/teacher`; reload each page.
2. Start a session, Run the **Count even numbers** solution, and verify real test output appears. The first Python engine load can take a while and needs access to jsDelivr.
3. Submit with a short explanation. The result should show 70 code points if all examples pass and a provisional concept score.
4. Request a direct solution (deny), then a valid documentation lookup (allowed), then a hint after the first attempt.
5. Submit again after help, select Next, and confirm a new transfer question appears.
6. Open Teacher, paste the session ID, verify saved attempts and use a reviewer note to override concept score. Refresh to check data persistence.

**If the team cannot complete these steps on the public URL, it is not ready for a live judge demo.**

## Local fallback

```sh
python -m pip install -r backend/requirements.txt -r requirements.txt
cd frontend && npm install && npm run build && cd ..
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Then open `http://localhost:8000`. This serves both services from the same process after a frontend build.
