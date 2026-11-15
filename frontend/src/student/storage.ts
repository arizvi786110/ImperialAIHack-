/**
 * Browser-side persistence so a refresh keeps the session and the student's drafts.
 * The server remains the source of truth for session state (GET /api/session/{id}).
 * Demo data only: an alias, code and explanations. No credentials.
 */
import type { AttemptResponse, HelpEvent, NextReason } from '../types/contracts'

const KEY = 'cognit.student.v1'

export interface QuestionDraft {
  questionId: string
  code: string
  explanation: string
  plan: string
  /** Plan attached to the next attempt via "Use this plan". */
  attachedPlan: string | null
  lastAttempt: AttemptResponse | null
  attemptCount: number
  helpEvents: HelpEvent[]
}

export interface StudentSnapshot {
  sessionId: string
  alias: string
  /** Current question on the server when last seen; detects moves made in another tab/request. */
  questionId: string
  questionNumber: number
  arrivalReason: NextReason | null
  draft: QuestionDraft | null
}

export function loadSnapshot(): StudentSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StudentSnapshot) : null
  } catch {
    return null
  }
}

export function saveSnapshot(snapshot: StudentSnapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    // Storage full/disabled: the session still works, it just won't survive a refresh.
  }
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/** Updates just the current question's draft (ignored if the session has moved to another question). */
export function saveDraft(draft: QuestionDraft): void {
  const snap = loadSnapshot()
  if (snap && snap.questionId === draft.questionId) saveSnapshot({ ...snap, draft })
}

/** The saved draft for this question, if any. */
export function loadDraft(questionId: string): QuestionDraft | null {
  const draft = loadSnapshot()?.draft
  return draft && draft.questionId === questionId ? draft : null
}

export function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // randomUUID only exists in secure contexts; fall back for plain-http LAN demos.
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
