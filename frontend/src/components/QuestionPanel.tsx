import { callLabel, functionNameFrom, pyRepr } from '../runner/format'
import type { PublicQuestion } from '../types/contracts'

const difficultyLabel: Record<PublicQuestion['difficulty'], string> = {
  1: 'Level 1 · Foundation',
  2: 'Level 2 · Intermediate',
  3: 'Level 3 · Advanced',
}

const difficultyStyle: Record<PublicQuestion['difficulty'], string> = {
  1: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  2: 'bg-amber-50 text-amber-800 ring-amber-200',
  3: 'bg-rose-50 text-rose-800 ring-rose-200',
}

export function QuestionPanel({ question }: { question: PublicQuestion }) {
  const fn = functionNameFrom(question.function_signature)
  return (
    <section aria-labelledby="question-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${difficultyStyle[question.difficulty]}`}>
          {difficultyLabel[question.difficulty]}
        </span>
        {question.skill_tags.map((tag) => (
          <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
            {tag}
          </span>
        ))}
        <span className="ml-auto text-xs text-slate-500">{question.max_points} pts</span>
      </div>

      <h1 id="question-title" className="text-2xl font-bold tracking-tight text-slate-900">
        {question.title}
      </h1>
      <p className="text-[15px] leading-7 text-slate-700">{question.statement}</p>

      <div>
        <h2 className="mb-2 text-sm font-bold text-slate-900">Function signature</h2>
        <pre className="overflow-x-auto rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 font-mono text-sm font-semibold text-indigo-800">
          <code>{question.function_signature}</code>
        </pre>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Examples</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="py-1 pr-4 font-medium">Call</th>
                <th scope="col" className="py-1 font-medium">Expected</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {question.example_tests.map((t, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="border-t border-slate-100 py-3 pr-4">{callLabel(fn, t.input)}</td>
                  <td className="border-t border-slate-100 py-3">{pyRepr(t.expected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Your code score currently comes from these example tests, run in your browser (provisional).
        </p>
      </div>
    </section>
  )
}
