import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/client'
import type { ConceptProbe } from '../types/contracts'

interface Props {
  sessionId: string
  attemptId: string
  onAnswered?: () => void
}

export function ConceptInterview({ sessionId, attemptId, onAnswered }: Props) {
  const [probe, setProbe] = useState<ConceptProbe | null>(null)
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function load() {
    setBusy(true)
    setError('')
    try {
      const result = await api.startConceptProbe({ session_id: sessionId, attempt_id: attemptId })
      setProbe(result)
      setAnswer(result.answer ?? '')
      if (result.answered) onAnswered?.()
    } catch (e) { setError(errorMessage(e)) }
    finally { setBusy(false) }
  }
  useEffect(() => { void load() }, [attemptId])
  async function submit() {
    if (!answer.trim()) return
    setBusy(true)
    setError('')
    try {
      setProbe(await api.answerConceptProbe({ session_id: sessionId, attempt_id: attemptId, answer: answer.trim() }))
      onAnswered?.()
    } catch (e) { setError(errorMessage(e)) }
    finally { setBusy(false) }
  }
  return (
    <section aria-labelledby="concept-interview-title" className="rounded-2xl border border-violet-200 bg-gradient-to-br from-white to-violet-50/75 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-600">Reasoning check</div>
          <h3 id="concept-interview-title" className="text-lg font-bold text-slate-900">Can you explain it another way?</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-100">0–15 evidence points</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        A quick follow-up helps distinguish understanding from memorised phrases. This is separate from your coding score.
      </p>
      {!probe ? (
        <button className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50" onClick={() => void load()} disabled={busy}>
          {busy ? 'Preparing your question…' : 'Try a reasoning check →'}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <p className="rounded-xl border border-violet-100 bg-white p-4 text-sm font-semibold leading-7 text-slate-800">{probe.question}</p>
          {!probe.answered ? (
            <>
              <label htmlFor="concept-probe-answer" className="block text-sm font-semibold text-slate-700">Your explanation</label>
              <textarea id="concept-probe-answer" className="min-h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" value={answer} maxLength={1800} onChange={e => setAnswer(e.target.value)} placeholder="Use a small example or explain what would happen…" />
              <button className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50" disabled={busy || !answer.trim()} onClick={() => void submit()}>
                {busy ? 'Checking reasoning…' : 'Submit explanation'}
              </button>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <strong className="text-sm text-slate-900">Your reasoning evidence</strong>
                <span className="ml-auto text-sm font-bold text-violet-700">{probe.score === null ? 'Teacher review' : String(probe.score) + '/15'}</span>
              </div>
              <p className="text-sm leading-6 text-slate-600">{probe.rationale}</p>
              {probe.needs_review && <p className="mt-2 text-xs text-amber-700">Provisional. A teacher should review this result.</p>}
            </div>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </section>
  )
}
