import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { BinaryRain } from './BinaryRain'
import type { TeacherSessionView } from '../types/contracts'

const skills = [
  { id:'loops',label:'Loops',x:16,y:52 },
  { id:'hashing',label:'Hashing',x:50,y:28 },
  { id:'complexity',label:'Complexity',x:84,y:52 },
]
export function SkillConstellation({sessionId,active}:{sessionId:string;active:string}) {
  const [mastery,setMastery] = useState<TeacherSessionView['mastery_by_skill']>({})
  const [selected,setSelected] = useState(active)
  useEffect(() => {
    let alive=true
    api.getTeacherSession(sessionId).then(x => {if(alive)setMastery(x.mastery_by_skill)}).catch(()=>{})
    return ()=>{alive=false}
  },[sessionId,active])
  const detail = mastery[selected]
  return <section aria-label="Your skill constellation" className="relative overflow-hidden rounded-2xl border border-[#303440] bg-[#1B1E27] px-5 py-5">
    <BinaryRain subtle/>
    <div className="relative z-10">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="c-eyebrow">LEARNING MAP</span><h2 className="mt-1 text-lg font-semibold text-[#F4F4F6]">Your skill constellation</h2></div><span className="text-xs text-[#A1A5B0]">Select a skill</span></div>
      <div className="relative mt-4 h-32" role="group" aria-label="Skills">
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M 16 52 L 50 28 L 84 52" fill="none" stroke="#45445F" strokeWidth=".8" strokeDasharray="3 2"/></svg>
        {skills.map(k => <button key={k.id} type="button" onClick={()=>setSelected(k.id)} aria-pressed={selected===k.id}
          style={{left:k.x+'%',top:k.y+'%',transform:'translate(-50%,-50%)'}}
          className={`absolute z-10 min-w-20 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${selected===k.id?'border-[#8B7CF6] bg-[#29253F] text-[#F4F4F6]':'border-[#303440] bg-[#171923] text-[#A1A5B0] hover:border-[#8B7CF6]'}`}>
          <span className={`mr-1.5 inline-block size-1.5 rounded-full ${(mastery[k.id]?.independent_transfer_total??0)>0?'bg-[#59C7B5]':'bg-[#8B7CF6]'}`}/>{k.label}
        </button>)}
      </div>
      <div className="rounded-xl border border-[#303440] bg-[#151820] px-4 py-3"><div className="text-sm font-semibold text-[#F4F4F6]">{skills.find(x=>x.id===selected)?.label}</div><div className="mt-1 text-xs leading-5 text-[#A1A5B0]">{detail?.independent_transfer_total ? detail.independent_transfer_correct+' of '+detail.independent_transfer_total+' independent transfers passed' : 'No independent transfer evidence yet. Complete questions to unlock progress.'}</div></div>
    </div>
  </section>
}
