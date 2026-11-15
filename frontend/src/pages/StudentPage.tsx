import { useCallback, useEffect, useId, useState } from 'react'
import { CodeEditor } from '../components/CodeEditor'
import { OutputPanel } from '../components/OutputPanel'
import { QuestionPanel } from '../components/QuestionPanel'
import { Tabs, type TabDef } from '../components/Tabs'
import { starterCode } from '../mocks/question'
import { functionNameFrom } from '../runner/stubRunner'
import { pyodideRunner } from '../runner/pyodideRunner'
import type { RunResult } from '../runner/types'
import type { PublicQuestion, SessionStartResponse, AttemptResponse, AssistResponse } from '../types/contracts'
import { startSession, restoreSession, submitAttempt, requestHelp, nextQuestion } from '../api/client'

const sessionKey = 'cognit-team-session'
const buttonPrimary = 'c-button-primary'
const buttonSecondary = 'c-button-secondary'
type HelpMode = 'lookup' | 'hint' | 'plan'
function draftKey(sessionId: string, questionId: string) { return `cognit-draft:${sessionId}:${questionId}` }

export function StudentPage() {
  const explanationId = useId()
  const [session, setSession] = useState<string | null>(null)
  const [question, setQuestion] = useState<PublicQuestion | null>(null)
  const [state, setState] = useState<SessionStartResponse['state'] | null>(null)
  const [alias, setAlias] = useState('Demo Student')
  const [code, setCode] = useState('')
  const [explanation, setExplanation] = useState('')
  const [plan, setPlan] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [lastRunCode, setLastRunCode] = useState('')
  const [attempt, setAttempt] = useState<string | null>(null)
  const [tab, setTab] = useState('code')
  const [mode, setMode] = useState<HelpMode>('lookup')
  const [query, setQuery] = useState('')
  const [help, setHelp] = useState<AssistResponse | null>(null)
  const [score, setScore] = useState<AttemptResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [complete, setComplete] = useState(false)
  const [tried, setTried] = useState(false)

  const load = useCallback((data: SessionStartResponse) => {
    const draft = localStorage.getItem(draftKey(data.session_id, data.question.id))
    setSession(data.session_id)
    setQuestion(data.question)
    setState(data.state)
    setCode(draft ?? starterCode(data.question))
    setExplanation('')
    setPlan('')
    setResult(null)
    setLastRunCode('')
    setAttempt(null)
    setScore(null)
    setHelp(null)
    setTab('code')
    setTried(false)
    setComplete(false)
  }, [])

  useEffect(() => {
    const id = localStorage.getItem(sessionKey)
    if (id) restoreSession(id).then(load).catch(() => localStorage.removeItem(sessionKey))
  }, [load])

  function changeCode(value: string) {
    setCode(value)
    setResult(null)
    if (session && question) localStorage.setItem(draftKey(session, question.id), value)
  }

  async function start() {
    setBusy(true)
    setMessage('')
    try {
      const data = await startSession(alias.trim() || 'Demo Student')
      localStorage.setItem(sessionKey, data.session_id)
      load(data)
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  async function runCode(): Promise<RunResult | null> {
    if (!question) return null
    setRunning(true)
    setMessage('')
    setTab('code')
    try {
      const run = await pyodideRunner.run(code, functionNameFrom(question.function_signature), question.example_tests)
      setResult(run)
      setLastRunCode(code)
      return run
    } catch (error) {
      setMessage(String(error))
      return null
    } finally { setRunning(false) }
  }

  async function submit() {
    if (!session || !question || busy || running) return
    setBusy(true)
    setMessage('')
    try {
      let current = result
      if (!current || code !== lastRunCode) {
        setRunning(true)
        try {
          current = await pyodideRunner.run(code, functionNameFrom(question.function_signature), question.example_tests)
        } finally { setRunning(false) }
        setResult(current)
        setLastRunCode(code)
      }
      const data = await submitAttempt({
        session_id: session, question_id: question.id, code, explanation, plan,
        client_test_results: current.results, help_events: [],
      })
      setScore(data)
      setAttempt(data.attempt_id)
      setTried(true)
      setMessage('Your attempt was saved. Review the feedback or continue to the next problem.')
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  async function ask() {
    if (!session || !question || !query.trim()) return
    setBusy(true)
    setMessage('')
    try {
      const data = await requestHelp({
        session_id: session, question_id: question.id, mode, query,
        current_attempt_id: attempt ?? undefined,
      })
      setHelp(data)
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  async function advance() {
    if (!session || !attempt) return
    setBusy(true)
    setMessage('')
    try {
      const data = await nextQuestion(session, attempt)
      if (data.state.stage === 'complete') {
        setComplete(true)
        setScore(null)
      } else {
        load({ session_id: session, question: data.question, state: data.state })
        setMessage(data.reason === 'transfer'
          ? 'New challenge: try solving this without hints to show independent understanding.'
          : 'New question unlocked. Good luck!')
      }
    } catch (error) { setMessage(String(error)) }
    finally { setBusy(false) }
  }

  function resetSession() {
    localStorage.removeItem(sessionKey)
    setSession(null)
    setQuestion(null)
    setState(null)
    setComplete(false)
    setMessage('')
  }

  const tabs: TabDef[] = [
    { id: 'code', label: 'Python editor' },
    { id: 'reference', label: 'Learning help' },
    { id: 'plan', label: 'Plan mode', disabled: !tried, disabledReason: 'Unlocks after your first submission' },
  ]

  if (!session || !question) return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 py-12 sm:px-8">
      <div className="pointer-events-none absolute left-4 top-10 size-52 rounded-full bg-indigo-100/50 blur-3xl" />
      <div className="grid overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_70px_-30px_rgba(51,65,85,0.28)] md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative bg-gradient-to-br from-[#3339a9] via-indigo-700 to-[#6556d7] p-8 text-white sm:p-12">
          <div className="mb-10 inline-flex rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-indigo-50">PYTHON ASSESSMENT</div>
          <h1 className="max-w-md text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl">
            It's not just about the right answer.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-indigo-100">
            Show what you know. Write Python, run real examples, and explain the thinking behind your solution.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[['01', 'Write code'], ['02', 'Run tests'], ['03', 'Explain']].map(([number, label]) => (
              <div key={number} className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <span className="block text-lg font-black text-indigo-200">{number}</span>
                <span className="mt-2 block text-xs font-semibold text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <div className="c-eyebrow mb-2">Ready when you are</div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Start your assessment</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Begin with a straightforward Python question. Your progress is saved for this browser session.</p>
          <form onSubmit={e => { e.preventDefault(); void start() }} className="mt-8">
            <label htmlFor="student-alias" className="mb-2 block text-sm font-semibold text-slate-700">Your display name</label>
            <input id="student-alias" className="c-input" value={alias} maxLength={80} onChange={e => setAlias(e.target.value)} placeholder="e.g. Demo Student" autoComplete="nickname" />
            <button className="c-button-primary mt-5 w-full py-3.5" disabled={busy} type="submit">
              {busy ? 'Starting assessment…' : 'Start assessment'} <span aria-hidden="true">→</span>
            </button>
          </form>
          {message && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
          <p className="mt-7 text-xs leading-5 text-slate-400">This is a learning prototype, not a secure examination. Use fictional student information.</p>
        </div>
      </div>
    </main>
  )

  if (complete) return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-6 grid size-20 place-items-center rounded-3xl bg-emerald-100 text-4xl text-emerald-700" aria-hidden="true">✓</div>
      <span className="c-eyebrow">Assessment finished</span>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Nice work. You're done!</h1>
      <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">Your submissions are saved. Open the teacher view to explore your evidence, conceptual feedback and review history.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a href={`/teacher?session=${encodeURIComponent(session)}`} className="c-button-primary">See your results →</a>
        <button className={buttonSecondary} onClick={resetSession}>Start a new assessment</button>
      </div>
    </main>
  )

  const checked = result?.results.filter(r => r.pass).length ?? 0
  const currentStep = score ? 3 : result ? 2 : 1
  return (
    <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-10 pt-7 sm:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="c-eyebrow mb-1">Your coding workspace</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Python assessment <span className="font-normal text-slate-400">/ {state?.stage === 'transfer' ? 'Transfer challenge' : 'Practice session'}</span></h1>
          <p className="mt-2 text-sm text-slate-500">Build a solution, check your examples and show how you think.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            <span className="mr-2 font-bold text-slate-700">Session</span>
            <code className="font-mono">{session.slice(0, 8)}…</code>
          </div>
          <a href={`/teacher?session=${encodeURIComponent(session)}`} className={buttonSecondary}>Teacher view ↗</a>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-bold text-indigo-800">Your flow</span>
          {[
            ['1', 'Write'],
            ['2', 'Test'],
            ['3', 'Submit'],
          ].map(([step, name], index) => (
            <div key={step} className={`flex items-center gap-2 ${currentStep > index ? 'font-semibold text-indigo-700' : 'text-slate-400'}`}>
              <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${currentStep > index ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>{step}</span>
              {name}
            </div>
          ))}
        </div>
        <span className="text-xs font-medium text-indigo-600">70 pts for code · 30 pts for reasoning</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.35fr)]">
        <aside className="c-panel h-fit p-5 sm:p-7 lg:sticky lg:top-24">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-sm font-bold text-slate-900">Problem description</span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{question.max_points} points</span>
          </div>
          <QuestionPanel question={question} />
        </aside>
        <section aria-label="Coding and help workspace" className="c-panel min-w-0 p-4 sm:p-6">
          <Tabs tabs={tabs} active={tab} onChange={setTab} label="Workspace sections">
            {tab === 'code' && (
              <div className="flex flex-col gap-5">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#fafbfe] px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-[#edf4ff] font-bold text-[#2563eb]">Py</span>
                      <div><div className="text-sm font-bold text-slate-800">solution.py</div><div className="text-[11px] text-slate-400">Python 3 · Light editor</div></div>
                    </div>
                    <span className="hidden rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 sm:inline">Run: Ctrl / ⌘ + Enter</span>
                  </div>
                  <div className="h-[360px] min-h-[280px] sm:h-[430px]">
                    <CodeEditor value={code} onChange={changeCode} onRun={() => { if (!busy && !running) void runCode() }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button className={buttonPrimary} type="button" disabled={busy || running} onClick={() => { void runCode() }}>
                    <span aria-hidden="true">▶</span> {running ? 'Running Python…' : 'Run code'}
                  </button>
                  <button className={buttonSecondary} type="button" disabled={busy || running} onClick={() => { void submit() }}>
                    {busy && !running ? 'Saving attempt…' : 'Submit for grading'} <span aria-hidden="true">→</span>
                  </button>
                  {attempt && <button className="c-button-primary ml-auto" type="button" disabled={busy || running} onClick={() => { void advance() }}>Next question →</button>}
                </div>

                <OutputPanel result={result} running={running} />

                <div className="rounded-xl border border-slate-200 bg-[#fbfcff] p-4 sm:p-5">
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={explanationId} className="text-sm font-bold text-slate-900">Explain your approach</label>
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">30 points</span>
                  </div>
                  <p className="mb-3 text-xs leading-5 text-slate-500">Write in your own words. What rule are you checking and why does it work? Brief, specific answers count.</p>
                  <textarea id={explanationId} className="c-input min-h-28 resize-y" rows={4} value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="I go through each value and check whether… This also works when…" />
                  <p className="mt-2 text-xs text-slate-400">You can update your code and explanation before submitting again.</p>
                </div>

                {score && <section aria-label="Assessment feedback" className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><div className="c-eyebrow">Provisional feedback</div><h3 className="mt-1 text-xl font-bold text-slate-900">Attempt saved</h3></div>
                    <div className="rounded-xl bg-white px-4 py-3 text-right ring-1 ring-indigo-100">
                      <strong className="text-2xl font-black text-indigo-700">{score.provisional_score}<span className="text-sm font-semibold text-slate-400"> / 100</span></strong>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white p-3"><div className="text-xs font-medium text-slate-500">Code examples</div><div className="mt-1 text-xl font-bold text-slate-900">{score.code_score}<span className="text-xs text-slate-400"> / 70</span></div></div>
                    <div className="rounded-xl bg-white p-3"><div className="text-xs font-medium text-slate-500">Concept explanation</div><div className="mt-1 text-xl font-bold text-slate-900">{score.concept_score}<span className="text-xs text-slate-400"> / 30</span></div></div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{score.feedback}</p>
                  {score.flags.length > 0 && <p className="mt-2 text-xs leading-5 text-amber-800">Review notes: {score.flags.join(' · ')}</p>}
                  <p className="mt-3 text-xs leading-5 text-indigo-700">Browser tests are not secure evidence. A teacher can review or revise the concept score.</p>
                  <button className="c-button-primary mt-4 w-full sm:w-auto" disabled={busy || running} onClick={() => { void advance() }}>Continue to next question →</button>
                </section>}
                {result && !score && !running && <p className="text-xs text-slate-500">{checked} example{checked === 1 ? '' : 's'} passed. Explain your reasoning and submit whenever you're ready.</p>}
              </div>
            )}

            {tab === 'reference' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                  <div className="c-eyebrow mb-2">Learning help</div>
                  <h2 className="text-xl font-bold text-slate-900">A guide, not an answer machine.</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Ask about Python concepts or request a hint. Hints unlock after your first submission, so you get a chance to try independently.</p>
                </div>
                <HelpControls mode={mode} setMode={setMode} query={query} setQuery={setQuery} ask={ask} busy={busy} help={help} tried={tried} />
              </div>
            )}

            {tab === 'plan' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
                  <div className="c-eyebrow mb-2">Plan mode</div>
                  <h2 className="text-xl font-bold text-slate-900">Think through your next attempt.</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Break the problem into small steps before changing your solution. Your plan will be attached to the next submission.</p>
                </div>
                <label htmlFor="student-plan" className="block text-sm font-bold text-slate-800">Your plan</label>
                <textarea id="student-plan" className="c-input min-h-36" value={plan} onChange={e => setPlan(e.target.value)} placeholder="First I check… Then I count… If the list is empty…" />
                <HelpControls mode={mode} setMode={setMode} query={query} setQuery={setQuery} ask={ask} busy={busy} help={help} tried={tried} />
                <button className={buttonPrimary} onClick={() => setTab('code')}>Back to Python editor →</button>
              </div>
            )}
          </Tabs>
          {message && <div role="status" className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{message}</div>}
        </section>
      </div>
    </main>
  )
}

function HelpControls({
  mode, setMode, query, setQuery, ask, busy, help, tried,
}: {
  mode: HelpMode, setMode: (v: HelpMode) => void, query: string, setQuery: (v: string) => void,
  ask: () => void, busy: boolean, help: AssistResponse | null, tried: boolean
}) {
  return <section className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {(['lookup', 'hint', 'plan'] as const).map(m => (
        <button key={m} type="button" className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50'}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
          {m === 'lookup' ? 'Reference search' : m === 'hint' ? 'Hint' : 'Plan guidance'}{m !== 'lookup' && !tried ? ' 🔒' : ''}
        </button>
      ))}
    </div>
    {!tried && mode !== 'lookup' && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Submit your first attempt to unlock this type of help.</p>}
    <label htmlFor="help-query" className="block text-sm font-bold text-slate-800">What would you like to understand?</label>
    <textarea id="help-query" className="c-input min-h-28" rows={3} value={query} onChange={e => setQuery(e.target.value)} placeholder="How does the modulo operator work in Python?" />
    <button className={buttonPrimary} disabled={busy || !query.trim() || (!tried && mode !== 'lookup')} onClick={ask}>{busy ? 'Getting guidance…' : 'Ask Cognit'} →</button>
    {help && <div aria-live="polite" className="rounded-2xl border border-indigo-100 bg-white p-5">
      <div className="mb-2 flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${help.decision === 'deny' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{help.decision === 'deny' ? 'Request not allowed' : 'Guidance'}</span></div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{help.content}</p>
      {help.citations?.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3"><span className="text-xs font-bold text-slate-500">Reference sources</span><ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-500">{help.citations.map((citation, i) => <li key={i}>{typeof citation === 'string' ? citation : JSON.stringify(citation)}</li>)}</ul></div>}
    </div>}
  </section>
}
