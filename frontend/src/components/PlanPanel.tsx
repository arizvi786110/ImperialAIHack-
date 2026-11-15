import { useId, useState } from 'react'
import { AssistCard, type AssistExchange } from './AssistCard'
import { btn, input } from './styles'

interface PlanPanelProps {
  plan: string
  onPlanChange: (plan: string) => void
  attachedPlan: string | null
  onUsePlan: () => void
  replies: AssistExchange[]
  onAsk: (query: string) => Promise<boolean>
  busy: boolean
}

const MAX_QUERY = 1500

/**
 * Plan Mode (MASTER_PLAN.md spec): the student writes their own outline; the planner asks
 * one Socratic question / raises one issue at a time and never gives code or a full algorithm.
 */
export function PlanPanel({ plan, onPlanChange, attachedPlan, onUsePlan, replies, onAsk, busy }: PlanPanelProps) {
  const planId = useId()
  const questionId = useId()
  const [question, setQuestion] = useState('')
  const attachedIsCurrent = attachedPlan !== null && attachedPlan === plan.trim()

  async function ask() {
    const body = `My current plan:\n${plan.trim()}${question.trim() ? `\n\nMy question: ${question.trim()}` : ''}`
    if (await onAsk(body.slice(0, MAX_QUERY))) setQuestion('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Plan Mode</h2>
        <p className="mt-1 text-sm text-slate-600">
          Outline your approach in your own words: inputs and outputs, what you'll keep track of, edge cases, how you'll
          test it. The planner asks one question at a time about your plan. It won't give you code or the algorithm.
          Using Plan Mode marks this question as assisted.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={planId} className="text-sm font-semibold text-slate-900">
          Your plan
        </label>
        <textarea
          id={planId}
          value={plan}
          onChange={(e) => onPlanChange(e.target.value)}
          rows={7}
          maxLength={1200}
          className={input}
          placeholder={'1. Input: …  Output: …\n2. I will keep track of …\n3. Edge cases: …\n4. I will test with …'}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={questionId} className="text-sm font-medium text-slate-700">
          Question for the planner (optional)
        </label>
        <input
          id={questionId}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={250}
          className={input}
          placeholder="e.g. Have I missed an edge case?"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={ask} disabled={busy || !plan.trim()} className={btn.dark}>
          {busy ? 'Asking…' : 'Ask the planner'}
        </button>
        <button type="button" onClick={onUsePlan} disabled={!plan.trim() || attachedIsCurrent} className={btn.primary}>
          {attachedIsCurrent ? 'Plan attached ✓' : 'Use this plan'}
        </button>
        <span className="text-xs text-slate-500">"Use this plan" attaches it to your next submitted attempt.</span>
      </div>

      <div aria-live="polite" className="flex flex-col gap-3">
        {[...replies].reverse().map((r) => (
          <AssistCard key={r.id} exchange={r} showQuery={false} />
        ))}
      </div>
    </div>
  )
}
