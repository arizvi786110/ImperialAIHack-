/**
 * TypeScript mirror of the frozen integration contract (MASTER_PLAN.md,
 * "Integration contract, freeze at 18:45 GMT"). Source of truth is the
 * Pydantic schemas in /contracts — keep this file in sync, no silent changes.
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
  // Inputs/outputs are JSON values; shape depends on the question.
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

export interface SessionState {
  stage: string
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

export interface AttemptResponse {
  attempt_id: string
  provisional_score: number
  code_score: number
  concept_score: number
  flags: string[]
  feedback: string
  mastery_snapshot: Record<string, unknown>
  next_action: string
}

// ---------- Assist ----------

export type AssistDecision = 'allow' | 'limit' | 'deny'

export interface AssistRequest {
  session_id: string
  question_id: string
  mode: AssistMode
  query: string
  current_attempt_id?: string
}

export interface AssistResponse {
  decision: AssistDecision
  content: string
  citations: string[]
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

export interface TeacherSessionView {
  attempts: unknown[]
  score_breakdown: Record<string, unknown>
  mastery_by_skill: Record<string, unknown>
  assisted_vs_independent: Record<string, unknown>
  help_log: unknown[]
  review_flags: unknown[]
}

export interface TeacherReviewRequest {
  attempt_id: string
  override_concept_score?: number
  approved?: boolean
  reviewer_note: string
}

export interface TeacherReviewResponse {
  review_status: string
  effective_score: number
}
