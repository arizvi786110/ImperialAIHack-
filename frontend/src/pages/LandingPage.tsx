import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BinaryRain } from '../components/BinaryRain'
const features = [
  { n:'01', title:'Write real code', text:'A focused Python editor, clear examples and instant test feedback.', symbol:'⌘' },
  { n:'02', title:'Show your thinking', text:'A short reasoning interview checks how you handle edge cases and counterexamples.', symbol:'◈' },
  { n:'03', title:'Prove transfer', text:'New, validated problems test whether your understanding survives a change of context.', symbol:'↗' },
]
export function LandingPage() {
  const nav = useNavigate()
  const [starting, setStarting] = useState(false)
  const begin = () => {
    if (starting) return
    setStarting(true)
    window.setTimeout(() => nav('/student'), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700)
  }
  return <main className="c-landing">
    <section className="relative isolate flex min-h-[min(86vh,850px)] flex-col items-center justify-center overflow-hidden px-5 py-24 text-center">
      <BinaryRain converge={starting} />
      <div className="pointer-events-none absolute inset-x-0 top-[18%] mx-auto h-96 max-w-5xl bg-[radial-gradient(ellipse,rgba(16,18,24,.5),rgba(16,18,24,.94)_68%,#101218)]" />
      <div className="relative z-10 max-w-4xl">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#303440] bg-[#1B1E27] px-4 py-2 text-xs font-medium text-[#A1A5B0]"><span className="size-1.5 rounded-full bg-[#59C7B5]" /> The adaptive programming lab</div>
        <h1 className="c-hero-heading text-5xl font-semibold tracking-[-.055em] text-[#F4F4F6] sm:text-7xl lg:text-[88px]">Think Deeper.<br/><span className="text-[#8B7CF6]">Code Smarter.</span></h1>
        <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-[#A1A5B0] sm:text-lg">Code is the starting point. Cognit helps you demonstrate the thinking behind it, then challenges you to apply what you've learned in a new way.</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button type="button" onClick={begin} disabled={starting} className="c-cta group inline-flex items-center gap-3 rounded-xl bg-[#8B7CF6] px-7 py-3.5 text-sm font-semibold text-[#101218] transition hover:bg-[#A99FFF] disabled:opacity-60">{starting ? 'Preparing workspace…' : 'Start Learning'} <span className="transition group-hover:translate-x-1">↗</span></button>
          <a href="#how-it-works" className="rounded-xl border border-[#303440] px-7 py-3.5 text-sm font-medium text-[#F4F4F6] transition hover:border-[#8B7CF6]">Explore the platform</a>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs font-medium text-[#797F8B]"><span>◉ Python workspace</span><span>◈ Concept interviews</span><span>↗ Adaptive practice</span></div>
      </div>
    </section>
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
      <div className="mb-10 max-w-xl"><span className="c-eyebrow">THE COGNIT METHOD</span><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F4F4F6] sm:text-4xl">Go beyond passing the tests.</h2><p className="mt-3 text-sm leading-7 text-[#A1A5B0]">Four kinds of evidence, one clear learning journey.</p></div>
      <div className="grid gap-4 md:grid-cols-3">{features.map(f=><article key={f.n} className="c-feature group rounded-2xl border border-[#303440] bg-[#1B1E27] p-7 transition duration-300 hover:-translate-y-1 hover:border-[#8B7CF6]/60"><div className="mb-8 flex items-center justify-between"><span className="font-mono text-xs text-[#737887]">{f.n} / COGNIT</span><span className="text-2xl text-[#8B7CF6] transition group-hover:scale-110">{f.symbol}</span></div><h3 className="text-lg font-semibold text-[#F4F4F6]">{f.title}</h3><p className="mt-3 text-sm leading-7 text-[#A1A5B0]">{f.text}</p></article>)}</div>
      <div className="mt-6 rounded-2xl border border-[#303440] bg-[#171A22] p-7 sm:p-9"><div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center"><div><span className="c-eyebrow">THE LEARNING LOOP</span><h3 className="mt-2 text-xl font-semibold text-[#F4F4F6]">Solve <span className="text-[#8B7CF6]">→</span> Understand <span className="text-[#8B7CF6]">→</span> Transfer <span className="text-[#59C7B5]">→</span> Master</h3><p className="mt-2 text-sm text-[#A1A5B0]">Correct outputs matter, but so do independent reasoning and transfer.</p></div><button onClick={begin} className="c-cta rounded-xl bg-[#8B7CF6] px-6 py-3 text-sm font-semibold text-[#101218] hover:bg-[#A99FFF]">Open workspace ↗</button></div></div>
    </section>
  </main>
}
