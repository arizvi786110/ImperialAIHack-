const skills = ['hashing', 'loops / edge cases', 'complexity']

/** D5 shell. Will render GET /api/teacher/session/{id}; no real student data. */
export function TeacherPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Teacher review</h1>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
          Demo only · not connected to a session yet
        </span>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-2">
        <section aria-labelledby="scores" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 id="scores" className="mb-3 text-sm font-semibold text-slate-900">
            Score breakdown
          </h2>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Functional tests', '— / 50'],
              ['Edge cases', '— / 20'],
              ['Conceptual', '— / 30'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="mt-1 font-mono text-lg text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="mastery" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 id="mastery" className="mb-3 text-sm font-semibold text-slate-900">
            Mastery by skill <span className="font-normal text-slate-500">(heuristic indicator)</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th scope="col" className="py-1 font-medium">Skill</th>
                  <th scope="col" className="py-1 font-medium">Independent transfer</th>
                  <th scope="col" className="py-1 font-medium">Assisted vs independent</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s} className="border-t border-slate-100 text-slate-700">
                    <td className="py-1.5">{s}</td>
                    <td className="py-1.5">—</td>
                    <td className="py-1.5">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section aria-labelledby="log" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 id="log" className="mb-2 text-sm font-semibold text-slate-900">
          Attempt log &amp; review
        </h2>
        <p className="text-sm text-slate-500">
          No attempts yet. Attempts, help requests, review flags and score overrides (with audit history) appear here.
        </p>
      </section>
    </div>
  )
}
