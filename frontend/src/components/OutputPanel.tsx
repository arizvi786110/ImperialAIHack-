import type { RunResult } from '../runner/types'

interface OutputPanelProps {
  result: RunResult | null
  running: boolean
}

export function OutputPanel({ result, running }: OutputPanelProps) {
  const passed = result?.results.filter((r) => r.pass).length ?? 0
  const total = result?.results.length ?? 0

  return (
    <section aria-labelledby="output-title" className="rounded-md border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h2 id="output-title" className="text-sm font-semibold text-slate-900">
          Output
        </h2>
        {result && !result.notice && (
          <span className={`text-xs font-medium ${passed === total ? 'text-emerald-700' : 'text-slate-600'}`}>
            {passed}/{total} examples passed
          </span>
        )}
      </div>

      <div aria-live="polite" aria-busy={running} className="max-h-56 overflow-auto px-3 py-2 font-mono text-sm">
        {running && <p className="text-slate-500">Running…</p>}
        {!running && !result && <p className="text-slate-500">Run your code to see output and example test results.</p>}
        {!running && result && (
          <div className="flex flex-col gap-2">
            {result.notice && <p className="text-amber-700">{result.notice}</p>}
            {result.timedOut && <p className="text-rose-700">Timed out: execution was stopped.</p>}
            {result.error && <pre className="whitespace-pre-wrap text-rose-700">{result.error}</pre>}
            {result.stdout && <pre className="whitespace-pre-wrap text-slate-800">{result.stdout}</pre>}
            {!result.notice && (
              <ul className="flex flex-col gap-1">
                {result.results.map((r) => (
                  <li key={r.id} className={r.pass ? 'text-emerald-700' : 'text-rose-700'}>
                    {r.pass ? '✓' : '✗'} {r.id}
                    {!r.pass && r.error ? `: ${r.error}` : ''}
                    {!r.pass && !r.error ? ` (got ${JSON.stringify(r.actual)})` : ''}
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
