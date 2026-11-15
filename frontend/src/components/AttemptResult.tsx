import { flagLabel, INFO_FLAGS, NEXT_ACTION } from '../student/labels'
import type { AttemptResponse } from '../types/contracts'
import { btn } from './styles'

const CODE_MAX = 70
const CONCEPT_MAX = 30

interface AttemptResultProps {
  attempt: AttemptResponse
  attemptCount: number
  onNext: () => void
  onOpenPlan: () => void
  nextBusy: boolean
  canAdvance: boolean
  planAvailable: boolean
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-mono">
          {value} / {max}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AttemptResult({ attempt, attemptCount, onNext, onOpenPlan, nextBusy, canAdvance, planAvailable }: AttemptResultProps) {
  const info = attempt.flags.filter((f) => INFO_FLAGS.has(f))
  const warnings = attempt.flags.filter((f) => !INFO_FLAGS.has(f))
  const suggestPlan = attempt.next_action === 'plan' && planAvailable

  return (
    <section aria-labelledby="attempt-result-title" className="rounded-md border border-indigo-200 bg-indigo-50/50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="attempt-result-title" className="text-sm font-semibold text-slate-900">
          Attempt {attemptCount} result
        </h2>
        <p className="text-sm text-slate-700">
          <span className="font-mono text-2xl font-semibold text-slate-900">{attempt.provisional_score}</span>
          <span className="text-slate-500"> / 100 provisional</span>
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Meter label="Code (example tests)" value={attempt.code_score} max={CODE_MAX} />
        <Meter label="Explanation (AI rubric)" value={attempt.concept_score} max={CONCEPT_MAX} />
      </div>

      <p className="mt-3 text-sm text-slate-700">{attempt.feedback}</p>

      {(warnings.length > 0 || info.length > 0) && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Flags">
          {warnings.map((f) => (
            <li key={f} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-800 ring-1 ring-amber-200">
              {flagLabel(f)}
            </li>
          ))}
          {info.map((f) => (
            <li key={f} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
              {flagLabel(f)}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-sm font-medium text-slate-900">{NEXT_ACTION[attempt.next_action]}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestPlan && (
          <button type="button" onClick={onOpenPlan} className={btn.primary}>
            Open Plan Mode
          </button>
        )}
        {attempt.next_action !== 'complete' && (
          <button
            type="button"
            onClick={onNext}
            disabled={nextBusy || !canAdvance}
            className={suggestPlan ? btn.secondary : btn.primary}
          >
            {nextBusy ? 'Loading…' : !canAdvance ? 'Answer reasoning check to continue' : 'Next question →'}
          </button>
        )}
      </div>
    </section>
  )
}
