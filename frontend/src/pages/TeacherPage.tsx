import { useEffect, useState } from 'react'
import { getTeacher, reviewAttempt } from '../api/client'

type Row = {
  attempt_id: string, title: string, difficulty: number, skill_tags: string[], assisted: boolean,
  explanation: string, effective_score: number,
  evaluation?: { code_score: number, concept_score: number, rationale: string, flags: string[], review_required: boolean } | null,
  reviews: Array<{ reviewer_note: string, effective_score: number }>, review_status: string
}
type Dashboard = {
  attempts: Row[], score_breakdown: { overall_percent: number | null, note: string },
  mastery_by_skill: Record<string, {
    independent_transfer_correct: number, independent_transfer_total: number, heuristic_mastery: number | null
  }>,
  assisted_vs_independent: {
    assisted: { count: number, mean_score: number | null },
    independent: { count: number, mean_score: number | null }
  },
  help_log: Array<{ mode: string, decision: string, query: string }>, review_flags: unknown[]
}
const startId = new URLSearchParams(window.location.search).get('session')
  ?? localStorage.getItem('cognit-team-session') ?? ''
function niceSkill(skill: string) {
  return skill.replace(/[_-]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
}

export function TeacherPage() {
  const [id, setId] = useState(startId)
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [scores, setScores] = useState<Record<string, string>>({})

  async function refresh(sessionId = id) {
    if (!sessionId.trim()) { setError('Enter a session ID to see its assessment results.'); return }
    setBusy(true)
    setError('')
    try {
      const response = await getTeacher(sessionId.trim())
      setData(response as Dashboard)
    } catch (e) {
      setError(String(e))
      setData(null)
    } finally { setBusy(false) }
  }
  useEffect(() => { if (startId) void refresh(startId) }, [])

  async function save(attemptId: string) {
    const value = scores[attemptId]
    const score = Number(value)
    const note = (notes[attemptId] ?? '').trim()
    if (!note || value === undefined || value.trim() === '' || !Number.isFinite(score) || score < 0 || score > 30) {
      setError('Enter a concept score from 0 to 30, along with a reason for your review.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await reviewAttempt(attemptId, score, note)
      await refresh()
    } catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }

  return (
    <main className="mx-auto w-full max-w-[1300px] flex-1 space-y-6 px-4 pb-12 pt-8 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="c-eyebrow mb-2">Learning analytics</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Teacher dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Explore submitted code evidence, conceptual explanations and independent versus assisted progress.
          </p>
        </div>
        <a href="/student" className="c-button-secondary">← Student workspace</a>
      </header>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/75 px-4 py-3 text-xs leading-6 text-amber-900">
        <span className="text-lg" aria-hidden="true">ⓘ</span>
        <p><strong>Demo data only.</strong> Teacher access is not authenticated, browser test results are untrusted, and mastery indicators are heuristic estimates.</p>
      </div>

      <section className="c-panel p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-lg font-bold text-slate-900">Find an assessment</h2><p className="mt-1 text-xs text-slate-500">Use the session ID generated in the student workspace.</p></div>
          {data && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">Session loaded</span>}
        </div>
        <form onSubmit={e => { e.preventDefault(); void refresh() }} className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="teacher-session" className="sr-only">Session ID</label>
          <input id="teacher-session" className="c-input min-w-0 flex-1 font-mono" value={id} onChange={e => setId(e.target.value)} placeholder="Paste a student session ID" />
          <button type="submit" className="c-button-primary" disabled={busy}>{busy ? 'Loading results…' : 'Load results →'}</button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </section>

      {!data ? (
        <section className="c-panel flex min-h-60 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600" aria-hidden="true">◎</div>
          <h2 className="text-lg font-bold text-slate-900">Your insights will appear here</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Start a demo assessment, submit some Python code, and load its session ID to see meaningful results.</p>
          <a href="/student" className="c-button-secondary mt-5">Open student workspace →</a>
        </section>
      ) : (
        <>
          <section aria-label="Assessment summary" className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Weighted score" value={data.score_breakdown.overall_percent === null ? 'N/A' : `${data.score_breakdown.overall_percent}%`} subtitle="Across submitted questions" accent="indigo" />
            <MetricCard label="Independent attempts" value={String(data.assisted_vs_independent.independent.count)} subtitle="Completed without hints" accent="emerald" />
            <MetricCard label="Assisted attempts" value={String(data.assisted_vs_independent.assisted.count)} subtitle="Completed with guidance" accent="amber" />
          </section>

          <section className="c-panel p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div><h2 className="text-lg font-bold text-slate-900">Skill progression</h2><p className="mt-1 text-xs text-slate-500">Independent transfer checks, not a certified mastery score</p></div>
              <span className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">{Object.keys(data.mastery_by_skill).length} skill areas</span>
            </div>
            {Object.keys(data.mastery_by_skill).length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No transfer evidence yet. Continue the assessment to collect progress data.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(data.mastery_by_skill).map(([skill, progress]) => {
                  const total = progress.independent_transfer_total
                  const value = total > 0 ? Math.round(100 * progress.independent_transfer_correct / total) : 0
                  return (
                    <div key={skill} className="rounded-xl border border-slate-100 bg-[#fbfcff] p-4">
                      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">{niceSkill(skill)}</h3><span className="text-xs font-semibold text-indigo-700">{progress.independent_transfer_correct} / {total} passed</span></div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-label={`${niceSkill(skill)} independent transfer success rate`} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${value}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{total === 0 ? 'Awaiting independent transfer question' : `${value}% of independent transfer checks passed`}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div><h2 className="text-xl font-bold text-slate-900">Submitted attempts</h2><p className="mt-1 text-sm text-slate-500">Inspect an explanation and optionally record a teacher review.</p></div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{data.attempts.length} submissions</span>
            </div>
            {data.attempts.length === 0 && <div className="c-panel p-6 text-sm text-slate-500">No submissions in this session yet.</div>}
            {data.attempts.map((attempt, i) => (
              <article key={attempt.attempt_id} className="c-panel overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">Attempt {i + 1}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${attempt.assisted ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{attempt.assisted ? 'Assisted' : 'Independent'}</span>
                      <span className="text-xs text-slate-400">Level {attempt.difficulty}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{attempt.title}</h3>
                    <p className="mt-1 text-xs capitalize text-slate-500">{attempt.skill_tags.join(' · ')} · {attempt.review_status}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 px-4 py-3 text-center"><div className="text-2xl font-black text-indigo-700">{attempt.effective_score}<span className="text-sm text-indigo-400"> / 100</span></div><span className="text-xs text-indigo-600">Current score</span></div>
                </div>
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 sm:px-6">
                  <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-medium text-slate-500">Example code score</div><div className="mt-1 text-xl font-bold text-slate-900">{attempt.evaluation?.code_score ?? 0}<span className="text-xs text-slate-400"> / 70</span></div></div>
                  <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-medium text-slate-500">Concept explanation score</div><div className="mt-1 text-xl font-bold text-slate-900">{attempt.evaluation?.concept_score ?? 0}<span className="text-xs text-slate-400"> / 30</span></div></div>
                </div>
                <div className="px-5 pb-5 sm:px-6">
                  <details className="group rounded-xl border border-slate-200">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50">View explanation and grading evidence <span aria-hidden="true" className="ml-1">⌄</span></summary>
                    <div className="space-y-3 border-t border-slate-100 px-4 py-4 text-sm leading-6 text-slate-600">
                      <div><strong className="block text-xs text-slate-500">Student explanation</strong><p className="mt-1 whitespace-pre-wrap">{attempt.explanation || 'No explanation provided.'}</p></div>
                      <div><strong className="block text-xs text-slate-500">Grading rationale</strong><p className="mt-1">{attempt.evaluation?.rationale || 'Grading rationale unavailable.'}</p></div>
                      {attempt.evaluation?.flags && attempt.evaluation.flags.length > 0 && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Flags: {attempt.evaluation.flags.join(' · ')}</p>}
                    </div>
                  </details>
                  <div className="mt-5 rounded-xl bg-[#fbfcff] p-4">
                    <h4 className="text-sm font-bold text-slate-900">Teacher review</h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Override only the concept component, between 0 and 30 points. Each review is recorded.</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <label className="sr-only" htmlFor={`review-score-${i}`}>New concept score</label>
                      <input id={`review-score-${i}`} className="c-input w-full sm:w-32" type="number" min="0" max="30" value={scores[attempt.attempt_id] ?? ''} onChange={e => setScores(prev => ({ ...prev, [attempt.attempt_id]: e.target.value }))} placeholder="0–30" />
                      <label className="sr-only" htmlFor={`review-note-${i}`}>Reason for review</label>
                      <input id={`review-note-${i}`} className="c-input min-w-0 flex-1" value={notes[attempt.attempt_id] ?? ''} onChange={e => setNotes(prev => ({ ...prev, [attempt.attempt_id]: e.target.value }))} placeholder="Reason for score adjustment" />
                      <button className="c-button-secondary shrink-0" disabled={busy} onClick={() => { void save(attempt.attempt_id) }}>Save review</button>
                    </div>
                    {attempt.reviews?.map((review, j) => <p key={j} className="mt-2 text-xs leading-5 text-slate-500">Recorded review: {review.reviewer_note} · adjusted total {review.effective_score}/100</p>)}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="c-panel p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">Guidance history</h2><span className="text-xs text-slate-400">{data.help_log.length} requests</span></div>
            {data.help_log.length === 0 ? <p className="text-sm text-slate-500">No help was requested for this session.</p> : (
              <div className="space-y-2">{data.help_log.map((item, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 ring-1 ring-slate-200">{item.mode}</span>
                  <span className="min-w-0 flex-1 break-words text-slate-600">{item.query}</span>
                  <span className={`text-xs font-semibold ${item.decision === 'deny' ? 'text-rose-700' : 'text-emerald-700'}`}>{item.decision}</span>
                </div>
              ))}</div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

function MetricCard({ label, value, subtitle, accent }: {
  label: string, value: string, subtitle: string, accent: 'indigo' | 'emerald' | 'amber'
}) {
  const styles = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return <div className="c-panel p-5 sm:p-6">
    <span className={`mb-4 inline-flex size-8 items-center justify-center rounded-xl text-lg font-bold ${styles[accent]}`} aria-hidden="true">◈</span>
    <p className="text-sm font-semibold text-slate-600">{label}</p>
    <strong className="mt-1 block text-3xl font-black tracking-tight text-slate-900">{value}</strong>
    <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
  </div>
}
