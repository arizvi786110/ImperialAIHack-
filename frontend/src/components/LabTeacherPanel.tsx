import {useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {api,errorMessage} from '../api/client'
import type {LabSession,LabSessionSummary} from '../types/contracts'

export function LabTeacherPanel(){
 const [sessions,setSessions]=useState<LabSessionSummary[]>([])
 const [chosen,setChosen]=useState<LabSession|null>(null)
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [search,setSearch]=useState('')
 const reload=()=>{setLoading(true);api.labSessions().then(x=>{setSessions(x.sessions);setError('')}).catch(e=>setError(errorMessage(e))).finally(()=>setLoading(false))}
 useEffect(()=>{reload()},[])
 const open=(id:string)=>api.labSession(id).then(setChosen).catch(e=>setError(errorMessage(e)))
 const filtered=sessions.filter(s=>s.student_alias.toLowerCase().includes(search.toLowerCase())||s.skill.includes(search.toLowerCase()))
 return <section className="rounded-2xl border border-[#45465B] bg-[#1A1D27] p-5 sm:p-7" aria-label="Socratic interview evidence">
   <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="orbit-kicker">SOCRATIC INTERVIEW RECORDS</span><h2 className="mt-2 text-xl font-semibold text-[#F4F4F6]">Reasoning evidence</h2><p className="mt-2 text-sm leading-6 text-[#B8BECA]">See which questions Cognit asked, what students explained, and where review is needed.</p></div><Link to="/challenge" className="rounded-xl border border-[#504D6E] px-4 py-2.5 text-xs font-semibold text-[#C8C0FF]">Try live challenge ↗</Link></div>
   <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(210px,.9fr)_minmax(0,1.5fr)]">
     <div><label htmlFor="lab-search" className="sr-only">Search student interviews</label><input id="lab-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a student or skill" className="orbit-input mb-3"/>
       <div className="max-h-[320px] space-y-2 overflow-y-auto">{filtered.map(x=><button key={x.session_id} onClick={()=>void open(x.session_id)} className="w-full rounded-xl border border-[#383D4E] bg-[#161923] px-4 py-3 text-left transition-colors hover:border-[#8B7CF6]"><span className="block text-sm font-semibold text-[#F4F4F6]">{x.student_alias}</span><span className="mt-1 block text-xs text-[#A1A5B0]">{x.skill} · {x.turn}/3 responses {x.complete?'· completed':''}</span></button>)}
         {loading?<div className="orbit-skeleton h-24 rounded-xl"/>:!filtered.length?<p className="rounded-xl border border-[#383D4E] p-4 text-xs leading-6 text-[#B8BECA]">No matching interviews. Start a sample challenge using fictional student details.</p>:null}
       </div>
     </div>
     <div className="min-w-0 rounded-xl border border-[#383D4E] bg-[#151821] p-5">
       {!chosen?<div className="flex min-h-44 flex-col justify-center"><span className="text-2xl text-[#B4A7FF]">◈</span><h3 className="mt-3 text-lg font-semibold text-[#F4F4F6]">Choose an interview</h3><p className="mt-2 text-sm leading-6 text-[#A1A5B0]">Select a student label to inspect each challenge and answer.</p></div>:<>
         <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold text-[#F4F4F6]">{chosen.student_alias} · {chosen.title}</h3><span className="rounded-lg bg-[#27233F] px-3 py-1 font-mono text-xs text-[#C5BCFF]">{chosen.score===null?'Needs review':chosen.score+'% provisional'}</span></div>
         <div className="mt-4 space-y-3">{chosen.history.map((x,i)=><div key={i} className="rounded-xl border border-[#41485B] p-4">
           <div className="text-[11px] font-bold uppercase tracking-widest text-[#BDB3FF]">Question {i+1} · {x.focus.replace('_',' ')}</div><p className="mt-2 text-sm leading-6 text-[#F4F4F6]">{x.question}</p>
           <div className="mt-3 text-[11px] font-bold uppercase tracking-widest text-[#59C7B5]">Student reasoning</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#D1D8E1]">{x.answer}</p>
           <p className="mt-2 text-xs leading-6 text-[#B8BECA]">{x.feedback}</p>
         </div>)}</div>
         {chosen.review_required&&<p className="mt-4 text-xs text-[#FFDBA6]">Some evidence is ungraded or low-confidence and should be reviewed by a teacher.</p>}
       </>}
     </div>
   </div>
   {error&&<p role="alert" className="mt-4 text-sm text-[#FFCED9]">{error}</p>}
 </section>
}
