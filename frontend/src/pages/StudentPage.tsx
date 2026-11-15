import { useCallback, useId, useState, type ReactNode } from 'react'
import { CodeEditor } from '../components/CodeEditor'
import { OutputPanel } from '../components/OutputPanel'
import { QuestionPanel } from '../components/QuestionPanel'
import { Tabs, type TabDef } from '../components/Tabs'
import { mockQuestion, starterCode } from '../mocks/question'
import { functionNameFrom, stubRunner } from '../runner/stubRunner'
import type { RunResult, Runner } from '../runner/types'

// D2 swaps this for the Pyodide worker runner; D3 replaces mock question with /api/session/start.
const runner: Runner = stubRunner
const question = mockQuestion

const btn =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50'

export function StudentPage() {
  const explanationId = useId()
  const [tab, setTab] = useState('code')
  const [code, setCode] = useState(() => starterCode(question))
  const [explanation, setExplanation] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [submitNotice, setSubmitNotice] = useState<string | null>(null)

  const run = useCallback(async () => {
    if (running) return
    setRunning(true)
    try {
      setResult(await runner.run(code, functionNameFrom(question.function_signature), question.example_tests))
    } finally {
      setRunning(false)
    }
  }, [code, running])

  function submit() {
    // D3: POST /api/attempt with code, explanation, plan, client_test_results, help_events.
    setAttempts((n) => n + 1)
    setSubmitNotice('Attempt recorded locally (backend not connected yet). Plan Mode is now unlocked.')
  }

  const tabs: TabDef[] = [
    { id: 'code', label: 'Code' },
    { id: 'reference', label: 'Reference' },
    {
      id: 'plan',
      label: 'Plan Mode',
      disabled: attempts === 0,
      disabledReason: 'available after your first attempt',
    },
  ]

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <aside className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:max-h-[calc(100dvh-7rem)] md:overflow-y-auto">
        <QuestionPanel question={question} />
      </aside>

      <main className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <Tabs tabs={tabs} active={tab} onChange={setTab} label="Workspace">
          {tab === 'code' && (
            <div className="flex flex-col gap-4">
              <div className="h-[45vh] min-h-[280px]">
                <CodeEditor value={code} onChange={setCode} onRun={run} />
              </div>

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
                  placeholder="e.g. I count characters with a dictionary, then scan again for the first count of 1…"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={run}
                  disabled={running}
                  className={`${btn} bg-slate-800 text-white hover:bg-slate-700`}
                >
                  {running ? 'Running…' : 'Run'}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={running || explanation.trim() === ''}
                  className={`${btn} bg-indigo-600 text-white hover:bg-indigo-500`}
                >
                  Submit attempt
                </button>
                <span className="text-xs text-slate-500">
                  <kbd className="rounded border border-slate-300 px-1">Ctrl</kbd>+
                  <kbd className="rounded border border-slate-300 px-1">Enter</kbd> to run
                </span>
                {explanation.trim() === '' && (
                  <span className="text-xs text-slate-500">Add an explanation to submit.</span>
                )}
              </div>

              {submitNotice && (
                <p role="status" className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                  {submitNotice}
                </p>
              )}

              <OutputPanel result={result} running={running} />
            </div>
          )}

          {tab === 'reference' && (
            <Placeholder title="Reference lookup">
              Search approved Python documentation (docs.python.org) with citations. Coming in D4.
            </Placeholder>
          )}

          {tab === 'plan' && (
            <Placeholder title="Plan Mode">
              Write a short solution outline. The assistant asks Socratic questions and suggests high-level
              subgoals, one issue at a time. It never gives code or a full algorithm. Coming in D4.
            </Placeholder>
          )}
        </Tabs>
      </main>
    </div>
  )
}

function Placeholder({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{children}</p>
    </div>
  )
}
