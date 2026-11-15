import type { ReactNode } from 'react'
import { formatTime } from '../components/styles'
import { Badge } from '../components/ui'
import { pyRepr } from '../runner/format'
import { flagLabel, INFO_FLAGS } from '../student/labels'
import type { ReviewStatus, TeacherAttemptRow } from '../types/contracts'
import { ReviewForm } from './ReviewForm'

const REVIEW_STATUS_STYLE: Record<ReviewStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  overridden: 'bg-violet-50 text-violet-800 ring-violet-200',
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </div>
  )
}

/** Expandable row in the attempt log: evidence, AI rubric breakdown, audit history, review form. */
export function AttemptDetails({ attempt, index, onReviewed }: { attempt: TeacherAttemptRow; index: number; onReviewed: () => void }) {
  const ev = attempt.evaluation
  const passed = attempt.client_test_results.filter((r) => r.pass).length
  const needsReview = ev?.review_required && attempt.reviews.length === 0

  return (
    <details id={`attempt-${attempt.attempt_id}`} className="group rounded-md border border-slate-200 open:bg-white">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
        <span className="font-mono text-xs text-slate-500">#{index + 1}</span>
        <span className="font-medium text-slate-900">{attempt.title}</span>
        <span className="text-xs text-slate-500">L{attempt.difficulty}</span>
        <span className="text-xs text-slate-500">{formatTime(attempt.created_at)}</span>
        {attempt.assisted ? (
          <Badge className="bg-amber-50 text-amber-800 ring-amber-200">Assisted</Badge>
        ) : (
          <Badge className="bg-sky-50 text-sky-800 ring-sky-200">Independent</Badge>
        )}
        {needsReview && <Badge className="bg-rose-50 text-rose-800 ring-rose-200">Needs review</Badge>}
        <Badge className={REVIEW_STATUS_STYLE[attempt.review_status]}>{attempt.review_status}</Badge>
        <span className="ml-auto font-mono text-sm text-slate-900">{attempt.effective_score} / 100</span>
      </summary>

      <div className="grid gap-4 border-t border-slate-200 p-3 lg:grid-cols-2">
        <Block title="Code">
          <pre className="max-h-64 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-xs text-slate-100">{attempt.code}</pre>
        </Block>
        <div className="flex min-w-0 flex-col gap-3">
          <Block title="Explanation">
            <p className="whitespace-pre-wrap text-sm text-slate-800">
              {attempt.explanation || <span className="text-slate-400">(none)</span>}
            </p>
          </Block>
          <Block title="Plan (Plan Mode)">
            <p className="whitespace-pre-wrap text-sm text-slate-800">{attempt.plan || <span className="text-slate-400">(none attached)</span>}</p>
          </Block>
          <Block title={`Browser example tests: ${passed}/${attempt.client_test_results.length} passed (untrusted)`}>
            <ul className="font-mono text-xs">
              {attempt.client_test_results.map((r) => (
                <li key={r.id} className={r.pass ? 'text-emerald-700' : 'text-rose-700'}>
                  {r.pass ? '✓' : '✗'} {r.id}
                  {!r.pass && (r.error ? `: ${r.error}` : ` got ${pyRepr(r.actual)}`)}
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <Block title="Scoring">
          {ev ? (
            <div className="flex flex-col gap-2 text-sm text-slate-800">
              <table className="w-full text-left text-sm">
                <tbody>
                  <tr><td className="py-0.5 text-slate-600">Code (example tests)</td><td className="font-mono">{ev.code_score} / 70</td></tr>
                  <tr><td className="py-0.5 text-slate-600">Core idea</td><td className="font-mono">{ev.core_idea} / 15</td></tr>
                  <tr><td className="py-0.5 text-slate-600">Complexity</td><td className="font-mono">{ev.complexity} / 10</td></tr>
                  <tr><td className="py-0.5 text-slate-600">Edge cases</td><td className="font-mono">{ev.edge_cases} / 5</td></tr>
                  <tr>
                    <td className="py-0.5 text-slate-600">Concept (AI)</td>
                    <td className="font-mono">
                      {ev.concept_score} / 30
                      {attempt.review_status === 'overridden' && (
                        <span className="text-violet-700"> → teacher {attempt.effective_concept_score}</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p><span className="text-slate-600">Rationale:</span> {ev.rationale || '—'}</p>
              <p className="text-xs text-slate-500">
                Confidence {Math.round(ev.confidence * 100)}% · model {ev.model_used || 'n/a'} · provisional
              </p>
              {ev.flags.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {ev.flags.map((f) => (
                    <li key={f} className={`rounded-full px-2 py-0.5 text-xs ${INFO_FLAGS.has(f) ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'}`}>
                      {flagLabel(f)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Not graded.</p>
          )}
        </Block>

        <div className="flex min-w-0 flex-col gap-3">
          <Block title="Audit history">
            {attempt.reviews.length === 0 ? (
              <p className="text-sm text-slate-500">No teacher reviews yet.</p>
            ) : (
              <ol className="flex flex-col gap-1.5 text-sm">
                {attempt.reviews.map((r) => (
                  <li key={r.review_id} className="rounded-md bg-violet-50/60 px-2 py-1.5 ring-1 ring-violet-100">
                    <span className="font-medium text-violet-900">Teacher {r.override_concept_score !== null ? 'override' : 'approval'}</span>{' '}
                    <span className="text-xs text-slate-500">{formatTime(r.created_at)}</span>
                    <div className="font-mono text-xs text-slate-700">
                      concept {r.previous_concept_score ?? '—'} → {r.override_concept_score ?? r.previous_concept_score ?? '—'}
                      {r.approved ? ' · approved' : ''} · effective {r.effective_score} / 100
                    </div>
                    <div className="text-xs text-slate-700">“{r.reviewer_note}”</div>
                  </li>
                ))}
              </ol>
            )}
          </Block>
          {ev && <ReviewForm attempt={attempt} onSaved={onReviewed} />}
        </div>
      </div>
    </details>
  )
}
