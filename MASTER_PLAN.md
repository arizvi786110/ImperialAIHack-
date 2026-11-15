# COGNIT | Master Execution Plan

**Hackathon:** Imperial AI Hackathon, Reply Challenge: AI on Campus
**Prepared:** 14 November 2026, ~18:20 GMT
**Hard deadline:** 15 November 2026, 12:00 GMT. Internal target: 11:15 GMT.
**Ownership:** Product lead = Ahmed; AI/ML = Shreya; Backend/runner = Aalia; Frontend/video = DS.

## Status board (updated 15 Nov 2026, from repo contents on `main` and all remote branches)
Legend: ✅ Done · 🟡 Partly done / needs follow-up · ⬜ To do. Status is judged only from what's in the repo. Work done but not pushed doesn't show here; update your own row if so.

> **Not on `main` yet:** all backend work (A1–A6) is only on `origin/backend/a3-endpoints` (which also contains `backend/a2-persistence`). **Aalia: open a PR from `backend/a3-endpoints` to `main`.** Until it merges, `main` has no `backend/` or `contracts/`.

| Owner | Done | Partly done | To do |
|---|---|---|---|
| Shreya (AI/ML) | S1, S2, S3 (code), S4, S5 | S3 live gold run, S6 | none |
| Aalia (Backend) | A1, A2, A3, A6 (all unmerged) | A4 (needs DS sign-off), A5 (deployment) | merge to `main` |
| DS (Frontend/video) | D1 | none | D2, D3, D4, D5, D6, D7 |
| Ahmed (Product) | none | none | H1, H2, H3, H4, H5, H6 |

**Handoffs waiting right now:**
- **DS ↔ Aalia (A4/D2):** DS to review and sign off `backend/RUNNER_CONTRACT.md`. Test ids are `ex0`, `ex1`, …, and `input` is a list of positional args.
- **Ahmed → Aalia (H1):** the backend seeds 1 placeholder question plus 3 template variants. It needs Ahmed's 6 vetted problems with transfer pairs.
- **Ahmed → Aalia (H3):** `backend/app/scoring.py` is a temporary stand-in. It scales 70 code points from the example tests, not the planned 50 functional + 20 edge split. Swap in Ahmed's `scoring.py` when it's ready.
- **Shreya:** run `python -m evals.gold_grading` with the API key and record the agreement counts. Get human approval of the expected ranges before citing them.

## Mission
Build a real-time university Python assessment prototype that permits approved informational AI support but tests actual independent conceptual understanding. It must show a coding editor, execution, rubric-based grading by a separate AI, dynamic challenge variants, Plan Mode, a learner-state model, progressive difficulty, and a teacher dashboard with human review.

**Positioning:** New combination of verified problem variants, bounded educational assistance, independent transfer checks, and evidence of mastery. This is not a validated psychometric test or cheating-proof remote exam.

## Track and rules
- Reply Challenge: AI on Campus. The official brief requests a working university problem solution with present state, guardrails, human review, and real-time interaction. Judges assess Reply entries.
- Four university students with tickets must be registered as team members on Devpost. Submit public repository and <=2:00 demo video before 12:00 on 15 Nov; all counted commits before deadline.
- Organisers recommend showing one working end-to-end run, labels for sped-up clips, named real vs mocked pieces, and answer Q&A without slides.

## P0 / P1 / P2
**P0, must work:** one complete 4-question assessment using a real Python editor, run button and objective tests; at least 3 skill tags and 3 difficulty levels; conceptual explanation scored separately with AI and structured rubric; restricted documentation help; student Plan Mode after first attempt; assisted-to-independent paired task; score and teacher dashboard; saved real session; teacher override; deployment or reliable local demo recording.

**P1, if P0 stable:** bounded dynamic question variants from vetted templates and seed randomisation; generated conceptual questions vetted against reference tests; robust policy eval suite; 8+ questions; skill probabilities.

**P2, stretch:** free-form AI-generated novel questions with automatic validation and teacher approval; fine-tuning via Adaption; multiple-model comparison; comprehensive authentication; direct model research claims.

