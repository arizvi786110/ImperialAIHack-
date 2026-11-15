/**
 * TypeScript mirror of the frozen integration contract (MASTER_PLAN.md,
 * "Integration contract, freeze at 18:45 GMT"). Source of truth is the
 * Pydantic schemas in /contracts/models.py (which re-exports cognit_ai/contracts.py)
 * and, for the loosely-typed teacher payload, backend/app/routes/teacher.py.
 * Last synced against main at 0945e43 (backend PR #3). Keep in sync, no silent changes.
 *
 * PUBLIC FIELDS ONLY. Private question fields (reference_solution, rubric,
 * hidden_tests, concept_key, transfer_id, review_status) must never be
 * modelled or received on the frontend.
 */

// ---------- Envelope ----------

export interface ApiError {
  code: string
  message: string
}

export interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: ApiError
}

// ---------- Question ----------

export type Difficulty = 1 | 2 | 3

export interface ExampleTest {
  /** List of positional args: f(values, target) -> [[1, 2], 2]. */
  input: unknown
  expected: unknown
}

export interface PublicQuestion {
  id: string
  seed: number
  skill_tags: string[]
  difficulty: Difficulty
  title: string
  statement: string
  function_signature: string
  example_tests: ExampleTest[]
  hint_policy: string
  max_points: number
}

// ---------- Session ----------

export type AssistMode = 'lookup' | 'plan' | 'hint'
export type Stage = 'attempt' | 'plan' | 'transfer' | 'complete'

export interface SessionState {
  stage: Stage
  difficulty: Difficulty
  allowed_help: AssistMode[]
}

export interface SessionStartRequest {
  student_alias: string
}

export interface SessionStartResponse {
  session_id: string
  question: PublicQuestion
  state: SessionState
}

// ---------- Attempt ----------

export interface ClientTestResult {
  id: string
  pass: boolean
  actual: unknown
  error: string | null
}

export interface HelpEvent {
  type: string
  timestamp: string // ISO 8601
}

export interface AttemptRequest {
  session_id: string
  question_id: string
  code: string
  explanation: string
  plan: string
  /** Untrusted: produced by the in-browser runner (prototype only). */
  client_test_results: ClientTestResult[]
  help_events: HelpEvent[]
}

export type NextAction = 'next' | 'retry' | 'plan' | 'transfer' | 'complete'

/** Heuristic indicator per skill (cognit_ai/adapt.py). Not a validated ability measure. */
export interface SkillMastery {
  independent_transfer_correct: number
  independent_transfer_total: number
  assisted_mean: number | null
  independent_mean: number | null
  heuristic_mastery: number | null
}

/** Per-skill progress in the attempt-time snapshot (adapt.py tracks difficulty per skill). */
export interface SnapshotSkill extends SkillMastery {
  difficulty: Difficulty
  independent_streak: number
  pending_transfer: boolean
  pending_transfer_from: string | null
}

/**
 * LearnerState.snapshot(). In AttemptResponse this is a PREVIEW of the likely outcome:
 * the backend commits learner state once per question, at POST /api/next.
 */
export interface MasterySnapshot {
  difficulty: Difficulty
  pending_transfer: boolean
  independent_streak: number
  mastery_by_skill: Record<string, SnapshotSkill>
}

export interface AttemptResponse {
  attempt_id: string
  /** 0-100 = code_score (0-70) + concept_score (0-30). */
  provisional_score: number
  code_score: number
  concept_score: number
  /** Always includes client_tests_untrusted and server_tests_not_run for now. */
  flags: string[]
  feedback: string
  mastery_snapshot: MasterySnapshot
  next_action: NextAction
}

// ---------- Assist ----------

export type AssistDecision = 'allow' | 'limit' | 'deny'

export interface AssistRequest {
  session_id: string
  question_id: string
  mode: AssistMode
  /** 1-1500 characters. */
  query: string
  /** Required for hint and plan modes (an attempt on the current question). */
  current_attempt_id?: string
}

export interface AssistResponse {
  decision: AssistDecision
  content: string
  /** docs.python.org URLs. */
  citations: string[]
  /** 0 for lookup/plan, 1-3 for the hint ladder. */
  hint_level: number
  reason_code: string
}

// ---------- Next ----------

export type NextReason = 'transfer' | 'harder' | 'same' | 'remedial'

export interface NextRequest {
  session_id: string
  previous_attempt_id: string
}

export interface NextResponse {
  question: PublicQuestion
  reason: NextReason
  state: SessionState
}

// ---------- Teacher ----------

// The backend types these as dict[str, Any]; shapes below mirror what
// backend/app/routes/teacher.py actually builds.

export type ReviewStatus = 'pending' | 'approved' | 'overridden'

export interface AttemptEvaluation {
  code_score: number
  concept_score: number
  core_idea: number // 0-15
  complexity: number // 0-10
  edge_cases: number // 0-5
  provisional_score: number
  rationale: string
  confidence: number // 0-1
  review_required: boolean
  flags: string[]
  model_used: string
}

/** Append-only audit record of a teacher review. */
export interface ReviewRecord {
  review_id: string
  previous_concept_score: number | null
  override_concept_score: number | null
  approved: boolean | null
  reviewer_note: string
  effective_score: number
  created_at: string
}

export interface TeacherAttemptRow {
  attempt_id: string
  question_id: string
  title: string
  difficulty: Difficulty
  skill_tags: string[]
  /** Hint or Plan Mode used on that question (server log). */
  assisted: boolean
  created_at: string
  code: string
  explanation: string
  plan: string
  client_test_results: ClientTestResult[]
  evaluation: AttemptEvaluation | null
  review_status: ReviewStatus
  effective_concept_score: number
  effective_score: number
  reviews: ReviewRecord[]
  concept_probe?: {
    question: string; source: string; answer: string | null;
    score: number | null; confidence: number | null;
    rationale: string | null; needs_review: boolean;
    model_used: string | null;
  } | null
}

export interface ScoreBreakdown {
  per_question: { question_id: string; difficulty: Difficulty; weight: number; score: number; assisted: boolean }[]
  weighted_achieved: number
  weighted_max: number
  overall_percent: number | null
  note: string
}

export interface AssistedVsIndependent {
  assisted: { count: number; mean_score: number | null }
  independent: { count: number; mean_score: number | null }
  transfer_gap: number | null
  note: string
}

export interface HelpLogEntry {
  event_id: string
  question_id: string
  attempt_id: string | null
  mode: AssistMode
  query: string
  decision: AssistDecision
  reason_code: string
  hint_level: number
  created_at: string
}

export interface ReviewFlag {
  attempt_id: string
  question_id: string
  flags: string[]
  confidence: number
  rationale: string
}

export interface TeacherSessionView {
  attempts: TeacherAttemptRow[]
  score_breakdown: ScoreBreakdown
  mastery_by_skill: Record<string, SkillMastery>
  assisted_vs_independent: AssistedVsIndependent
  help_log: HelpLogEntry[]
  review_flags: ReviewFlag[]
}

export interface TeacherReviewRequest {
  attempt_id: string
  /** 0-30; replaces the AI concept score. */
  override_concept_score?: number
  approved?: boolean
  /** Required (non-blank) for the audit log. */
  reviewer_note: string
}

export interface TeacherReviewResponse {
  review_status: ReviewStatus
  effective_score: number
}


// Extra evidence of reasoning. Separate from the original 100-point score.
export interface ConceptProbe {
  probe_id: string
  attempt_id: string
  question: string
  source: string
  answered: boolean
  answer: string | null
  score: number | null
  confidence: number | null
  rationale: string | null
  needs_review: boolean
  model_used: string | null
}
