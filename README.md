# ImperialAIHack-

COGNIT: a real-time university Python assessment prototype. See [MASTER_PLAN.md](MASTER_PLAN.md).

## Frontend

Vite + React + TypeScript + Monaco + Tailwind, in [`frontend/`](frontend/). Requires Node 20+.

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL, defaults to http://localhost:8000
npm run dev            # http://localhost:5173
```

- `/student`: question panel, Monaco Python editor, explanation box, Run (Ctrl/Cmd+Enter) and Submit.
- `/teacher`: teacher dashboard shell (demo only).
- `npm run build` type-checks and builds to `frontend/dist/`.

Current status: the frontend runs against a mock question. **Run uses a stub, not real Python yet** (the Pyodide worker is D2), and Submit is not yet wired to the backend (D3). The Monaco editor loads from the jsDelivr CDN, so it needs a network connection.

In-browser execution is a prototype only. It is not a secure exam sandbox.
