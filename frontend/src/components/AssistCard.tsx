import { assistReasonLabel, DECISION_STYLE } from '../student/labels'
import type { AssistMode, AssistResponse } from '../types/contracts'
import { Badge } from './ui'

export interface AssistExchange {
  id: number
  mode: AssistMode
  query: string
  response: AssistResponse
}

/** One request/response with the bounded tutor: decision, content, reason and citations. */
export function AssistCard({ exchange, showQuery = true }: { exchange: AssistExchange; showQuery?: boolean }) {
  const { response } = exchange
  const decision = DECISION_STYLE[response.decision]
  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 text-sm">
      {showQuery && (
        <p className="mb-2 text-slate-500">
          <span className="font-medium text-slate-700">You asked:</span> {exchange.query}
        </p>
      )}
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge className={decision.className}>{decision.label}</Badge>
        {response.hint_level > 0 && (
          <Badge className="bg-indigo-50 text-indigo-800 ring-indigo-200">Hint {response.hint_level}</Badge>
        )}
        <span className="text-xs text-slate-500">{assistReasonLabel(response.reason_code)}</span>
      </div>
      <p className="whitespace-pre-wrap text-slate-800">{response.content}</p>
      {response.citations.length > 0 && (
        <div className="mt-2">
          <h3 className="text-xs font-semibold text-slate-500">Sources</h3>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {response.citations.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-xs text-indigo-700 underline hover:text-indigo-600">
                  {url.replace(/^https?:\/\//, '')}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}
