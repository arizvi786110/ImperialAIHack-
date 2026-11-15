import { callLabel, pyRepr } from '../runner/format'
import type { RunResult, RunStatus } from '../runner/types'
import type { ExampleTest } from '../types/contracts'

interface OutputPanelProps {
  result: RunResult | null
  /** null when idle. */
  status: RunStatus | null
  tests: ExampleTest[]
  functionName: string
}

export function OutputPanel({ result, status, tests, functionName }: OutputPanelProps) {
  const passed = result?.results.filter((r) => r.pass).length ?? 0
  const total = result?.results.length ?? 0
  const busy = status !== null

  return (
    <section aria-labelledby="output-title" className="rounded-md border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h2 id="output-title" className="text-sm font-semibold text-slate-900">
          Output
        </h2>
        {!busy && result && !result.notice && (
          <span className={`text-xs font-medium ${passed === total ? 'text-emerald-700' : 'text-slate-600'}`}>
            {passed}/{total} examples passed
          </span>
        )}
      </div>

      <div aria-live="polite" aria-busy={busy} className="max-h-72 overflow-auto px-3 py-2 font-mono text-sm">
        {status === 'loading' && (
          <p className="text-slate-500">Loading Python… (the first run downloads it and can take ~10 s)</p>
        )}
        {status === 'running' && <p className="text-slate-500">Running…</p>}
        {!busy && !result && <p className="text-slate-500">Run your code to see output and example test results.</p>}
        {!busy && result && (
          <div className="flex flex-col gap-2">
            {result.notice && <p className="text-amber-700">{result.notice}</p>}
            {result.timedOut && (
              <p className="text-rose-700">Timed out: execution was stopped. Check for an infinite loop.</p>
            )}
            {result.error && <pre className="whitespace-pre-wrap text-rose-700">{result.error}</pre>}
            {!result.notice && !result.error && (
              <ul className="flex flex-col gap-1.5">
                {result.results.map((r, i) => {
                  const test = tests[i]
                  const trace = result.traces[r.id]
                  return (
                    <li key={r.id} className={r.pass ? 'text-emerald-700' : 'text-rose-700'}>
                      <span aria-hidden="true">{r.pass ? '✓' : '✗'}</span>
                      <span className="sr-only">{r.pass ? 'Passed:' : 'Failed:'}</span>{' '}
                      {test ? callLabel(functionName, test.input) : r.id}
                      {r.pass && test && <span className="text-slate-500"> → {pyRepr(test.expected)}</span>}
                      {!r.pass && !r.error && test && (
                        <span>
                          {' '}
                          → got {pyRepr(r.actual)}, expected {pyRepr(test.expected)}
                        </span>
                      )}
                      {!r.pass && r.error && <span>: {r.error}</span>}
                      {trace && (
                        <details className="mt-1 text-slate-700">
                          <summary className="cursor-pointer text-xs text-slate-500">Traceback</summary>
                          <pre className="whitespace-pre-wrap text-xs">{trace}</pre>
                        </details>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            {result.stdout && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500">Printed output</h3>
                <pre className="whitespace-pre-wrap text-slate-800">{result.stdout}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
