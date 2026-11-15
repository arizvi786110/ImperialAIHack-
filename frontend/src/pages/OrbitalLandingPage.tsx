import {Link} from 'react-router-dom'
import {PlanetScene} from '../components/PlanetScene'

const pillars=[
 {index:'01',label:'SOLVE',title:'Code is evidence',text:'Start with a real programming problem and inspect the observable result.'},
 {index:'02',label:'UNDERSTAND',title:'Reasoning is tested',text:'An AI examiner challenges your explanation with counterexamples, not solutions.'},
 {index:'03',label:'TRANSFER',title:'Knowledge travels',text:'Apply the same idea to a new, validated question.'}
]
export function OrbitalLandingPage(){
 return <main className="orbit-site">
   <section className="orbit-hero mx-auto grid w-full max-w-[1500px] items-center gap-5 px-5 pb-20 pt-16 lg:grid-cols-[.95fr_1.05fr] lg:pb-28 lg:pt-20 sm:px-8">
     <div className="relative z-10 max-w-[660px]">
       <span className="inline-flex items-center gap-2 rounded-full border border-[#40445B] px-4 py-2 text-[11px] font-semibold uppercase tracking-[.16em] text-[#D1C9FF]"><span className="size-1.5 rounded-full bg-[#59C7B5]"/> COGNIT REASONING LAB</span>
       <h1 className="mt-8 text-[clamp(3.2rem,6.3vw,6.6rem)] font-semibold leading-[1.03] tracking-[-.068em] text-[#F4F4F6]">The answer <span className="text-[#B5AAFF]">isn't</span> the whole story.</h1>
       <p className="mt-7 max-w-xl text-[16px] leading-8 text-[#B8BECA] sm:text-lg">Can you explain <em>why</em> your algorithm works? Cognit's AI doesn't hand you the answer. It asks the next question that reveals what you really understand.</p>
       <div className="mt-9 flex flex-wrap gap-3">
         <Link to="/challenge" className="orbit-primary-cta inline-flex items-center gap-3 rounded-xl px-6 py-3.5 text-sm font-bold">Challenge my reasoning <span>↗</span></Link>
         <Link to="/student" className="inline-flex items-center gap-2 rounded-xl border border-[#42475A] px-6 py-3.5 text-sm font-semibold text-[#F4F4F6] transition hover:bg-[#252938]">Open Python workspace →</Link>
       </div>
       <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-[#A6A9B7]"><span><strong className="text-[#59C7B5]">✓</strong> No solutions disclosed</span><span><strong className="text-[#59C7B5]">✓</strong> Adaptive follow-ups</span><span><strong className="text-[#59C7B5]">✓</strong> Teacher evidence</span></div>
     </div>
     <div className="orbit-visual relative min-h-[390px] sm:min-h-[490px] lg:min-h-[600px]"><PlanetScene/>
       <div className="orbit-floating-card absolute bottom-[8%] left-[7%] z-10 max-w-[270px] rounded-xl border border-[#4B4B64] bg-[#1A1C29] p-4 sm:bottom-[13%] sm:left-[6%]">
         <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#B5AAFF]">THE EXAMINER ASKS</span>
         <p className="mt-2 text-[13px] leading-6 text-[#F4F4F6]">“What changes when the input is empty, and how do you know?”</p>
         <div className="mt-3 flex items-center gap-2 text-[11px] text-[#59C7B5]"><span className="size-1.5 rounded-full bg-[#59C7B5]"/> Reasoning, not memorisation</div>
       </div>
     </div>
   </section>
   <section className="orbit-section mx-auto max-w-[1500px] px-5 pb-24 sm:px-8">
     <div className="flex flex-wrap items-end justify-between gap-5 border-t border-[#303440] pt-10">
       <div><p className="orbit-kicker">THE ASSESSMENT LOOP</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F4F4F6] sm:text-4xl">What does understanding look like?</h2></div>
       <p className="max-w-md text-sm leading-7 text-[#B8BECA]">Three kinds of evidence. Every answer determines what the system asks next.</p>
     </div>
     <div className="mt-9 grid gap-4 md:grid-cols-3">{pillars.map(x=><article key={x.index} className="orbit-step rounded-2xl border border-[#383D4E] bg-[#1A1D27] p-7">
       <div className="flex items-center justify-between"><span className="font-mono text-xs text-[#AFA3FF]">{x.index}</span><span className="orbit-kicker">{x.label}</span></div>
       <h3 className="mt-10 text-xl font-semibold text-[#F4F4F6]">{x.title}</h3>
       <p className="mt-3 text-sm leading-7 text-[#B8BECA]">{x.text}</p>
     </article>)}</div>
     <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#44475F] bg-[#242434] px-7 py-6"><div><p className="text-lg font-semibold text-[#F4F4F6]">Ready for your first challenge?</p><p className="mt-1 text-sm text-[#B8BECA]">Choose a skill and reason through three questions. No coding needed to start.</p></div><Link to="/challenge" className="orbit-primary-cta rounded-xl px-6 py-3 text-sm font-bold">Start live interview →</Link></div>
   </section>
 </main>
}