## Target system and stack
- Frontend: Vite + React + TypeScript + Monaco Editor + simple Tailwind CSS. DS works on frontend; Ahmed may bootstrap the shell using Codex if needed.
- API: Python FastAPI, owned by Aalia. Python Pydantic schemas shared in `/contracts`, with a frontend TS mirror committed by DS.
- AI tutor + grader: Anthropic API via Shreya's Python service. Best currently general technical model, Claude Fable 5.2, for high-stakes conceptual grading when enabled; Sonnet 5.5 for responsive bounded tutor, switch with environment variables and validate availability and spending. High model power is NOT a safety guarantee.
- Execution: in-browser Pyodide inside a Web Worker, with terminate-on-timeout and a clean worker for each attempt. This is a *prototype*, not an assessment-secure execution sandbox. It cannot securely hide tests from motivated users. Never evaluate arbitrary student Python in the FastAPI host process. If a separately isolated server executor is already provisioned and working, consider it after P0.
- Database: Supabase Postgres free tier if a project can be provisioned quickly. Backend holds service credentials; never expose them client-side. If setup takes more than 25 minutes, switch to SQLite for local/demo and record data within the backend's persistent filesystem during filming. Do not pretend a hosted SQLite demo will persist on ephemeral disk.
- Search: allowlist approved Python docs at docs.python.org plus optional small trusted reference snippets bundled locally. Search can operate over curated indexed snippets. A web-search provider is only optional if it can be domain-restricted and snippets checked by the policy gateway.
- Delivery: frontend Vercel or Netlify, backend Railway/Render or known working alternative. Record local demo if deployment is blocked, but share repo.

## Architecture / trust boundaries
Student UI -> FastAPI orchestration -> (AI tutor, AI grader, student-state) -> Postgres. Student code runs in browser Pyodide Web Worker; outputs and test results are sent to API as evidence for a *demo*. The browser is not trusted for real examinations; use secure server-side sandbox later. The AI grader sees rubric, student explanation, test summary and question metadata, never accepts user-provided grading instructions. Do not send hidden reference solutions to tutor. Human review is required for ambiguous/low-confidence grading.

## Integration contract, freeze at 18:45 GMT

**Question (public):**
`{id, seed, skill_tags: string[], difficulty: 1|2|3, title, statement, function_signature, example_tests:[{input,expected}], hint_policy, max_points}`

**Question (private, server):** additional `reference_solution`, `rubric`, `hidden_tests`, `concept_key`, `transfer_id`, `review_status`. Never send private fields to frontend or tutor.

**POST /api/session/start**
Input `{student_alias}`. Output `{session_id, question: PublicQuestion, state:{stage, difficulty, allowed_help}}`.

**POST /api/attempt**
Input `{session_id, question_id, code, explanation, plan, client_test_results:[{id,pass,actual,error}], help_events:[{type,timestamp}]}`. Output `{attempt_id, provisional_score, code_score, concept_score, flags, feedback, mastery_snapshot, next_action}`. API must mark client test results as untrusted until a trusted runner exists. Never make AI-only grade authoritative for production.

**POST /api/assist**
Input `{session_id, question_id, mode:'lookup'|'plan'|'hint', query, current_attempt_id?}`. Output `{decision:'allow'|'limit'|'deny', content, citations, hint_level, reason_code}`. Require prior attempt for hint and Plan Mode for the first demo. Do not return complete answer or answer-equivalent pseudocode.

**POST /api/next**
Input `{session_id, previous_attempt_id}`. Output `{question:PublicQuestion, reason:'transfer'|'harder'|'same'|'remedial', state}`. Prefer vetted variants.

**GET /api/teacher/session/{session_id}**
Output `{attempts, score_breakdown, mastery_by_skill, assisted_vs_independent, help_log, review_flags}`. Teacher route is demonstration-only, with no real student data.

**POST /api/teacher/review**
Input `{attempt_id, override_concept_score?, approved?, reviewer_note}`. Output `{review_status, effective_score}`. Clearly identify override and preserve audit history.

All endpoint responses use `{ok:boolean, data?: object, error?:{code,message}}` and appropriate HTTP status codes.

## Scoring design (prototype rubric)
Per question 100 points: basic/functional tests 50; edge-case tests 20; conceptual explanation 30. Explanation rubric: core algorithmic idea (0-15), complexity and tradeoff awareness (0-10), relevant edge reasoning (0-5). Surface syntax/format mistakes can lose executable points but not all conceptual credit. Tests remain deterministic. Model returns structured JSON with scores + short cited reasons + uncertainty; flag ambiguous responses for teacher.

Difficulty weighting: level 1 = x1, level 2 = x1.5, level 3 = x2, with overall percent equal to weighted sum achieved divided by weighted max. These weights are prototype design choices, not calibrated empirical difficulty.

