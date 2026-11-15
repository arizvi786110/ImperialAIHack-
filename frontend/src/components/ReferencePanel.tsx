import { useId, useState, type SubmitEvent } from 'react'
import { AssistCard, type AssistExchange } from './AssistCard'
import { btn, input } from './styles'

interface ReferencePanelProps {
  history: AssistExchange[]
  onAsk: (query: string) => Promise<boolean>
  busy: boolean
}

/** Lookup mode: approved Python documentation only, available at any time. */
export function ReferencePanel({ history, onAsk, busy }: ReferencePanelProps) {
  const queryId = useId()
  const [query, setQuery] = useState('')

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q || busy) return
    if (await onAsk(q)) setQuery('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Reference lookup</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ask about a Python concept (lists, dictionaries, loops, sets, sorting, strings…). Answers come from approved
          docs.python.org pages, with sources. It won't solve the question for you.
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={queryId} className="sr-only">
          Documentation question
        </label>
        <input
          id={queryId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={1500}
          className={input}
          placeholder="e.g. How do Python dictionaries work?"
        />
        <button type="submit" disabled={busy || !query.trim()} className={`${btn.dark} shrink-0`}>
          {busy ? 'Searching…' : 'Look up'}
        </button>
      </form>
      <div aria-live="polite" className="flex flex-col gap-3">
        {history.length === 0 && <p className="text-sm text-slate-500">No lookups yet.</p>}
        {[...history].reverse().map((ex) => (
          <AssistCard key={ex.id} exchange={ex} />
        ))}
      </div>
    </div>
  )
}
