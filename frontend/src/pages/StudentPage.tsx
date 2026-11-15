import {useCallback,useEffect,useId,useState} from 'react'
import {CodeEditor} from '../components/CodeEditor'
import {OutputPanel} from '../components/OutputPanel'
import {QuestionPanel} from '../components/QuestionPanel'
import {Tabs,type TabDef} from '../components/Tabs'
import {starterCode} from '../mocks/question'
import {functionNameFrom} from '../runner/stubRunner'
import {pyodideRunner} from '../runner/pyodideRunner'
import type {RunResult} from '../runner/types'
import type {PublicQuestion,SessionStartResponse,AttemptResponse,AssistResponse} from '../types/contracts'
import {startSession,restoreSession,submitAttempt,requestHelp,nextQuestion} from '../api/client'

const button='rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
const key='cognit-team-session'

export function StudentPage(){
 const explanationId=useId()
 const [session,setSession]=useState<string|null>(null)
 const [question,setQuestion]=useState<PublicQuestion|null>(null)
 const [,setState]=useState<SessionStartResponse['state']|null>(null)
 const [alias,setAlias]=useState('Demo Student')
 const [code,setCode]=useState('')
 const [explanation,setExplanation]=useState('')
 const [plan,setPlan]=useState('')
 const [result,setResult]=useState<RunResult|null>(null)
 const [lastRunCode,setLastRunCode]=useState('')
 const [attempt,setAttempt]=useState<string|null>(null)
 const [tab,setTab]=useState('code')
 const [mode,setMode]=useState<'lookup'|'hint'|'plan'>('lookup')
 const [query,setQuery]=useState('')
 const [help,setHelp]=useState<AssistResponse|null>(null)
 const [score,setScore]=useState<AttemptResponse|null>(null)
 const [running,setRunning]=useState(false)
 const [busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const [complete,setComplete]=useState(false)
 const [tried,setTried]=useState(false)
 const load=useCallback((data:SessionStartResponse)=>{
   setSession(data.session_id);setQuestion(data.question);setState(data.state)
   setCode(starterCode(data.question));setExplanation('');setPlan('');setResult(null)
   setLastRunCode('');setAttempt(null);setScore(null);setHelp(null);setTab('code');setTried(false);setComplete(false)
 },[])
 useEffect(()=>{const id=localStorage.getItem(key);if(id)restoreSession(id).then(data=>{load(data);}).catch(()=>localStorage.removeItem(key))},[load])
 async function start(){
   setBusy(true);setMessage('')
   try{const data=await startSession(alias.trim()||'Demo Student');localStorage.setItem(key,data.session_id);load(data)}
   catch(e){setMessage(String(e))}finally{setBusy(false)}
 }
 async function runCode():Promise<RunResult|null>{
   if(!question)return null
   setRunning(true);setMessage('')
   try{const run=await pyodideRunner.run(code,functionNameFrom(question.function_signature),question.example_tests);setResult(run);setLastRunCode(code);return run}
   catch(e){setMessage(String(e));return null}
   finally{setRunning(false)}
 }
 async function submit(){
   if(!session||!question||busy)return
   setBusy(true)
   try{
     let current=result
     if(!current||code!==lastRunCode){current=await pyodideRunner.run(code,functionNameFrom(question.function_signature),question.example_tests);setResult(current);setLastRunCode(code)}
     const data=await submitAttempt({session_id:session,question_id:question.id,code,explanation,plan,client_test_results:current.results,help_events:[]})
     setScore(data);setAttempt(data.attempt_id);setTried(true);setMessage('Attempt saved. Concept grading is provisional. You may ask for hints or continue.')
   }catch(e){setMessage(String(e))}finally{setBusy(false)}
 }
 async function ask(){
   if(!session||!question)return
   setBusy(true)
   try{const data=await requestHelp({session_id:session,question_id:question.id,mode,query,current_attempt_id:attempt??undefined});setHelp(data);setMessage('')}
   catch(e){setMessage(String(e))}finally{setBusy(false)}
 }
 async function advance(){
   if(!session||!attempt)return
   setBusy(true)
   try{
     const data=await nextQuestion(session,attempt)
     if(data.state.stage==='complete'){setComplete(true);setScore(null);setMessage('Assessment complete. Open the teacher dashboard to inspect your results.')}
     else{load({session_id:session,question:data.question,state:data.state});setMessage('Next question: '+data.reason)}
   }catch(e){setMessage(String(e))}finally{setBusy(false)}
 }
 const tabs:TabDef[]=[{id:'code',label:'Code'},{id:'reference',label:'Reference'},{id:'plan',label:'Plan Mode',disabled:!tried,disabledReason:'available after your first attempt'}]
 if(!session||!question)return <main className="mx-auto max-w-xl p-8"><h1 className="mb-4 text-2xl font-semibold">Start Cognit</h1><p className="mb-4 text-sm">University Python assessment demo. Browser execution is not exam-secure.</p><label className="block mb-2">Student alias</label><input className="mb-4 w-full rounded border p-2" value={alias} onChange={e=>setAlias(e.target.value)}/><button className={button} disabled={busy} onClick={start}>Start assessment</button>{message&&<p role="alert">{message}</p>}</main>
 if(complete)return <main className="mx-auto max-w-xl p-8"><h1 className="text-xl font-semibold">Assessment complete</h1><p>Open Teacher to review recorded evidence. This is a demonstration, not a secure exam.</p><button className={button} onClick={()=>{localStorage.removeItem(key);setSession(null);setQuestion(null)}}>New session</button></main>
 return <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
  <aside className="min-w-0 rounded-lg border bg-white p-5"><QuestionPanel question={question}/><p className="mt-4 text-xs text-slate-600">Difficulty {question.difficulty} · {question.skill_tags.join(', ')} · browser tests are untrusted evidence</p></aside>
  <main className="min-w-0 rounded-lg border bg-white p-5">
   <Tabs tabs={tabs} active={tab} onChange={setTab} label="Workspace">
    {tab==='code'&&<div className="flex flex-col gap-4">
      <div className="h-[45vh] min-h-[280px]"><CodeEditor value={code} onChange={v=>{setCode(v);setResult(null)}} onRun={()=>{void runCode()}}/></div>
      <label htmlFor={explanationId} className="text-sm font-semibold">Explain your reasoning (30 points)</label>
      <textarea id={explanationId} className="w-full rounded border p-3" rows={4} value={explanation} onChange={e=>setExplanation(e.target.value)} placeholder="Explain the rule, why it works, and one edge case."/>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={running||busy} onClick={()=>{void runCode()}}>{running?'Running...':'Run Python'}</button><button className={button} disabled={busy||running} onClick={()=>{void submit()}}>Submit attempt</button>{attempt&&<button className={button} disabled={busy} onClick={()=>{void advance()}}>Next question</button>}</div>
      <OutputPanel result={result} running={running}/>
      {score&&<section className="rounded border bg-indigo-50 p-3"><strong>{score.provisional_score}/100 provisional</strong><p>Code {score.code_score}/70 · Concept {score.concept_score}/30</p><p className="text-sm">{score.feedback}</p><p className="text-xs">{score.flags.join(', ')}</p></section>}
    </div>}
    {tab==='reference'&&<section className="space-y-3"><h2 className="font-semibold">Approved documentation and help</h2><p className="text-sm">You can search Python documentation. Direct solutions are refused.</p><HelpControls mode={mode} setMode={setMode} query={query} setQuery={setQuery} ask={ask} busy={busy} help={help}/></section>}
    {tab==='plan'&&<section className="space-y-3"><h2 className="font-semibold">Your plan</h2><textarea className="w-full rounded border p-3" rows={5} value={plan} onChange={e=>setPlan(e.target.value)} placeholder="Write your own reasoning outline here"/><p className="text-xs">Saved with your next submission.</p><HelpControls mode={mode} setMode={setMode} query={query} setQuery={setQuery} ask={ask} busy={busy} help={help}/></section>}
   </Tabs>
   {message&&<p role="status" className="mt-3 rounded bg-amber-50 p-3 text-sm">{message}</p>}
  </main>
 </div>
}
function HelpControls({mode,setMode,query,setQuery,ask,busy,help}:{mode:'lookup'|'hint'|'plan',setMode:(v:'lookup'|'hint'|'plan')=>void,query:string,setQuery:(v:string)=>void,ask:()=>void,busy:boolean,help:AssistResponse|null}){
 return <div className="space-y-3"><div className="flex gap-2">{(['lookup','hint','plan'] as const).map(m=><button key={m} className="rounded border px-3 py-1" aria-pressed={mode===m} onClick={()=>setMode(m)}>{m}</button>)}</div><textarea className="w-full rounded border p-2" rows={3} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask about a Python concept"/><button className={button} disabled={busy||!query.trim()} onClick={ask}>Ask</button>{help&&<div className="rounded bg-slate-50 p-3"><p>{help.decision}: {help.content}</p>{help.citations?.length>0&&<ul className="mt-2 list-inside list-disc text-sm">{help.citations.map((c,i)=><li key={i}>{typeof c==='string'?c:JSON.stringify(c)}</li>)}</ul>}</div>}</div>
}
