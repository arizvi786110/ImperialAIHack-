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

function show(v: unknown): string {
  return JSON.stringify(v)
}

export function QuestionPanel({ question }: { question: PublicQuestion }) {
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

      <h1 id="question-title" className="text-xl font-semibold text-slate-900">
        {question.title}
      </h1>
      <p className="leading-relaxed text-slate-700">{question.statement}</p>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Function signature</h2>
        <pre className="overflow-x-auto rounded-md bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100">
          <code>{question.function_signature}</code>
        </pre>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Examples</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="py-1 pr-4 font-medium">Input</th>
                <th scope="col" className="py-1 font-medium">Expected</th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {question.example_tests.map((t, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1.5 pr-4">{show(t.input)}</td>
                  <td className="py-1.5">{show(t.expected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Hidden edge-case tests are also used for grading.</p>
      </div>
    </section>
  )
}
