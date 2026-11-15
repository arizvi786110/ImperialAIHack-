import type { RunResult } from '../runner/types'

interface OutputPanelProps {
  result: RunResult | null
  running: boolean
}

export function OutputPanel({ result, running }: OutputPanelProps) {
  const passed = result?.results.filter(r => r.pass).length ?? 0
  const total = result?.results.length ?? 0

  return (
    <section aria-labelledby="output-title" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-slate-200/65 font-mono text-sm text-slate-700">›_</span>
          <h2 id="output-title" className="text-sm font-bold text-slate-800">Test results</h2>
        </div>
        {result && !result.notice && (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${passed === total && total > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {passed} of {total} passed
          </span>
        )}
      </div>
      <div aria-live="polite" aria-busy={running} className="max-h-64 overflow-y-auto p-4 font-mono text-[13px]">
        {running && <div className="flex items-center gap-3 text-slate-500"><span className="size-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" aria-hidden="true" />Loading Python or running tests…</div>}
        {!running && !result && <p className="font-sans text-sm text-slate-500">Press <strong className="text-slate-700">Run code</strong> to check your solution against the examples.</p>}
        {!running && result && (
          <div className="space-y-3">
            {result.notice && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">{result.notice}</p>}
            {result.timedOut && <p className="rounded-lg bg-rose-50 p-3 text-rose-700">Execution stopped because it took too long. Check for an infinite loop.</p>}
            {result.error && <pre className="whitespace-pre-wrap rounded-lg bg-rose-50 p-3 text-rose-700">{result.error}</pre>}
            {result.stdout && <div><div className="mb-1 font-sans text-xs font-bold text-slate-500">Printed output</div><pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-700">{result.stdout}</pre></div>}
            {!result.notice && (
              <ul className="space-y-2">
                {result.results.map((r, i) => (
                  <li key={r.id} className={`rounded-lg border px-3 py-2 ${r.pass ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'}`}>
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className={r.pass ? 'text-emerald-600' : 'text-rose-600'}>{r.pass ? '✓' : '✕'}</span>
                      <span className="font-sans text-sm font-semibold text-slate-700">Example {i + 1}</span>
                      <span className={`ml-auto font-sans text-xs font-medium ${r.pass ? 'text-emerald-700' : 'text-rose-700'}`}>{r.pass ? 'Passed' : 'Needs work'}</span>
                    </div>
                    {!r.pass && r.error && <p className="mt-1 break-words text-xs text-rose-700">{r.error}</p>}
                    {!r.pass && !r.error && <p className="mt-1 break-words text-xs text-slate-600">Your output: {JSON.stringify(r.actual)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
