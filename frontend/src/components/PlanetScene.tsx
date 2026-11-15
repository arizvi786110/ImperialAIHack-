import {useRef, type PointerEvent} from 'react'

/** CSS-animated illustration. No canvas/WebGL dependency, no network assets. */
const stars = Array.from({length:72},(_,i)=>({
 x:(i*59+17)%810+5, y:(i*83+29)%630+8, r:i%9===0?1.6:.7,
 opacity:.22+(i%5)*.09
}))
export function PlanetScene({compact=false}:{compact?:boolean}) {
 const root=useRef<HTMLDivElement>(null)
 const move=(e:PointerEvent<HTMLDivElement>)=>{
   const bounds=e.currentTarget.getBoundingClientRect()
   const x=(e.clientX-bounds.left)/Math.max(bounds.width,1)-.5
   const y=(e.clientY-bounds.top)/Math.max(bounds.height,1)-.5
   root.current?.style.setProperty('--orbit-x',String(x*16)+'px')
   root.current?.style.setProperty('--orbit-y',String(y*12)+'px')
 }
 const reset=()=>{root.current?.style.setProperty('--orbit-x','0px');root.current?.style.setProperty('--orbit-y','0px')}
 return <div ref={root} onPointerMove={move} onPointerLeave={reset} className={'orbit-scene '+(compact?'orbit-compact':'')} aria-hidden="true">
   <svg className="orbit-svg" viewBox="0 0 820 650" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
     <defs>
       <radialGradient id="planet-violet" cx=".23" cy=".18" r=".95"><stop stopColor="#D0CAFF"/><stop offset=".22" stopColor="#897DDA"/><stop offset=".6" stopColor="#4D468D"/><stop offset="1" stopColor="#22253F"/></radialGradient>
       <radialGradient id="planet-mint" cx=".24" cy=".2" r=".92"><stop stopColor="#D5FFE8"/><stop offset=".28" stopColor="#73C5AD"/><stop offset=".65" stopColor="#367E83"/><stop offset="1" stopColor="#172D44"/></radialGradient>
       <radialGradient id="planet-peach" cx=".19" cy=".19" r="1"><stop stopColor="#FFF1D1"/><stop offset=".3" stopColor="#DCA68E"/><stop offset=".8" stopColor="#8B667E"/><stop offset="1" stopColor="#3B324B"/></radialGradient>
       <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#D0C6FF" stopOpacity=".05"/><stop offset=".4" stopColor="#A5A3D9" stopOpacity=".6"/><stop offset=".8" stopColor="#85D3C3" stopOpacity=".25"/><stop offset="1" stopColor="#D0C6FF" stopOpacity=".05"/></linearGradient>
       <radialGradient id="space-glow"><stop stopColor="#7774C0" stopOpacity=".18"/><stop offset="1" stopColor="#7774C0" stopOpacity="0"/></radialGradient>
     </defs>
     <ellipse cx="445" cy="316" rx="325" ry="236" fill="url(#space-glow)"/>
     {stars.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i%13===0?'#88CBBF':'#BAC0D2'} opacity={s.opacity}/>)}
     <g className="orbit-parallax">
       <ellipse cx="440" cy="340" rx="280" ry="130" transform="rotate(-24 440 340)" stroke="#8B84BA" strokeOpacity=".18"/>
       <ellipse cx="440" cy="340" rx="346" ry="195" transform="rotate(26 440 340)" stroke="#8B84BA" strokeOpacity=".1"/>
       <g className="orbit-planet orbit-primary">
         <circle cx="440" cy="315" r="132" fill="url(#planet-violet)"/>
         <path d="M346 225c57 31 143 31 200-7M322 299c82 43 173 45 244-5M338 382c58-22 141-14 201 21" stroke="#CFC8FF" strokeOpacity=".1" strokeWidth="16" strokeLinecap="round"/>
         <ellipse cx="440" cy="316" rx="214" ry="52" transform="rotate(-23 440 316)" stroke="url(#ring)" strokeWidth="23"/>
         <ellipse cx="440" cy="316" rx="214" ry="52" transform="rotate(-23 440 316)" stroke="#CFC7FC" strokeOpacity=".4" strokeWidth="1"/>
       </g>
       <g className="orbit-planet orbit-secondary">
         <circle cx="665" cy="161" r="58" fill="url(#planet-mint)"/>
         <path d="M617 154c30 16 73 11 91-8M627 187c24-10 45-5 69 4" stroke="#E6FFFB" strokeOpacity=".16" strokeWidth="6"/>
       </g>
       <g className="orbit-planet orbit-tertiary">
         <circle cx="204" cy="453" r="76" fill="url(#planet-peach)"/>
         <ellipse cx="204" cy="454" rx="118" ry="29" transform="rotate(22 204 454)" stroke="#DFCEDE" strokeOpacity=".45" strokeWidth="10"/>
       </g>
       <g className="orbit-satellite">
         <circle cx="705" cy="493" r="13" fill="#9A8FDE"/>
         <circle cx="705" cy="493" r="20" stroke="#C8BFFB" strokeOpacity=".2"/>
       </g>
     </g>
   </svg>
 </div>
}
