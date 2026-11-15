/**
 * Teacher dashboard (D5). Renders GET /api/teacher/session/{id}: real stored data only.
 * DEMO ONLY: no authentication, no real student data.
 */
import { useCallback, useEffect, useId, useState, type SubmitEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { btn, formatTime, input } from '../components/styles'
import { Badge, Card, ErrorBanner } from '../components/ui'
import { assistReasonLabel, DECISION_STYLE, flagLabel, INFO_FLAGS } from '../student/labels'
import { loadSnapshot } from '../student/storage'
import { AttemptDetails } from '../teacher/AttemptDetails'
import { LabTeacherPanel } from '../components/LabTeacherPanel'
import type { TeacherRosterEntry, TeacherSessionView } from '../types/contracts'

const fmt = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '—' : `${n}${suffix}`)

export function TeacherPage() {
  const [params, setParams] = useSearchParams()
  const sessionId = params.get('session')
  const [view, setView] = useState<TeacherSessionView | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [roster, setRoster] = useState<TeacherRosterEntry[]>([])
  const [rosterError, setRosterError] = useState<string | null>(null)

  const fetchView = useCallback(async (id: string) => {
    try {
      setView(await api.getTeacherSession(id))
      setLoadedFor(id)
      setError(null)
    } catch (err) {
      setView(null)
      setLoadedFor(id)
      setError(errorMessage(err))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    api.getTeacherRoster().then(data => setRoster(data.sessions)).catch(err => setRosterError(errorMessage(err)))
  }, [])

  useEffect(() => {
    // Fetch-on-navigation: fetchView only sets state after its awaited request resolves.
    // oxlint-disable-next-line react/set-state-in-effect
    if (sessionId) void fetchView(sessionId)
  }, [sessionId, fetchView])

  function refresh() {
    if (!sessionId) return
    setRefreshing(true)
    void fetchView(sessionId)
  }

  const loading = sessionId !== null && loadedFor !== sessionId

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold text-slate-900">Teacher review</h1>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
            Public demo roster · fictional student names only
          </span>
        </div>
        {sessionId && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            Session <code className="rounded bg-slate-200 px-1.5 py-0.5 text-slate-800">{sessionId}</code>
            <button type="button" onClick={refresh} disabled={refreshing || loading} className={btn.small}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" onClick={() => setParams({})} className={btn.small}>
              Change
            </button>
          </div>
        )}
      </header>

      <section aria-label="Student roster" className="rounded-2xl border border-[#303440] bg-[#1B1E27] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-semibold text-[#F4F4F6]">Student sessions</h2><p className="mt-1 text-xs text-[#A1A5B0]">Select a student label to inspect progress and reasoning.</p></div>
          <span className="rounded-full border border-[#303440] px-3 py-1 text-xs text-[#A1A5B0]">{roster.length} sessions</span>
        </div>
        {rosterError && <p className="text-xs text-amber-300">{rosterError}</p>}
        <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {roster.map(entry => <button key={entry.session_id} type="button" onClick={() => setParams({session:entry.session_id})}
            className={`rounded-xl border px-4 py-3 text-left transition-colors hover:border-[#8B7CF6] ${entry.session_id===sessionId?'border-[#8B7CF6] bg-[#29263E]':'border-[#303440] bg-[#151820]'}`}>
            <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-[#F4F4F6]">{entry.student_alias}</span><span className="text-xs text-[#59C7B5]">L{entry.difficulty}</span></div>
            <div className="mt-2 text-xs text-[#A1A5B0]">{entry.attempt_count} attempts · {entry.stage} · {entry.questions_served} questions</div>
          </button>)}
          {!rosterError && roster.length===0 && <p className="text-sm text-[#A1A5B0]">No students have started an assessment yet.</p>}
        </div>
      </section>
      <LabTeacherPanel />
      {!sessionId && <SessionPicker onPick={(id) => setParams({ session: id })} />}
      {loading && <p className="text-sm text-slate-500">Loading session…</p>}
      {!loading && error && <ErrorBanner message={error} />}
      {!loading && view && <Dashboard view={view} onReviewed={refresh} />}
    </div>
  )
}

