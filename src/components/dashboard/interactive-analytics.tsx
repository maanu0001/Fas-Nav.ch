"use client";
import * as React from "react";
import { Card } from "@/components/ui/card";
export function InteractiveTrend({title,labels,values,color,mode="line"}:{title:string;labels:string[];values:number[];color:string;mode?:"line"|"bar"}){
 const [hover,setHover]=React.useState<number|null>(null);
 const max=Math.max(1,...values), width=660,height=190,pad=24;
 const points=values.map((v,i)=>({x:pad+i*(width-pad*2)/Math.max(1,values.length-1),y:height-pad-v/max*(height-pad*2),v}));
 const active=hover===null?null:points[hover];
 return <Card className="min-w-0 p-5">
  <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-display text-lg font-semibold">{title}</h2><span className="text-xs text-muted-foreground">Gesamt {values.reduce((a,b)=>a+b,0).toLocaleString("de-CH")}</span></div>
  <div className="relative mt-5">
   {active?<div role="status" className="pointer-events-none absolute right-2 top-0 z-10 rounded-lg border bg-card px-3 py-2 text-xs shadow-lg"><strong>{labels[hover!]}</strong><p className="mt-1 font-bold" style={{color}}>{active.v.toLocaleString("de-CH")}</p></div>:null}
   <svg className="w-full touch-pan-y" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
     {[0,.25,.5,.75,1].map((tick)=><g key={tick}><line x1={pad} x2={width-pad} y1={height-pad-tick*(height-pad*2)} y2={height-pad-tick*(height-pad*2)} stroke="currentColor" strokeOpacity=".12" strokeDasharray="4 6"/><text x="1" y={height-pad-tick*(height-pad*2)+4} fontSize="10" fill="currentColor" opacity=".6">{Math.round(max*tick)}</text></g>)}
     {mode==="line"?<polyline points={points.map(p=>`${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round"/>:null}
     {points.map((p,i)=><g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)} tabIndex={0} role="img" aria-label={`${labels[i]}: ${p.v}`}>
      {mode==="bar"?<rect x={p.x-Math.max(2,Math.min(14,(width-pad*2)/Math.max(1,points.length)*.35))} y={p.y} width={Math.max(4,Math.min(28,(width-pad*2)/Math.max(1,points.length)*.7))} height={height-pad-p.y} rx="2" fill={color} opacity={hover===null||hover===i?1:.35}/>:<><circle cx={p.x} cy={p.y} r={hover===i?6:points.length>120?1:3} fill={color}/>{hover===i?<line x1={p.x} x2={p.x} y1={pad} y2={height-pad} stroke={color} strokeDasharray="4 4" opacity=".5"/>:null}</>}
      <rect x={p.x-(width-pad*2)/Math.max(1,points.length-1)/2} y={pad} width={Math.max(6,(width-pad*2)/Math.max(1,points.length-1))} height={height-pad*2} fill="transparent" pointerEvents="all"/>
      <title>{labels[i]}: {p.v.toLocaleString("de-CH")}</title>
     </g>)}
   </svg>
   <div className="mt-2 flex justify-between gap-2 text-xs text-muted-foreground"><span>{labels[0]||"–"}</span><span>{labels[Math.floor(labels.length/2)]||""}</span><span>{labels.at(-1)||"–"}</span></div>
  </div>
  <p className="mt-3 text-[11px] text-muted-foreground">Punkte oder Balken berühren, mit der Maus bewegen oder per Tab auswählen, um Einzelwerte anzuzeigen.</p>
 </Card>;
}