Mastery by skill: show (a) correct/total independent transfer tasks, (b) assisted vs independent performance on matched concepts, and (c) a heuristic mastery indicator. Do not describe it as IQ, innate intelligence, cheating detection or a validated 'problem-solving ability' measure. Use AI-help request counts for context, never penalise count alone. Avoid penalising access needs.

Difficulty rules: on assisted success, ask independent transfer at same conceptual level; on independent success twice, increase one level; on independent failure, ask diagnostic/remedial same skill; when not enough evidence, hold level. Cap levels and prevent loops. Student or teacher can override.

## Plan Mode specification
A separate tab labelled **Plan Mode** next to Code and Reference. Student submits a brief solution outline after first attempt. The assistant may ask Socratic questions and propose high-level subgoals (inputs/outputs, invariants, possible data structures, testing strategy), but may NOT produce complete implementation, full algorithm, code snippets, line-by-line pseudocode, or a worked answer to the active task. Student edits their own plan, then clicks 'Use this plan' to annotate a subsequent coding attempt. Log plan edits. Planner provides one issue at a time. Teacher can review plan vs code vs independent transfer.

## Individual task cards

### Shreya / AI-ML
- ✅ **S1 P0 (18:20-18:45):** define request/response schemas for `/api/assist` and rubric for `/api/attempt`; agree exact `Question` types with Aalia. Done: two valid JSON examples and blocked-answer test case.
  - *Status:* `cognit_ai/contracts.py` and `examples/contracts.json` are on main. The backend's `contracts/models.py` re-exports them.
- ✅ **S2 P0 (18:45-20:00):** implement `tutor_service.py` with allowlist modes, progressive help policy, refusal of full solutions; split general reference retrieval from question-aware responses. Done: 8 allowed prompts succeed, 8 prohibited prompts denied/limited, no solution leakage in sampled outputs.
  - *Status:* `tests/test_services.py` has `test_eight_allowed` and `test_eight_prohibited`.
- 🟡 **S3 P0 (19:30-20:30):** `grader_service.py`: separate model call, structured scores 0-30, rationale, confidence/review flag; ambiguity and minor syntax tolerance. Done: 6 gold rubric cases align with human grades within declared tolerance.
  - *Status:* the grader and 6 gold cases (`evals/gold_grading.py`) are written.
  - *Remaining:* run it live with the API key, record the agreement count, and get human sign-off on the expected ranges.
- ✅ **S4 P0 (20:30-21:15):** implement learner-state + transfer selection in `adapt.py` (or pair with Ahmed). Done: assisted success leads to transfer, two independent successes leads to increase, failures do not increase, no infinite loop.
  - *Status:* covered by the tests for assisted transfer, two independent successes, failure never increasing, the difficulty cap, and no loop on exhaustion.
- ✅ **S5 P1 (21:15-22:15):** question variation using approved templates, parametrised task statements and reference tests; check duplicates, contradictions, impossible constraints; fallback to vetted bank.
  - *Status:* `cognit_ai/question_variants.py` has 3 vetted templates (`count_target`, `unique_count`, `first_repeat`), seeded variants, validation and duplicate fallback.
- 🟡 **S6 P1:** adversarial evals including prompt injection inside code/comments, multi-turn hint leakage, 'answer but call it conceptual', hidden-test prompt request, reviewer impersonation. Publish outcomes without overstating generalisation.
  - *Status:* `evals/adversarial_eval.py` covers direct-answer, hidden-test, "ignore instructions", impersonation and answer-as-plan prompts, all single-turn and in lookup mode.
  - *Remaining:* injection inside code/comments, multi-turn hint leakage, and publishing the results with denominators.
- **Deviation:** if live generation fails validation or 30-minute timebox, use vetted templates. If Fable latency/cost is high, use Sonnet for tutor and Fable for grading, or use Sonnet for both with candid model disclosure.

### Aalia / Backend
- ✅ **A1 P0 (18:20-18:50):** scaffold FastAPI, CORS for frontend, Pydantic contracts, OpenAPI, `.env.example`. Done: `/health` and `/api/session/start` work from a shared branch.
  - *Status:* on `backend/a3-endpoints`, **not merged to main**.
