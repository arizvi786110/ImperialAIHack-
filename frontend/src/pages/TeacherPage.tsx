import {useEffect,useState} from 'react'
import {getTeacher,reviewAttempt} from '../api/client'

type Row = {attempt_id:string,title:string,difficulty:number,skill_tags:string[],assisted:boolean,
  explanation:string,effective_score:number,evaluation?:{code_score:number,concept_score:number,rationale:string,flags:string[],review_required:boolean}|null,
  reviews:Array<{reviewer_note:string,effective_score:number}>,review_status:string}
type Dashboard = {attempts:Row[],score_breakdown:{overall_percent:number|null,note:string},
  mastery_by_skill:Record<string,{independent_transfer_correct:number,independent_transfer_total:number,heuristic_mastery:number|null}>,
  assisted_vs_independent:{assisted:{count:number,mean_score:number|null},independent:{count:number,mean_score:number|null}},
  help_log:Array<{mode:string,decision:string,query:string}>,review_flags:unknown[]}
const button='rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50'
export function TeacherPage(){
 const [id,setId]=useState(()=>localStorage.getItem('cognit-team-session')??'')
 const [data,setData]=useState<Dashboard|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [notes,setNotes]=useState<Record<string,string>>({})
 const [scores,setScores]=useState<Record<string,string>>({})
 async function refresh(){
  if(!id.trim())return
  setBusy(true);setError('')
  try{const response=await getTeacher(id.trim());setData(response as Dashboard)}
  catch(e){setError(String(e))}finally{setBusy(false)}
 }
 useEffect(()=>{if(id)void refresh()},[])
 async function save(attemptId:string){
  const score=Number(scores[attemptId])
  const note=(notes[attemptId]??'').trim()
  if(!note||scores[attemptId]===undefined||!Number.isFinite(score)||score<0||score>30){setError('Enter a concept score between 0 and 30 and a reviewer note.');return}
  setBusy(true);setError('')
  try{await reviewAttempt(attemptId,score,note);await refresh()}
  catch(e){setError(String(e))}finally{setBusy(false)}
 }
 return <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
  <header><h1 className="text-2xl font-semibold">Teacher evidence dashboard</h1><p className="text-sm text-amber-800">Prototype only. No authentication. Use synthetic student data. Browser test evidence is untrusted.</p></header>
  <div className="flex gap-2"><input aria-label="Session ID" className="min-w-0 flex-1 rounded border p-2" value={id} onChange={e=>setId(e.target.value)} placeholder="Session ID"/><button className={button} disabled={busy} onClick={()=>void refresh()}>Refresh</button></div>
  {error&&<p role="alert" className="rounded bg-rose-50 p-2 text-rose-700">{error}</p>}
  {!data?<p className="text-slate-500">Start an assessment to view real saved attempts.</p>:<>
   <section className="grid gap-3 md:grid-cols-3">
    <div className="rounded border bg-white p-4"><p>Weighted score</p><strong className="text-2xl">{data.score_breakdown.overall_percent??0}%</strong></div>
    <div className="rounded border bg-white p-4"><p>Assisted attempts</p><strong className="text-2xl">{data.assisted_vs_independent.assisted.count}</strong></div>
    <div className="rounded border bg-white p-4"><p>Independent attempts</p><strong className="text-2xl">{data.assisted_vs_independent.independent.count}</strong></div>
   </section>
   <section className="rounded border bg-white p-4"><h2 className="mb-2 font-semibold">Mastery indicators (heuristic only)</h2>{Object.entries(data.mastery_by_skill).length===0?<p>No progress yet.</p>:Object.entries(data.mastery_by_skill).map(([skill,m])=><p key={skill}>{skill}: {m.independent_transfer_correct}/{m.independent_transfer_total} independent transfers correct · indicator {m.heuristic_mastery??'insufficient evidence'}</p>)}</section>
   <section className="space-y-3"><h2 className="font-semibold">Actual saved attempts</h2>{data.attempts.map(a=><article key={a.attempt_id} className="rounded border bg-white p-4">
    <div className="flex justify-between gap-3"><strong>{a.title} · Level {a.difficulty}</strong><strong>{a.effective_score}/100</strong></div>
    <p className="text-sm">{a.assisted?'Assisted':'Independent'} · {a.skill_tags.join(', ')} · {a.review_status}</p>
    <p className="mt-1 text-sm">Code {a.evaluation?.code_score??0}/70 · Explanation {a.evaluation?.concept_score??0}/30</p>
    <details className="mt-2"><summary className="cursor-pointer text-sm">Student explanation and AI rationale</summary><p className="my-2 whitespace-pre-wrap text-sm">{a.explanation||'(empty)'}</p><p className="text-sm">{a.evaluation?.rationale}</p><p className="text-xs">{a.evaluation?.flags?.join(', ')}</p></details>
    <div className="mt-3 flex flex-wrap gap-2"><input className="w-28 rounded border p-2" type="number" min="0" max="30" aria-label="New concept score" value={scores[a.attempt_id]??''} onChange={e=>setScores(p=>({...p,[a.attempt_id]:e.target.value}))} placeholder="0 to 30"/><input className="min-w-40 flex-1 rounded border p-2" aria-label="Review note" value={notes[a.attempt_id]??''} onChange={e=>setNotes(p=>({...p,[a.attempt_id]:e.target.value}))} placeholder="Reason for override"/><button className={button} disabled={busy} onClick={()=>void save(a.attempt_id)}>Save review</button></div>
    {a.reviews?.map((review,i)=><p key={i} className="mt-1 text-xs">Review: {review.reviewer_note} · {review.effective_score}/100</p>)}
   </article>)}</section>
   <section className="rounded border bg-white p-4"><h2 className="font-semibold">Recorded help requests</h2>{data.help_log.map((x,i)=><p key={i} className="text-sm">{x.mode}: {x.decision} · {x.query}</p>)}</section>
  </>}
 </main>
}
