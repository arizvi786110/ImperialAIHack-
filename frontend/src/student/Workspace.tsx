/**
 * One question: editor, Run, Submit (D3), and assistance (D4: Reference / Hint / Plan Mode).
 * Mounted with key={question.id}, so moving to a new question resets all local state.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { api, ApiClientError, errorMessage } from '../api/client'
import { AttemptResult } from '../components/AttemptResult'
import type { AssistExchange } from '../components/AssistCard'
import { ConceptInterview } from '../components/ConceptInterview'
import { CodeEditor } from '../components/CodeEditor'
import { HintBox } from '../components/HintBox'
import { OutputPanel } from '../components/OutputPanel'
import { PlanPanel } from '../components/PlanPanel'
import { QuestionPanel } from '../components/QuestionPanel'
import { ReferencePanel } from '../components/ReferencePanel'
import { Tabs, type TabDef } from '../components/Tabs'
import { btn } from '../components/styles'
import { ErrorBanner } from '../components/ui'
import { functionNameFrom, starterCode } from '../runner/format'
import { pyodideRunner } from '../runner/pyodideRunner'
import type { RunResult, RunStatus, Runner } from '../runner/types'
import type {
  AssistMode,
  AttemptResponse,
  HelpEvent,
  NextReason,
  NextResponse,
  PublicQuestion,
  SessionState,
} from '../types/contracts'
import { NEXT_REASON, STAGE_LABEL } from './labels'
import { loadDraft, newIdempotencyKey, saveDraft } from './storage'

const runner: Runner = pyodideRunner
const PLAN_EDIT_LOG_INTERVAL_MS = 5_000
/** Errors meaning our view of the session is stale: re-fetch it from the server. */
const RESYNC_CODES = new Set(['QUESTION_MISMATCH', 'SESSION_COMPLETE', 'SESSION_NOT_FOUND'])

export interface WorkspaceProps {
  sessionId: string
  alias: string
  question: PublicQuestion
  state: SessionState
  questionNumber: number
  arrivalReason: NextReason | null
  onAdvanced: (next: NextResponse) => void
  onStateChange: (state: SessionState) => void
  onResync: () => void
  onStartOver: () => void
}