- ✅ **A2 P0 (18:50-19:45):** persistence and session-state CRUD; choose Supabase Postgres if configured within 25 minutes, else SQLite fallback. Tables: sessions, problems, attempts, assistance_events, evaluations, mastery_state, teacher_reviews. Done: full run persists and reloads without errors; no public credentials.
  - *Status:* SQLite with all 7 tables, `GET /api/session/{id}` reload and `scripts/smoke_persistence.py`. Aligned with `cognit_ai`. **Not merged.**
- ✅ **A3 P0 (19:45-20:30):** orchestration endpoints `/api/attempt`, `/api/next`, `/api/assist`, `/api/teacher/session` integrating Shreya services. Done: integration smoke script shows end-to-end JSON.
  - *Status:* all endpoints are in place. `scripts/smoke_e2e.py` runs 35 checks, including leak checks. **Not merged.**
- 🟡 **A4 P0 (20:30-21:15):** coordinate Pyodide Web Worker contract with DS, define code/test execution data, timeouts, errors. NEVER execute student code in backend host process. Done: normal, infinite-loop and exception cases produce bounded and readable results.
  - *Status:* draft contract in `backend/RUNNER_CONTRACT.md`.
  - *Remaining:* DS sign-off and answers to its 2 open questions. Proving the infinite-loop and exception cases needs DS's D2 worker.
- 🟡 **A5 P0 (21:15-22:00):** teacher override endpoint with audit log and deployment. Done: public staging health works and a full session appears after reload.
  - *Status:* `POST /api/teacher/review` with an append-only audit log is done.
  - *Remaining:* deploy to public staging, or decide on a local-only demo.
- ✅ **A6 P1:** reliability, short model timeout, retry budget, idempotent attempt submission and rate limiting; cost-guard provider usage.
  - *Status:* `Idempotency-Key` on attempt, per-session rate limits and AI call caps (`app/limits.py`), a 12 s model timeout and 1 retry (`cognit_ai/provider.py`).
- **Deviation:** if backend cloud hosting blocked >30 min, run locally and record demo. If Supabase blocked >25 min, SQLite local. Never add authentication late at cost of core flow.

### DS / Frontend & video
- ✅ **D1 P0 (18:20-19:00):** bootstrap React/Vite TS frontend with `/student` and `/teacher`, Monaco editor, accessible Run/Submit UI, typing and mobile-safe layout. Done: an unconnected editor runs locally with mock question.
  - *Status:* on main, with a TS contract mirror in `frontend/src/types/contracts.ts`.
- ⬜ **D2 P0 (19:00-19:45):** browser Pyodide Web Worker for running Python and public tests. Handle loading, errors, infinite loops (terminate worker and recreate), disallowed imports and timeouts; do not market as secure production sandbox. Done: 3 example snippets tested.
  - *Status:* only `stubRunner.ts` exists. Build to `backend/RUNNER_CONTRACT.md`: ids `ex0`, …, calls `fn(*input)`, 2 s per test and 5 s per run, `BLOCKED_IMPORT`/`TIMEOUT` error strings. **Not blocked.**
- ⬜ **D3 P0 (19:45-20:30):** integrate session/start, attempt, next, code execution; add visible progress, points, upcoming question, explanations. Done: one complete question on backend.
  - *Status:* can start now against the `backend/a3-endpoints` branch run locally. Send an `Idempotency-Key` on Submit.
- ⬜ **D4 P0 (20:30-21:00):** assistance UI with Lookup / Plan Mode / Hint and refusal messages; show allowed source citations. Done: recorded hint after attempt and denied solution request.
  - *Status:* tabs exist as placeholders. Endpoint `/api/assist` exists on the backend branch.
- ⬜ **D5 P0 (21:00-21:40):** teacher dashboard with scores, skill labels, assisted/independent comparison, attempt log, teacher override UI. Done: actual stored data reflected, not fake metrics.
  - *Status:* static shell only. The endpoints exist on the backend branch.
- ⬜ **D6 P0 (21:40-22:20):** capture a <=2-min video of one real student run, show human review and new question. Use captions and truthful 'sped-up' labels; export, upload, verify playback. Send link to Ahmed.
  - *Status:* blocked on the end-to-end flow (D2–D5 and the backend merge).
- ⬜ **D7 P1:** Figma sketch/design polish if stable, keyboard shortcuts, good typography and loading skeletons.
  - *Status:* Ctrl/Cmd+Enter to run already works.
- **Deviation:** if Monaco or Pyodide takes >30 min, use CodeMirror or plain multiline code editor with browser Python via already proven package. Never replace working demo with risky late redesign.

