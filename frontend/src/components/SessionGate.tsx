import { useId, useState, type SubmitEvent } from 'react'
import { btn, input } from './styles'
import { Card, ErrorBanner } from './ui'

interface SessionGateProps {
  onStart: (alias: string) => void
  busy: boolean
  error: string | null
}

export function SessionGate({ onStart, busy, error }: SessionGateProps) {
  const aliasId = useId()
  const [alias, setAlias] = useState('')

  function submit(e: SubmitEvent) {
    e.preventDefault()
    if (alias.trim()) onStart(alias.trim())
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <Card className="overflow-hidden p-0">
        <div className="rounded-t-2xl bg-gradient-to-br from-indigo-700 to-violet-600 px-7 py-9 text-white">
          <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide">PYTHON ASSESSMENT</span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">It's not just about the right answer.</h1>
          <p className="mt-3 text-sm leading-7 text-indigo-100">Write Python, explain your approach, and show that your understanding transfers to a new problem.</p>
          <div className="mt-6 grid grid-cols-3 gap-3 text-xs font-semibold">
            {['01 · Write','02 · Test','03 · Explain'].map(x => <span key={x} className="rounded-xl border border-white/20 bg-white/10 p-3">{x}</span>)}
          </div>
        </div>
        <div className="p-7">
          <h2 className="text-xl font-bold text-slate-900">Start your assessment</h2>
        <p className="mt-2 text-sm text-slate-600">
          You'll solve short Python problems, explain your approach, and can use approved help: documentation lookup at
          any time, plus hints and Plan Mode after your first attempt. Help is logged, and later questions check what you
          can do independently.
        </p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <label htmlFor={aliasId} className="text-sm font-semibold text-slate-900">
            Student label
          </label>
          <input
            id={aliasId}
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={64}
            autoComplete="off"
            className={input}
            placeholder="e.g. demo-student-1"
            aria-describedby={`${aliasId}-hint`}
          />
          <p id={`${aliasId}-hint`} className="text-xs text-slate-500">
            Use a fictional name or student label. Educators can see this label in the dashboard.
          </p>
          {error && <ErrorBanner message={error} />}
          <button type="submit" disabled={busy || !alias.trim()} className={`${btn.primary} w-full`}>
            {busy ? 'Starting…' : 'Start'}
          </button>
        </form>
        </div>
      </Card>
    </div>
  )
}
