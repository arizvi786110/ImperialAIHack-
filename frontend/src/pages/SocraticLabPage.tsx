import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {api,errorMessage} from '../api/client'
import {PlanetScene} from '../components/PlanetScene'
import type {LabSession} from '../types/contracts'

const skills: {id:LabSession['skill'],title:string,copy:string,icon:string}[] = [
  {id:'loops',title:'Loops',copy:'Reason about counting and decisions.',icon:'↻'},
  {id:'hashing',title:'Hashing',copy:'Explain what repeated values change.',icon:'#'},
  {id:'complexity',title:'Complexity',copy:'Predict how algorithms scale.',icon:'↗'},
]
const localKey='cognit-orbit-lab-session'
const steps=['Mechanism','Edge cases','Transfer']

export function SocraticLabPage(){
 const [skill,setSkill]=useState<LabSession['skill']>('loops')
 const [alias,setAlias]=useState('Demo Student')
 const [session,setSession]=useState<LabSession|null>(null)
 const [answer,setAnswer]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [restoring,setRestoring]=useState(true)
 useEffect(()=>{
   const id=localStorage.getItem(localKey)
   if(!id){setRestoring(false);return}
   api.labSession(id).then(setSession).catch(()=>localStorage.removeItem(localKey)).finally(()=>setRestoring(false))
 },[])
 const begin=async()=>{
   setBusy(true);setError('')
   try{const result=await api.labStart(skill,alias.trim()||'Demo Student');localStorage.setItem(localKey,result.session_id);setSession(result);setAnswer('')}
   catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 const respond=async()=>{
   if(!session||!answer.trim()||busy)return
   setBusy(true);setError('')
   try{const next=await api.labReply(session.session_id,answer.trim());setSession(next);setAnswer('')}
   catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 }
 const restart=()=>{localStorage.removeItem(localKey);setSession(null);setAnswer('');setError('')}
 const latest=session?.history[session.history.length-1]
 return <main className="orbit-site min-h-[calc(100vh-100px)]">
   <section className="relative overflow-hidden border-b border-[#303440] bg-[#151722] px-5 py-10 sm:px-8">
     <div className="pointer-events-none absolute right-0 top-[-120px] h-[370px] w-[490px] opacity-55"><PlanetScene compact/></div>
     <div className="relative z-10 mx-auto max-w-[1320px]">
       <p className="orbit-kicker">LIVE REASONING ENGINE / COGNIT</p>
       <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
         <div><h1 className="text-3xl font-semibold tracking-[-.04em] text-[#F4F4F6] sm:text-[46px]">Can you defend your thinking?</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#B8BECA]">An examiner that asks questions instead of giving answers. Three rounds. Every response shapes the next challenge.</p></div>
         <Link to="/student" className="rounded-xl border border-[#45495C] px-4 py-2.5 text-xs font-semibold text-[#F4F4F6] transition hover:bg-[#2B2E3B]">Prefer writing Python? ↗</Link>
       </div>
     </div>
   </section>

   {restoring?<section className="mx-auto max-w-[1320px] px-5 py-10 sm:px-8"><div className="orbit-skeleton h-52 rounded-2xl"/></section>
   :!session?<section className="mx-auto grid max-w-[1320px] gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(290px,.8fr)] sm:px-8">
      <div>
        <p className="orbit-kicker">STEP 01 / SELECT A CONCEPT</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#F4F4F6]">What would you like to explore?</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">{skills.map(x=><button key={x.id} type="button" onClick={()=>setSkill(x.id)} aria-pressed={skill===x.id}
           className={`orbit-skill text-left ${skill===x.id?'orbit-skill-active':''}`}>
           <span className="mb-7 block text-3xl font-light text-[#AFA5FF]">{x.icon}</span>
           <span className="block text-lg font-semibold text-[#F4F4F6]">{x.title}</span>
           <span className="mt-2 block text-xs leading-6 text-[#B8BECA]">{x.copy}</span>
         </button>)}</div>
        <div className="mt-6 rounded-2xl border border-[#383D4E] bg-[#1A1D27] p-6">
          <label htmlFor="lab-alias" className="block text-xs font-semibold uppercase tracking-widest text-[#B8BECA]">Your demo label</label>
          <input id="lab-alias" className="orbit-input mt-3" maxLength={64} value={alias} onChange={e=>setAlias(e.target.value)} placeholder="Demo Student"/>
          <p className="mt-2 text-xs text-[#9AA4B5]">Use a fictional label. Your educator can review this session.</p>
          <button type="button" disabled={busy} onClick={()=>void begin()} className="orbit-primary-cta mt-5 w-full rounded-xl px-6 py-3.5 text-sm font-bold">{busy?'Preparing your challenge…':'Begin the interview →'}</button>
        </div>
      </div>
      <aside className="h-fit rounded-2xl border border-[#383D4E] bg-[#1A1D27] p-6 lg:mt-9">
        <span className="orbit-kicker">HOW IT WORKS</span>
        <h2 className="mt-3 text-xl font-semibold text-[#F4F4F6]">No solutions. Just sharper questions.</h2>
        <p className="mt-3 text-sm leading-7 text-[#B8BECA]">Explain your approach in plain English. Cognit asks about a mechanism, challenges an edge case, then checks whether the concept transfers.</p>
        <div className="mt-6 space-y-5">{steps.map((x,i)=><div key={x} className="flex items-center gap-4"><span className="grid size-9 place-items-center rounded-full border border-[#56516D] font-mono text-xs text-[#BDB3FF]">0{i+1}</span><span className="text-sm font-medium text-[#F4F4F6]">{x}</span></div>)}</div>
        <p className="mt-8 border-t border-[#303440] pt-5 text-xs leading-6 text-[#A1A5B0]">This is a provisional learning signal, not a certified exam. The model never executes or reveals a correct solution.</p>
      </aside>
   </section>
   :<section className="mx-auto grid max-w-[1320px] gap-6 px-5 py-9 lg:grid-cols-[minmax(0,1.65fr)_minmax(285px,.78fr)] sm:px-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="orbit-kicker">{session.title.toUpperCase()} / INTERVIEW</p><h2 className="mt-1 text-2xl font-semibold text-[#F4F4F6]">{session.complete?'Interview complete':'Let’s test your reasoning.'}</h2></div><button type="button" onClick={restart} className="rounded-xl border border-[#45495C] px-4 py-2 text-xs font-semibold text-[#C7CBDA] hover:text-white">New interview</button></div>
        <div className="mt-6 flex items-center gap-2">{steps.map((step,i)=><div key={step} className="flex-1"><div className={`h-1 rounded-full ${session.turn>i?'bg-[#59C7B5]':session.turn===i?'bg-[#8B7CF6]':'bg-[#383D4E]'}`}/><div className="mt-2 text-[11px] font-semibold text-[#AEB4C2]">{i+1}. {step}</div></div>)}</div>
        <div className="mt-6 space-y-4">
          {session.history.map((h,i)=><div key={i} className="space-y-3">
              <article className="rounded-2xl border border-[#44435B] bg-[#242337] p-5"><div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#BDB3FF]"><span className="grid size-7 place-items-center rounded-lg bg-[#36304F]">C</span> COGNIT · QUESTION {i+1}</div><p className="text-sm leading-7 text-[#F4F4F6]">{h.question}</p></article>
              <article className="ml-4 rounded-2xl border border-[#394353] bg-[#1C2530] p-5"><div className="mb-2 text-xs font-bold text-[#8EE1D1]">{session.student_alias.toUpperCase()} · RESPONSE</div><p className="whitespace-pre-wrap text-sm leading-7 text-[#E1E6EE]">{h.answer}</p></article>
              <div className="ml-4 border-l-2 border-[#59C7B5] pl-4 text-xs leading-6 text-[#B8BECA]"><strong className="mr-2 text-[#8EE1D1]">{h.model_used==='claude_socratic'?'Claude challenged your reasoning':'Vetted fallback question'}</strong>{h.feedback}</div>
          </div>)}
          {!session.complete&&session.question&&<article className="rounded-2xl border border-[#575079] bg-[#232237] p-5 sm:p-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-bold text-[#C5BAFF]"><span className="grid size-8 place-items-center rounded-lg bg-[#39334F]">◈</span> COGNIT · CURRENT CHALLENGE</div><span className="rounded-full border border-[#575079] px-3 py-1 text-[11px] text-[#B8BECA]">Round {session.turn+1} of {session.max_turns}</span></div>
              <h3 className="text-lg font-semibold leading-8 text-[#F4F4F6]">{session.question}</h3>
              <label htmlFor="lab-answer" className="mt-6 block text-xs font-semibold uppercase tracking-widest text-[#B8BECA]">YOUR REASONING</label>
              <textarea id="lab-answer" className="orbit-input mt-3 min-h-40 resize-y leading-7" maxLength={600} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Explain what happens and why. Use a specific example if it helps." />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[#A1A5B0]">{answer.length}/600 · Plain English is fine</span><button type="button" disabled={busy||answer.trim().length<3} onClick={()=>void respond()} className="orbit-primary-cta rounded-xl px-6 py-3 text-sm font-bold">{busy?'Challenging your answer…':'Submit reasoning →'}</button></div>
          </article>}
          {session.complete&&<article className="rounded-2xl border border-[#42796D] bg-[#172B2A] p-7"><span className="text-xs font-bold uppercase tracking-widest text-[#8EE1D1]">THREE ROUNDS COMPLETE</span><h3 className="mt-3 text-2xl font-semibold text-[#F4F4F6]">Your reasoning has been recorded.</h3><p className="mt-3 text-sm leading-7 text-[#B8BECA]">The record captures your explanations and the follow-up questions. These are provisional indicators, not proof of mastery.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/teacher" className="orbit-primary-cta rounded-xl px-5 py-3 text-sm font-bold">View educator evidence ↗</Link><button onClick={restart} className="rounded-xl border border-[#52877D] px-5 py-3 text-sm text-[#F4F4F6]">Try another concept</button></div></article>}
          {error&&<p role="alert" className="rounded-xl border border-[#AE637B] bg-[#432E39] p-4 text-sm text-[#FFDAE3]">{error}</p>}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-[#383D4E] bg-[#1A1D27] p-6"><span className="orbit-kicker">EVIDENCE SNAPSHOT</span><div className="mt-5 flex items-end justify-between gap-4"><div><strong className="text-4xl font-semibold text-[#F4F4F6]">{session.turn}<span className="text-xl text-[#A1A5B0]"> / {session.max_turns}</span></strong><p className="mt-1 text-xs text-[#B8BECA]">Responses recorded</p></div><div className="rounded-xl bg-[#302D45] px-3 py-2 font-mono text-xs text-[#C6BCFF]">{session.skill}</div></div><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#343846]"><div className="h-full rounded-full bg-[#8B7CF6] transition-all" style={{width:(session.turn/session.max_turns*100)+'%'}}/></div><div className="mt-5 border-t border-[#383D4E] pt-5"><p className="text-xs text-[#B8BECA]">Conceptual evidence</p><div className="mt-2 text-2xl font-semibold text-[#F4F4F6]">{session.score===null?'Under review':session.score+'%'} </div><p className="mt-2 text-xs leading-6 text-[#A1A5B0]">{session.complete?'A provisional, model-generated measure across three responses.':'Score appears once all three challenges are complete.'}</p></div></div>
        <div className="rounded-2xl border border-[#383D4E] bg-[#1A1D27] p-6"><p className="orbit-kicker">WHAT WE LOOK FOR</p><div className="mt-5 space-y-4">{[['01','Mechanism','Can you explain the actual rule?'],['02','Edge cases','Does your logic survive unusual inputs?'],['03','Transfer','Can you apply the idea elsewhere?']].map(([n,t,c])=><div key={n} className="flex gap-3"><span className="font-mono text-xs text-[#AFA3FF]">{n}</span><div><div className="text-sm font-semibold text-[#F4F4F6]">{t}</div><p className="mt-1 text-xs leading-6 text-[#A1A5B0]">{c}</p></div></div>)}</div></div>
        {latest&&<div className="rounded-2xl border border-[#425F60] bg-[#18262A] p-5 text-xs leading-6 text-[#A1D7D0]">Status: {latest.model_used==='claude_socratic'?'Claude generated a targeted follow-up.':'Approved offline question used.'} No answer is disclosed.</div>}
      </aside>
   </section>}
 </main>
}