### Ahmed / Product, tests, integration, submission
- ⬜ **H1 P0 (18:20-18:45):** write 6 carefully checked Python problems over 3 skills: hashing, loops/edge cases, basic algorithmic complexity; each has public prompt, 3 normal tests, 3 edge cases, misconception target, conceptual rubric, paired transfer problem. Verify input/output specs.
  - *Status:* not in the repo. The backend uses 1 placeholder (`first_unique`) plus 3 of Shreya's template variants (`backend/app/data/questions.py`). Use positional-arg-list `input`.
- ⬜ **H2 P0 (18:45-19:15):** make golden evaluation examples: strong correct solution, partial understanding, syntax bug with sound concept, passing code with weak explanation, prompt-leak request, infinite-loop code. Provide expected points/flags and review cases.
  - *Status:* not in the repo. Shreya's `evals/gold_grading.py` already covers the explanation-only cases and could be extended.
- ⬜ **H3 P0 (19:15-20:00):** own `scoring.py` with documented point weights/difficulty weighting and simple deterministic tests. Coordinate with Shreya's grader schema. Done: boundary test scores exactly 0/100, mixed scores correct, no double-counting.
  - *Status:* not in the repo. Aalia's temporary stand-in is `backend/app/scoring.py`: swap in `score_attempt` and `effective_score`.
- ⬜ **H4 P0 (20:00-21:00):** end-to-end QA from student perspective, fixed blocker list with P0/P1, run 4 team attempts, note observed outcomes rather than inventing performance claims.
  - *Status:* needs D2–D5 and the backend merge.
- ⬜ **H5 P0 (21:00-22:00):** prepare research-backed rationale, Devpost description, README instructions, model and data limitations, project architecture drawing in markdown, 6-minute Q&A answers.
  - *Status:* the frontend and backend READMEs exist. The rest isn't in the repo.
- ⬜ **H6 P0 (before 11:15 tomorrow):** add team members, public repo, demo URL, video, track, descriptions, final commit and submit. Verify acknowledgement before deadline. DS owns recording, Ahmed owns submission.
- **Deviation:** if <1h to internal cutoff and core flow fails, drop nonessential AI generation and design polish, keep a recorded truthful fallback demo. Never fabricate successes.

## Timeboxed milestones
- **18:20–18:45 Saturday:** interface contracts, golden problems, repo/branches, model keys confirmed.
- **18:45–19:45:** backend health, React editor, first tutor/grader routes and golden tests.
- **19:45–20:30:** integration of ONE real task from editor -> run -> grade -> next -> dashboard.
- **20:30–21:00:** Plan Mode, assisted transfer, scoring, teacher override in usable state.
- **21:00–22:30:** expand to vetted variants, QA, deployment, record first demo cut.
- **22:30–00:00:** bug fixes only; obtain end-to-end demo recording before late night if possible.
- **Sunday 09:30:** feature freeze and successful video playback. Later changes only P0 bug fixes.
- **Sunday 10:30:** final repo/video/Devpost verification.
- **Sunday 11:15:** team internal submission cutoff. Official hard deadline 12:00.

## Coordination protocol
- Discord: channels `#announcements`, `#dev-ai`, `#dev-backend`, `#dev-frontend`, `#blockers`, `#releases`; use existing channels if easier.
- Every 30 minutes, everyone posts: `ID | DONE | NEXT | BLOCKER | EXPECTED HANDOFF`. P0 blocker not solved after 15 min -> post in #blockers and ping dependency owner + Ahmed.
- Every task has ONE owner and explicit acceptance criteria. Reviewer is dependent owner or Ahmed. No silent API changes. Open PR against `main`; compile/smoke-test before merge. Avoid simultaneous edits to same file.
- Decision log fields: timestamp, issue, alternatives, recommendation, decision maker, consequence. Technical routine changes allowed locally; any changes to scoring, safety policy, features, cost or architecture require Ahmed approval. If no response and the clock is running out, choose safe P0 fallback, record reason, and report immediately.
- No secrets in repo, Discord messages, client JS or screenshots. Use .env files and a sanitized `.env.example`.
- Reserve 20% of remaining time for integration, recording and submission. Do not add further features after freeze.