function SessionPicker({ onPick }: { onPick: (id: string) => void }) {
  const id = useId()
  const [value, setValue] = useState('')
  const recent = loadSnapshot()

  function submit(e: SubmitEvent) {
    e.preventDefault()
    if (value.trim()) onPick(value.trim())
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-900">
          Session ID
        </label>
        <div className="flex gap-2">
          <input id={id} value={value} onChange={(e) => setValue(e.target.value)} className={input} placeholder="s_…" />
          <button type="submit" disabled={!value.trim()} className={`${btn.primary} shrink-0`}>
            Open
          </button>
        </div>
        {recent && (
          <p className="text-sm text-slate-600">
            Or open the latest student session on this device:{' '}
            <button type="button" onClick={() => onPick(recent.sessionId)} className="font-medium text-indigo-700 underline">
              {recent.alias} ({recent.sessionId})
            </button>
          </p>
        )}
      </form>
    </Card>
  )
}

function Dashboard({ view, onReviewed }: { view: TeacherSessionView; onReviewed: () => void }) {
  const titles = Object.fromEntries(view.attempts.map((a) => [a.question_id, a.title]))
  const { score_breakdown: sb, assisted_vs_independent: avi } = view
  const skills = Object.entries(view.mastery_by_skill)

  return (
    <>
      {view.review_flags.length > 0 && (
        <section aria-labelledby="flags" className="rounded-lg border border-rose-200 bg-rose-50/60 p-5">
          <h2 id="flags" className="text-sm font-semibold text-rose-900">
            Needs review ({view.review_flags.length})
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {view.review_flags.map((f) => (
              <li key={f.attempt_id} className="flex flex-wrap items-center gap-2">
                <a href={`#attempt-${f.attempt_id}`} onClick={() => openAttempt(f.attempt_id)} className="font-medium text-rose-900 underline">
                  {titles[f.question_id] ?? f.question_id}
                </a>
                <span className="text-xs text-rose-800">
                  {f.flags.filter((x) => !INFO_FLAGS.has(x)).map(flagLabel).join(' · ')} · confidence {Math.round(f.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Score breakdown</h2>
          <p className="mt-2">
            <span className="font-mono text-3xl font-semibold text-slate-900">{fmt(sb.overall_percent, '%')}</span>
            <span className="ml-2 text-sm text-slate-500">
              difficulty-weighted ({sb.weighted_achieved} / {sb.weighted_max})
            </span>
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th scope="col" className="py-1 font-medium">Question (latest attempt)</th>
                  <th scope="col" className="py-1 font-medium">Level</th>
                  <th scope="col" className="py-1 font-medium">Weight</th>
                  <th scope="col" className="py-1 font-medium">Score</th>
                  <th scope="col" className="py-1 font-medium">Help</th>
                </tr>
              </thead>
              <tbody>
                {sb.per_question.map((q) => (
                  <tr key={q.question_id} className="border-t border-slate-100 text-slate-700">
                    <td className="py-1.5">{titles[q.question_id] ?? q.question_id}</td>
                    <td className="py-1.5">{q.difficulty}</td>
                    <td className="py-1.5 font-mono">×{q.weight}</td>
                    <td className="py-1.5 font-mono">{q.score}</td>
                    <td className="py-1.5">{q.assisted ? 'Assisted' : 'Independent'}</td>
                  </tr>
                ))}
                {sb.per_question.length === 0 && (
                  <tr><td colSpan={5} className="py-2 text-slate-500">No attempts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">{sb.note}</p>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Assisted vs independent</h2>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-amber-50 p-3">
              <dt className="text-xs text-amber-800">Assisted ({avi.assisted.count})</dt>
              <dd className="mt-1 font-mono text-lg text-slate-900">{fmt(avi.assisted.mean_score)}</dd>
            </div>
            <div className="rounded-md bg-sky-50 p-3">
              <dt className="text-xs text-sky-800">Independent ({avi.independent.count})</dt>
              <dd className="mt-1 font-mono text-lg text-slate-900">{fmt(avi.independent.mean_score)}</dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="text-xs text-slate-600">Transfer gap</dt>
              <dd className="mt-1 font-mono text-lg text-slate-900">{fmt(avi.transfer_gap)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">Mean score per attempt. {avi.note}</p>

          <h2 className="mt-5 text-sm font-semibold text-slate-900">
            Mastery by skill <span className="font-normal text-slate-500">(heuristic indicator, not a validated measure)</span>
          </h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th scope="col" className="py-1 font-medium">Skill</th>
                  <th scope="col" className="py-1 font-medium">Independent transfer</th>
                  <th scope="col" className="py-1 font-medium">Assisted / independent mean</th>
                  <th scope="col" className="py-1 font-medium">Indicator</th>
                </tr>
              </thead>
              <tbody>
                {skills.map(([skill, m]) => (
                  <tr key={skill} className="border-t border-slate-100 text-slate-700">
                    <td className="py-1.5">{skill}</td>
                    <td className="py-1.5 font-mono">
                      {m.independent_transfer_correct}/{m.independent_transfer_total}
                    </td>
                    <td className="py-1.5 font-mono">
                      {fmt(m.assisted_mean)} / {fmt(m.independent_mean)}
                    </td>
                    <td className="py-1.5 font-mono">
                      {m.heuristic_mastery === null ? '—' : `${Math.round(m.heuristic_mastery * 100)}%`}
                    </td>
                  </tr>
                ))}
                {skills.length === 0 && (
                  <tr><td colSpan={4} className="py-2 text-slate-500">No evidence yet (recorded when the student moves on).</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Updated when the student moves to the next question, using their latest attempt on each question.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Attempt log &amp; review ({view.attempts.length})</h2>
        <p className="mt-1 text-xs text-slate-500">
          Open an attempt to compare code, explanation and plan, see the AI rubric breakdown, and override or approve the
          concept score. Every review is kept in the audit history.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {view.attempts.map((a, i) => (
            <AttemptDetails key={a.attempt_id} attempt={a} index={i} onReviewed={onReviewed} />
          ))}
          {view.attempts.length === 0 && <p className="text-sm text-slate-500">No attempts yet.</p>}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Help log ({view.help_log.length})</h2>
        <p className="mt-1 text-xs text-slate-500">Context only: help requests are never penalised by count alone.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th scope="col" className="py-1 pr-3 font-medium">Time</th>
                <th scope="col" className="py-1 pr-3 font-medium">Question</th>
                <th scope="col" className="py-1 pr-3 font-medium">Mode</th>
                <th scope="col" className="py-1 pr-3 font-medium">Request</th>
                <th scope="col" className="py-1 pr-3 font-medium">Decision</th>
                <th scope="col" className="py-1 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {view.help_log.map((h) => (
                <tr key={h.event_id} className="border-t border-slate-100 align-top text-slate-700">
                  <td className="py-1.5 pr-3 whitespace-nowrap text-xs">{formatTime(h.created_at)}</td>
                  <td className="py-1.5 pr-3">{titles[h.question_id] ?? h.question_id}</td>
                  <td className="py-1.5 pr-3 capitalize">
                    {h.mode}
                    {h.hint_level > 0 && ` ${h.hint_level}/3`}
                  </td>
                  <td className="max-w-xs py-1.5 pr-3 break-words whitespace-pre-wrap">{h.query}</td>
                  <td className="py-1.5 pr-3">
                    <Badge className={DECISION_STYLE[h.decision].className}>{DECISION_STYLE[h.decision].label}</Badge>
                  </td>
                  <td className="py-1.5 text-xs">{assistReasonLabel(h.reason_code)}</td>
                </tr>
              ))}
              {view.help_log.length === 0 && (
                <tr><td colSpan={6} className="py-2 text-slate-500">No help requested.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

/** Expand the linked attempt's <details> when jumping to it from the review queue. */
function openAttempt(attemptId: string) {
  const el = document.getElementById(`attempt-${attemptId}`)
  if (el instanceof HTMLDetailsElement) el.open = true
}
