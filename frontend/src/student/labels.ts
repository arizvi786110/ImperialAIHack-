/** Plain-language labels for codes the backend returns. Unknown codes fall back to a humanised form. */
import type { AssistDecision, NextAction, NextReason, Stage } from '../types/contracts'

export function humanise(code: string): string {
  const s = code.replace(/[_-]+/g, ' ').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const FLAGS: Record<string, string> = {
  client_tests_untrusted: 'Provisional: tests ran in your browser',
  server_tests_not_run: 'Hidden tests not run yet',
  assisted: 'Hint or Plan Mode used on this question',
  GRADER_UNAVAILABLE: 'AI grading unavailable: a teacher will review',
  MISSING_EXPLANATION: 'No explanation submitted',
  LOW_CONFIDENCE: 'Low grader confidence: a teacher will review',
  INJECTION_IN_EXPLANATION: 'Explanation contained instructions to the grader: flagged for review',
}
export const flagLabel = (flag: string) => FLAGS[flag] ?? humanise(flag)

/** Flags that only describe the prototype's limits, shown muted rather than as warnings. */
export const INFO_FLAGS = new Set(['client_tests_untrusted', 'server_tests_not_run'])

const ASSIST_REASONS: Record<string, string> = {
  APPROVED_REFERENCE: 'From the approved Python documentation',
  REFERENCE_SCOPE: 'Outside the reference library',
  SOLUTION_REQUEST: 'Requests for solutions, code or hidden tests are not allowed',
  ATTEMPT_REQUIRED: 'Submit an attempt first',
  BOUNDED_GUIDANCE: 'Guidance only: no code or full algorithm',
  SAFE_FALLBACK: 'Built-in guidance (AI tutor unavailable)',
  QUESTION_MISMATCH: 'Not about the current question',
}
export const assistReasonLabel = (code: string) => ASSIST_REASONS[code] ?? humanise(code)

export const DECISION_STYLE: Record<AssistDecision, { label: string; className: string }> = {
  allow: { label: 'Allowed', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  limit: { label: 'Limited', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  deny: { label: 'Refused', className: 'bg-rose-50 text-rose-800 ring-rose-200' },
}

export const NEXT_REASON: Record<NextReason, { title: string; body: string }> = {
  transfer: {
    title: 'Independent check',
    body: 'A new problem on the same concept. Try it without help to show what you can do on your own.',
  },
  harder: { title: 'Level up', body: 'Two independent successes in a row, so the difficulty has gone up one level.' },
  same: { title: 'Next question', body: 'Another question at the same level.' },
  remedial: { title: 'Practice question', body: 'More practice on the same skill before moving on.' },
}

export const NEXT_ACTION: Record<NextAction, string> = {
  next: 'Move on to the next question when you are ready, or revise and resubmit.',
  retry: 'Revise your code or explanation and submit again.',
  plan: 'Not there yet. Try Plan Mode to sharpen your approach, then resubmit, or move on.',
  transfer: 'Nice work with help. Next is an independent check on the same concept.',
  complete: 'That was the last question.',
}

export const STAGE_LABEL: Record<Stage, string> = {
  attempt: 'Attempt',
  plan: 'Planning',
  transfer: 'Independent check',
  complete: 'Complete',
}
