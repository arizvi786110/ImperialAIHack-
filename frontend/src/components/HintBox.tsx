import { useId, useState, type SubmitEvent } from 'react'
import { AssistCard, type AssistExchange } from './AssistCard'
import { btn, input } from './styles'

interface HintBoxProps {
  /** False until the student has submitted an attempt on this question. */
  available: boolean
  hints: AssistExchange[]
  onAsk: (query: string) => Promise<boolean>
  busy: boolean
}

const DEFAULT_QUERY = "I'm stuck. Can I have a hint?"

/** Progressive conceptual hints (ladder of 3), only after a first attempt. */
export function HintBox({ available, hints, onAsk, busy }: HintBoxProps) {
  const queryId = useId()
  const [query, setQuery] = useState('')
  const used = hints.filter((h) => h.response.hint_level > 0).length

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (busy || !available) return
    if (await onAsk(query.trim() || DEFAULT_QUERY)) setQuery('')
  }

  return (
    <section aria-labelledby={`${queryId}-title`} className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${queryId}-title`} className="text-sm font-semibold text-slate-900">
          Hints
        </h2>
        <span className="text-xs text-slate-500">
          {available ? `${used} used · using hints marks this question as assisted` : 'Unlock after your first attempt'}
        </span>
      </div>
      {available && (
        <form onSubmit={submit} className="mt-2 flex flex-col gap-2 sm:flex-row">
          <label htmlFor={queryId} className="sr-only">
            What are you stuck on? (optional)
          </label>
          <input
            id={queryId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={1500}
            className={input}
            placeholder="What are you stuck on? (optional)"
          />
          <button type="submit" disabled={busy} className={`${btn.secondary} shrink-0`}>
            {busy ? 'Asking…' : 'Get a hint'}
          </button>
        </form>
      )}
      {hints.length > 0 && (
        <div aria-live="polite" className="mt-3 flex flex-col gap-2">
          {[...hints].reverse().map((h) => (
            <AssistCard key={h.id} exchange={h} showQuery={h.query !== DEFAULT_QUERY} />
          ))}
        </div>
      )}
    </section>
  )
}