export function Workspace(props: WorkspaceProps) {
  const { sessionId, question, state } = props
  const explanationId = useId()
  const functionName = functionNameFrom(question.function_signature)
  const [initial] = useState(() => loadDraft(question.id))

  const [tab, setTab] = useState('code')
  const [code, setCode] = useState(initial?.code ?? starterCode(question.function_signature))
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [plan, setPlan] = useState(initial?.plan ?? '')
  const [attachedPlan, setAttachedPlan] = useState<string | null>(initial?.attachedPlan ?? null)
  const [lastAttempt, setLastAttempt] = useState<AttemptResponse | null>(initial?.lastAttempt ?? null)
  const [attemptCount, setAttemptCount] = useState(initial?.attemptCount ?? 0)
  const [helpEvents, setHelpEvents] = useState<HelpEvent[]>(initial?.helpEvents ?? [])

  const [result, setResult] = useState<RunResult | null>(null)
  const [status, setStatus] = useState<RunStatus | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [nextBusy, setNextBusy] = useState(false)
  const [assistBusy, setAssistBusy] = useState<AssistMode | null>(null)
  const [lookups, setLookups] = useState<AssistExchange[]>([])
  const [hints, setHints] = useState<AssistExchange[]>([])
  const [planReplies, setPlanReplies] = useState<AssistExchange[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showArrival, setShowArrival] = useState(props.arrivalReason !== null)
  const exchangeSeq = useRef(0)
  const lastPlanEditLog = useRef(0)

  const busy = status !== null || submitting
  const hintUnlocked = lastAttempt !== null && state.allowed_help.includes('hint')
  const planUnlocked = lastAttempt !== null && state.allowed_help.includes('plan')

  // Keep drafts across refreshes.
  useEffect(() => {
    saveDraft({ questionId: question.id, code, explanation, plan, attachedPlan, lastAttempt, attemptCount, helpEvents })
  }, [question.id, code, explanation, plan, attachedPlan, lastAttempt, attemptCount, helpEvents])

  // Start downloading Python while the student reads the question.
  useEffect(() => runner.warm?.(), [])

  const logHelp = useCallback((type: string) => {
    setHelpEvents((events) => [...events, { type, timestamp: new Date().toISOString() }])
  }, [])

  const handleError = useCallback(
    (err: unknown) => {
      setError(errorMessage(err))
      if (err instanceof ApiClientError && RESYNC_CODES.has(err.code)) props.onResync()
    },
    [props],
  )

  const run = useCallback(async () => {
    if (busy) return
    setStatus('loading')
    try {
      setResult(await runner.run(code, functionName, question.example_tests, { onStatus: setStatus }))
    } finally {
      setStatus(null)
    }
  }, [busy, code, functionName, question.example_tests])

  async function submit() {
    if (busy || !explanation.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      // Re-run so the evidence matches exactly the code being submitted.
      setStatus('loading')
      const run = await runner.run(code, functionName, question.example_tests, { onStatus: setStatus })
      setStatus(null)
      setResult(run)
      if (run.notice) {
        setError('Python could not be loaded, so the attempt was not submitted. Check your connection and try again.')
        return
      }
      const attempt = await api.submitAttempt(
        {
          session_id: sessionId,
          question_id: question.id,
          code,
          explanation,
          plan: attachedPlan ?? '',
          client_test_results: run.results,
          help_events: helpEvents,
        },
        newIdempotencyKey(),
      )
      setLastAttempt(attempt)
      setAttemptCount((n) => n + 1)
      // The server unlocks Hint and Plan Mode after an attempt; pick up the new state.
      const fresh = await api.getSession(sessionId)
      props.onStateChange(fresh.state)
    } catch (err) {
      handleError(err)
    } finally {
      setStatus(null)
      setSubmitting(false)
    }
  }

  async function goNext() {
    if (!lastAttempt || nextBusy) return
    setNextBusy(true)
    setError(null)
    try {
      props.onAdvanced(await api.next({ session_id: sessionId, previous_attempt_id: lastAttempt.attempt_id }))
    } catch (err) {
      handleError(err)
      setNextBusy(false)
    }
  }

  async function ask(mode: AssistMode, query: string): Promise<boolean> {
    setAssistBusy(mode)
    setError(null)
    logHelp(mode === 'plan' ? 'plan_query' : mode)
    try {
      const response = await api.assist({
        session_id: sessionId,
        question_id: question.id,
        mode,
        query,
        ...(mode !== 'lookup' && lastAttempt && { current_attempt_id: lastAttempt.attempt_id }),
      })
      const exchange: AssistExchange = { id: ++exchangeSeq.current, mode, query, response }
      const add = (list: AssistExchange[]) => [...list, exchange]
      if (mode === 'lookup') setLookups(add)
      else if (mode === 'hint') setHints(add)
      else setPlanReplies(add)
      return true
    } catch (err) {
      handleError(err)
      return false
    } finally {
      setAssistBusy(null)
    }
  }

  function changePlan(value: string) {
    setPlan(value)
    const now = Date.now()
    if (now - lastPlanEditLog.current > PLAN_EDIT_LOG_INTERVAL_MS) {
      lastPlanEditLog.current = now
      logHelp('plan_edit')
    }
  }

  function attachPlan() {
    setAttachedPlan(plan.trim())
    logHelp('plan_used')
    setTab('code')
  }

  const tabs: TabDef[] = [
    { id: 'code', label: 'Code' },
    { id: 'reference', label: 'Reference' },
    { id: 'plan', label: 'Plan Mode', disabled: !planUnlocked, disabledReason: 'available after your first attempt' },
  ]

  const submitLabel = !submitting
    ? 'Submit attempt'
    : status === 'loading'
      ? 'Loading Python…'
      : status === 'running'
        ? 'Running tests…'
        : 'Grading…'
  const arrival = props.arrivalReason ? NEXT_REASON[props.arrivalReason] : null

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">Question {props.questionNumber}</span>
        <span>
          Stage: <span className="font-medium text-slate-800">{STAGE_LABEL[state.stage]}</span>
        </span>
        <span>
          Level: <span className="font-medium text-slate-800">{state.difficulty}</span> / 3
        </span>
        <span className="ml-auto text-xs text-slate-500">
          Signed in as <span className="font-medium">{props.alias}</span>
        </span>
        <button type="button" onClick={props.onStartOver} className={btn.small}>
          Start over
        </button>
      </div>

      {arrival && showArrival && (
        <div role="status" className="flex items-start gap-3 rounded-md bg-sky-50 px-4 py-3 text-sm text-sky-900 ring-1 ring-sky-200">
          <p className="flex-1">
            <span className="font-semibold">{arrival.title}.</span> {arrival.body}
            {state.stage === 'transfer' && ' Hints and Plan Mode unlock after your first attempt.'}
          </p>
          <button type="button" onClick={() => setShowArrival(false)} className="text-xs font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:max-h-[calc(100dvh-10rem)] md:overflow-y-auto">
          <QuestionPanel question={question} />
        </aside>

        <main className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Tabs tabs={tabs} active={tab} onChange={setTab} label="Workspace">
            {tab === 'code' && (
              <div className="flex flex-col gap-4">
                <div className="h-[45vh] min-h-[280px]">
                  <CodeEditor value={code} onChange={setCode} onRun={run} onSubmit={() => void submit()} />
                </div>

                {attachedPlan && (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                    <span className="font-semibold text-slate-800">Plan attached</span> to your next attempt.{' '}
                    <button type="button" onClick={() => setTab('plan')} className="underline">
                      View or edit in Plan Mode
                    </button>
                  </p>
                )}

                <div className="flex flex-col gap-1">
                  <label htmlFor={explanationId} className="text-sm font-semibold text-slate-900">
                    Explain your approach
                  </label>
                  <p className="text-xs text-slate-500">
                    Graded separately (30 pts): core idea, time/space complexity, and edge cases you considered.
                  </p>
                  <textarea
                    id={explanationId}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600"
                    placeholder="e.g. I count how often each item appears, then… This is O(n) time because…"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={run} disabled={busy} className={btn.dark}>
                    {status === 'loading' && !submitting ? 'Loading Python…' : status && !submitting ? 'Running…' : 'Run'}
                  </button>
                  <button type="button" onClick={submit} disabled={busy || !explanation.trim()} className={btn.primary}>
                    {submitLabel}
                  </button>
                  <span className="text-xs text-slate-500">
                    <kbd className="rounded border border-slate-300 px-1">Ctrl</kbd>+
                    <kbd className="rounded border border-slate-300 px-1">Enter</kbd> to run, add{' '}
                    <kbd className="rounded border border-slate-300 px-1">Shift</kbd> to submit
                  </span>
                  {!explanation.trim() && <span className="text-xs text-slate-500">Add an explanation to submit.</span>}
                </div>

                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

                {lastAttempt && (
                  <AttemptResult
                    attempt={lastAttempt}
                    attemptCount={attemptCount}
                    onNext={goNext}
                    onOpenPlan={() => setTab('plan')}
                    nextBusy={nextBusy}
                    planAvailable={planUnlocked}
                  />
                )}

                {lastAttempt && <ConceptInterview key={lastAttempt.attempt_id} sessionId={sessionId} attemptId={lastAttempt.attempt_id} />}

                <OutputPanel result={result} status={status} tests={question.example_tests} functionName={functionName} />

                <HintBox available={hintUnlocked} hints={hints} onAsk={(q) => ask('hint', q)} busy={assistBusy === 'hint'} />
              </div>
            )}

            {tab === 'reference' && (
              <>
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
                <ReferencePanel history={lookups} onAsk={(q) => ask('lookup', q)} busy={assistBusy === 'lookup'} />
              </>
            )}

            {tab === 'plan' && (
              <>
                {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
                <PlanPanel
                  plan={plan}
                  onPlanChange={changePlan}
                  attachedPlan={attachedPlan}
                  onUsePlan={attachPlan}
                  replies={planReplies}
                  onAsk={(q) => ask('plan', q)}
                  busy={assistBusy === 'plan'}
                />
              </>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  )
}
