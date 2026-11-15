import { useId, useState, type SubmitEvent } from 'react'
import { api, errorMessage } from '../api/client'
import { btn, input } from '../components/styles'
import { ErrorBanner } from '../components/ui'
import type { TeacherAttemptRow } from '../types/contracts'

const CONCEPT_MAX = 30

/** Teacher override / approval. Every submission is an append-only audit record (note required). */
export function ReviewForm({ attempt, onSaved }: { attempt: TeacherAttemptRow; onSaved: () => void }) {
  const id = useId()
  const [score, setScore] = useState('')
  const [approved, setApproved] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const parsed = score.trim() === '' ? undefined : Number(score)
  const scoreInvalid = parsed !== undefined && (Number.isNaN(parsed) || parsed < 0 || parsed > CONCEPT_MAX)
  const canSubmit = !busy && !scoreInvalid && note.trim() !== '' && (parsed !== undefined || approved)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const res = await api.submitReview({
        attempt_id: attempt.attempt_id,
        reviewer_note: note.trim(),
        ...(parsed !== undefined && { override_concept_score: parsed }),
        ...(approved && { approved: true }),
      })
      setSaved(`Saved: ${res.review_status}, effective score ${res.effective_score} / 100.`)
      setScore('')
      setApproved(false)
      setNote('')
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3" aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`} className="text-sm font-semibold text-slate-900">
        Teacher review
      </h4>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-score`} className="text-xs font-medium text-slate-700">
            Override concept score (0–{CONCEPT_MAX})
          </label>
          <input
            id={`${id}-score`}
            type="number"
            inputMode="decimal"
            min={0}
            max={CONCEPT_MAX}
            step={0.5}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className={`${input} w-32`}
            placeholder={String(attempt.effective_concept_score)}
            aria-invalid={scoreInvalid || undefined}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
          Approve grade
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-note`} className="text-xs font-medium text-slate-700">
          Reviewer note (required, kept in the audit log)
        </label>
        <textarea id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={input} />
      </div>
      {scoreInvalid && <p className="text-xs text-rose-700">Score must be between 0 and {CONCEPT_MAX}.</p>}
      {error && <ErrorBanner message={error} />}
      {saved && (
        <p role="status" className="text-xs text-emerald-700">
          {saved}
        </p>
      )}
      <div>
        <button type="submit" disabled={!canSubmit} className={btn.primary}>
          {busy ? 'Saving…' : 'Save review'}
        </button>
        {!canSubmit && !busy && (
          <span className="ml-3 text-xs text-slate-500">Enter a score and/or tick approve, plus a note.</span>
        )}
      </div>
    </form>
  )
}