## End-to-end test suite
1. Normal correct code + correct explanation -> code test points + conceptual points.
2. Sound approach but syntax error -> poor executable score but meaningful conceptual credit and suggested syntax lookup.
3. Correct code without conceptual explanation -> executable marks only, teacher sees missing evidence.
4. Wrong code, eloquent false explanation -> low explanation score and review flag.
5. Boundary inputs: empty string, repeated values, long list, Unicode, duplicates, negatives as appropriate.
6. Infinite `while True` -> terminate worker and show timeout; page stays responsive.
7. `print()` stdout, exception trace and wrong function name produce readable feedback.
8. Tutor request for direct answer, response disguised as plan/pseudocode, injection in comment -> refuse/limit.
9. General syntax lookup after failed attempt -> allowed with citation.
10. Hint before first attempt -> blocked; after first attempt -> progressive conceptual hint.
11. Assisted success followed by failed unassisted transfer -> hold same difficulty and flag uncertain mastery.
12. Two unaided passes -> difficulty increases by exactly one.
13. LLM API 429/timeout/invalid JSON -> service fails gracefully and teacher can flag review.
14. Empty/wrong session IDs, duplicate submit, refresh -> clean errors and preserved state.
15. Teacher overrides score -> audit log shows previous score, new score and note.
16. Public vs private question separation -> no `reference_solution`, `hidden_tests` or API key exposed in network payload.
17. Four real team runs -> report attempts, rubric disagreements, observed assistance policy pass/fail counts.

## Evaluation metrics for pitch
- `answer_leakage_block_rate = blocked prohibited prompts / total prohibited test prompts`.
- `legitimate_help_rate = allowed benign prompts / total allowed prompts`.
- `grading_agreement = scored cases within target tolerance of teacher rubric / judged examples`.
- `valid_problem_rate = verified generated variants / attempted generated variants`.
- `transfer_gap = matched assisted score - subsequent independent transfer score` (descriptive only).
- Include raw sample counts and manually inspect the failures. No claim of validated ability measurement or comprehensive security.

## Spend control
- Claude API budget £50 max. Alert at £20 and £35. Start responsive tutor with Sonnet 5.5, grading with Fable 5.2 if accessible. Use small prompts, max output tokens and cache stable instructions. No subscriptions or paid infrastructure without Ahmed approval.
- Other sponsor credits (Adaption, etc.) are optional until access is verified. Credits advertised by organisers are not automatically activated.

## High-risk escalation / fallback tree
- GitHub team repo inaccessible through the connected app -> Ahmed shares exact repo URL, verifies connector access, otherwise use git manually and paste progress.
- Frontend running behind schedule -> keep minimal code editor, single page and teacher drawer; no visual redesign.
- Sandbox stalled -> Pyodide in worker for live execution, record as non-secure prototype; never execute arbitrary user code as subprocess on server.
- AI tutor leaking answers -> disable unrestricted chat, allow source-only lookup and human-authored hint ladder.
- Grader untrustworthy -> show deterministic tests and mark concept score as *provisional/teacher review*.
- Dynamic generation invalid -> switch to vetted parametrised templates and say clearly these are dynamic variants, not unconstrained generation.
- DB fails -> SQLite or in-memory demo store with explicit persistence limitation.
- Hosting fails -> record verified local product; include README run steps. Do not claim deployed.
- Time short -> P0 only and record working demo first.

## Demo story, <2 mins
- 0:00–0:15: 'University assessment in the age of AI. Cognit measures understanding, not just generated answers.'
- 0:15–0:35: Student writes and executes code, gets passing and edge-case output.
- 0:35–0:55: Requests exact solution, gets refused; asks valid docs question and gets cited explanation.
- 0:55–1:15: After first attempt, opens Plan Mode, revises plan, submits explanation for AI rubric.
- 1:15–1:35: Adaptive independent-transfer question surfaces, student attempts, mastery state updates.
- 1:35–1:50: Teacher dashboard shows test marks, conceptual credit, assisted-vs-independent discrepancy and can review/override.
- 1:50–2:00: stack and specific novelty, cite measured eval result if tested; no fictitious performance.

## Final gate checklist
- [ ] Repo public with commits prior to cutoff; `.env` never committed (as of 15 Nov, no `.env` committed on any branch)
- [ ] All four participants on Devpost with ticket info as required
- [ ] Reply track selected; truthful description
- [ ] Video <=2:00, uploaded, publicly playable, real full run, sped-up parts labelled
- [ ] Full attempt -> next task -> teacher review works in recording
- [ ] Readme includes local run, models, limitations and source attributions
- [ ] Measured metrics include denominators and failure examples
- [ ] Devpost confirmation before noon
