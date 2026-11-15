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
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <Card>
        <h1 className="text-xl font-semibold text-slate-900">Start an assessment</h1>
        <p className="mt-2 text-sm text-slate-600">
          You'll solve short Python problems, explain your approach, and can use approved help: documentation lookup at
          any time, plus hints and Plan Mode after your first attempt. Help is logged, and later questions check what you
          can do independently.
        </p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
          <label htmlFor={aliasId} className="text-sm font-semibold text-slate-900">
            Alias
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
            Demo only: please don't use your real name.
          </p>
          {error && <ErrorBanner message={error} />}
          <button type="submit" disabled={busy || !alias.trim()} className={`${btn.primary} self-start`}>
            {busy ? 'Starting…' : 'Start'}
          </button>
        </form>
      </Card>
    </div>
  )
}
