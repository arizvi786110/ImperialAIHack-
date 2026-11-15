import type { PublicQuestion } from '../types/contracts'

const difficultyLabel: Record<PublicQuestion['difficulty'], string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Challenge',
}
const difficultyStyle: Record<PublicQuestion['difficulty'], string> = {
  1: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  2: 'bg-amber-50 text-amber-700 ring-amber-200',
  3: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
}
function show(value: unknown): string {
  return JSON.stringify(value)
}

export function QuestionPanel({ question }: { question: PublicQuestion }) {
  return (
    <section aria-labelledby="question-title" className="flex flex-col gap-6">
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${difficultyStyle[question.difficulty]}`}>
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
            {difficultyLabel[question.difficulty]}
          </span>
          {question.skill_tags.map((tag) => (
            <span key={tag} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold capitalize text-indigo-700">
              {tag}
            </span>
          ))}
        </div>
        <h2 id="question-title" className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
          {question.title}
        </h2>
        <p className="text-[15px] leading-7 text-slate-600">{question.statement}</p>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/65 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
          <span aria-hidden="true">⌘</span> Your function
        </div>
        <code className="block overflow-x-auto whitespace-pre rounded-lg bg-white px-3 py-3 font-mono text-[13px] font-semibold text-slate-800 ring-1 ring-indigo-100">
          {question.function_signature}
        </code>
        <p className="mt-2 text-xs leading-5 text-indigo-700/80">Write this function in the editor. Your solution should work for every example.</p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">Example inputs and outputs</h3>
          <span className="text-xs font-medium text-slate-400">{question.example_tests.length} examples</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <span>Input</span><span>Expected output</span>
          </div>
          {question.example_tests.map((test, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0">
              <code className="break-all font-mono text-[13px] text-slate-700">{show(test.input)}</code>
              <code className="break-all font-mono text-[13px] font-semibold text-indigo-700">{show(test.expected)}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 rounded-xl bg-emerald-50/70 p-4 text-sm text-emerald-900">
        <span aria-hidden="true" className="text-lg leading-none">✦</span>
        <div><strong className="block text-xs font-bold uppercase tracking-wider">A useful tip</strong>
          <p className="mt-1 text-xs leading-5">Start with a simple solution, run the example tests, then explain why your approach works.</p>
        </div>
      </div>
    </section>
  )
}
