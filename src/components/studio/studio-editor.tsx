"use client";
import { useRef, useState } from "react";

type TextLayer = { text: string; x: number; y: number; size: number; color: string; rotation?: number; opacity?: number; font?: string };
const presets = [
  { name: "Guggenball", bg: "#1c163b", accent: "#f8c35d", title: "GUGGENBALL" },
  { name: "Save the Date", bg: "#123d42", accent: "#8de8cf", title: "SAVE THE DATE" },
  { name: "Mitglieder", bg: "#49233b", accent: "#ffbfd6", title: "MACH MIT!" },
];
export function StudioEditor({ organizationId, organizationName }: { organizationId: string; organizationName: string }) {
  const [preset, setPreset] = useState(presets[0]);
  const [format, setFormat] = useState<"post" | "story" | "square">("post");
  const [layers, setLayers] = useState<TextLayer[]>([
    { text: organizationName.toUpperCase(), x: 540, y: 230, size: 45, color: "#ffffff" },
    { text: "GUGGENBALL", x: 540, y: 620, size: 110, color: "#f8c35d" },
    { text: "2027", x: 540, y: 750, size: 100, color: "#ffffff" },
    { text: "DATUM · UHRZEIT · ORT", x: 540, y: 1040, size: 38, color: "#ffffff" },
  ]);
  const [selected, setSelected] = useState(1);
  const [history, setHistory] = useState<TextLayer[][]>([]);
  const [future, setFuture] = useState<TextLayer[][]>([]);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageOpacity, setImageOpacity] = useState(0.6);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ index: number; offsetX: number; offsetY: number } | null>(null);
  const [status, setStatus] = useState("");
  const dimensions = { post: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };
  const [width, height] = dimensions[format];
  const checkpoint = () => { setHistory(old => [...old.slice(-39), layers.map(l => ({...l}))]); setFuture([]); };
  const patch = (data: Partial<TextLayer>) => setLayers(old => old.map((layer, index) => index === selected ? { ...layer, ...data } : layer));
  const undo = () => { if (!history.length) return; setFuture(old => [...old, layers]); setLayers(history[history.length-1]); setHistory(old => old.slice(0,-1)); };
  const redo = () => { if (!future.length) return; setHistory(old => [...old, layers]); setLayers(future[future.length-1]); setFuture(old => old.slice(0,-1)); };
  const addText = () => { checkpoint(); setLayers(old => [...old,{text:"NEUER TEXT",x:width/2,y:height/2,size:64,color:"#ffffff"}]); setSelected(layers.length); };
  const removeText = () => { if (!layers[selected]) return; checkpoint(); setLayers(old => old.filter((_,i)=>i!==selected)); setSelected(Math.max(0,selected-1)); };
  const duplicateText = () => { if (!layers[selected]) return; checkpoint(); setLayers(old=>[...old,{...old[selected],x:old[selected].x+30,y:old[selected].y+40}]); setSelected(layers.length); };
  const moveLayer = (delta:number) => { const next=selected+delta; if(next<0||next>=layers.length)return; checkpoint(); setLayers(old=>{const copy=[...old];[copy[selected],copy[next]]=[copy[next],copy[selected]];return copy;});setSelected(next); };
  const pointerPosition = (event:React.PointerEvent<SVGSVGElement>) => {const point=svgRef.current?.createSVGPoint();if(!point||!svgRef.current)return null;point.x=event.clientX;point.y=event.clientY;const matrix=svgRef.current.getScreenCTM();return matrix?point.matrixTransform(matrix.inverse()):null;};
  const onPointerMove = (event:React.PointerEvent<SVGSVGElement>) => {if(!dragRef.current)return;const p=pointerPosition(event);if(!p)return;const {index,offsetX,offsetY}=dragRef.current;setLayers(old=>old.map((l,i)=>i===index?{...l,x:Math.round(Math.max(0,Math.min(width,p.x-offsetX))),y:Math.round(Math.max(0,Math.min(height,p.y-offsetY)))}:l));};
  const uploadImage = (file?:File) => {if(!file)return;if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>5*1024*1024){setStatus("Bitte ein Bild bis 5 MB wählen.");return;}const reader=new FileReader();reader.onload=()=>{setImageData(String(reader.result));setStatus("Bild eingefügt.");};reader.readAsDataURL(file);};
  const save = () => {
    try {
      localStorage.setItem("fas-nav-studio:" + organizationId, JSON.stringify({ preset, format, layers, imageData, imageOpacity }));
      setStatus("Entwurf in diesem Browser gespeichert.");
    } catch { setStatus("Speichern fehlgeschlagen."); }
  };
  const load = () => {
    try {
      const data = JSON.parse(localStorage.getItem("fas-nav-studio:" + organizationId) || "null");
      if (!data || !Array.isArray(data.layers)) return setStatus("Kein gespeicherter Entwurf vorhanden.");
      setPreset(presets.some(p=>p.name===data.preset?.name) ? data.preset : presets[0]); setFormat(["post","story","square"].includes(data.format) ? data.format : "post"); setLayers(data.layers); setImageData(data.imageData || null); setImageOpacity(data.imageOpacity ?? 0.6);
      setStatus("Entwurf geladen.");
    } catch { setStatus("Entwurf konnte nicht geladen werden."); }
  };
  const exportPng = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(result => {
        if (!result) return setStatus("Export fehlgeschlagen.");
        const link = document.createElement("a");
        const objectUrl = URL.createObjectURL(result);
        link.href = objectUrl; link.download = "fas-nav-design.png"; link.click();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); setStatus("Export fehlgeschlagen."); };
    img.src = url;
  };
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-bold">FAS-NAV Studio</h1><p className="text-sm text-muted-foreground">Designstudio für {organizationName} · erste Version</p></div>
    <div className="flex flex-wrap gap-2">
      <button className="rounded-lg border px-4 py-2" onClick={save}>Speichern</button>
      <button className="rounded-lg border px-4 py-2" disabled={!history.length} onClick={undo}>Rückgängig</button>
      <button className="rounded-lg border px-4 py-2" disabled={!future.length} onClick={redo}>Wiederholen</button>
      <button className="rounded-lg border px-4 py-2" onClick={addText}>+ Text</button>
      <button className="rounded-lg border px-4 py-2" onClick={load}>Laden</button>
      <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={exportPng}>PNG exportieren</button>
      <span role="status" className="text-sm text-muted-foreground">{status}</span>
    </div>
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
      <aside className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Vorlagen</h2>
        {presets.map(item => <button key={item.name} className="block w-full rounded-lg border p-3 text-left text-sm" onClick={() => { setPreset(item); setLayers(old => old.map((l,i) => i===1 ? {...l,text:item.title,color:item.accent} : l)); }}><span className="mb-2 block h-8 rounded" style={{background:item.bg,borderBottom:"4px solid "+item.accent}}/>{item.name}</button>)}
        <label className="block text-sm">Format<select className="mt-1 w-full rounded border bg-background p-2" value={format} onChange={e => setFormat(e.target.value as typeof format)}><option value="post">Instagram 4:5</option><option value="square">Quadrat 1:1</option><option value="story">Story 9:16</option></select></label>
        <label className="block text-sm">Eigenes Bild / Logo<input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={e=>uploadImage(e.target.files?.[0])}/></label>
        {imageData && <><label className="block text-sm">Bilddeckkraft<input type="range" min="0" max="1" step="0.05" value={imageOpacity} onChange={e=>setImageOpacity(Number(e.target.value))} className="w-full"/></label><button className="rounded border px-3 py-2 text-sm" onClick={()=>setImageData(null)}>Bild entfernen</button></>}
        <label className="block text-sm">Hintergrundfarbe<input type="color" className="mt-1 block w-full" value={preset.bg} onChange={e=>setPreset(old=>({...old,bg:e.target.value}))}/></label>
      </aside>
      <div className="flex justify-center overflow-hidden rounded-xl border bg-muted/30 p-4">
        <svg ref={svgRef} onPointerMove={onPointerMove} onPointerUp={()=>dragRef.current=null} onPointerCancel={()=>dragRef.current=null} id="studio-artwork" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{width:"min(100%, 480px)",height:"auto"}} className="shadow-lg">
          <rect width={width} height={height} fill={preset.bg}/>
          {imageData && <image href={imageData} width={width} height={height} preserveAspectRatio="xMidYMid slice" opacity={imageOpacity}/>}
          <circle cx="540" cy={height/2} r="300" stroke={preset.accent} strokeWidth="10" fill="none" opacity=".4"/>
          {layers.map((layer,i) => <text key={i} x={layer.x} y={layer.y} textAnchor="middle" fontFamily={layer.font || "Arial, sans-serif"} fontWeight="700" fontSize={layer.size} fill={layer.color} opacity={layer.opacity ?? 1} transform={`rotate(${layer.rotation || 0} ${layer.x} ${layer.y})`} stroke={selected===i ? "#ffffff" : "none"} strokeWidth={selected===i ? 1 : 0} paintOrder="stroke" onPointerDown={event=>{const p=pointerPosition(event);if(!p)return;checkpoint();setSelected(i);dragRef.current={index:i,offsetX:p.x-layer.x,offsetY:p.y-layer.y};event.currentTarget.setPointerCapture(event.pointerId);}} style={{cursor:"grab",touchAction:"none"}}>{layer.text}</text>)}
        </svg>
      </div>
      <aside className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Ebenen bearbeiten</h2><p className="text-xs text-muted-foreground">Text auf der Grafik direkt ziehen.</p>
        <div className="space-y-1">{layers.map((layer,i) => <button key={i} className={`block w-full truncate rounded border px-2 py-2 text-left text-xs ${selected===i?"border-primary":""}`} onClick={() => setSelected(i)}>{layer.text}</button>)}</div>
        <div className="flex flex-wrap gap-1"><button className="rounded border px-2 py-1 text-xs" onClick={duplicateText}>Duplizieren</button><button className="rounded border px-2 py-1 text-xs" onClick={removeText}>Löschen</button><button className="rounded border px-2 py-1 text-xs" onClick={()=>moveLayer(-1)}>Zurück</button><button className="rounded border px-2 py-1 text-xs" onClick={()=>moveLayer(1)}>Vor</button></div>
        {layers[selected] && <div className="space-y-3">
          <label className="block text-sm">Text<input className="mt-1 w-full rounded border bg-background p-2" maxLength={100} value={layers[selected].text} onChange={e => patch({text:e.target.value})}/></label>
          <label className="block text-sm">Schriftgrösse<input type="range" min="20" max="150" className="w-full" value={layers[selected].size} onChange={e => patch({size:Number(e.target.value)})}/></label>
          <label className="block text-sm">Farbe<input type="color" className="block w-full" value={layers[selected].color} onChange={e => patch({color:e.target.value})}/></label>
          <label className="block text-sm">Schriftart<select className="mt-1 w-full rounded border bg-background p-2" value={layers[selected].font || "Arial, sans-serif"} onChange={e=>{checkpoint();patch({font:e.target.value});}}><option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="Impact, sans-serif">Impact</option><option value="Courier New, monospace">Courier</option></select></label>
          <label className="block text-sm">Drehung<input type="range" min="-180" max="180" className="w-full" value={layers[selected].rotation || 0} onChange={e=>patch({rotation:Number(e.target.value)})}/></label>
          <label className="block text-sm">Deckkraft<input type="range" min="0" max="1" step="0.05" className="w-full" value={layers[selected].opacity ?? 1} onChange={e=>patch({opacity:Number(e.target.value)})}/></label>
          <label className="block text-sm">Horizontal<input type="range" min="0" max={width} className="w-full" value={layers[selected].x} onChange={e => patch({x:Number(e.target.value)})}/></label>
          <label className="block text-sm">Vertikal<input type="range" min="0" max={height} className="w-full" value={layers[selected].y} onChange={e => patch({y:Number(e.target.value)})}/></label>
        </div>}
      </aside>
    </div>
    <p className="text-xs text-muted-foreground">Entwürfe werden vorerst nur lokal im aktuellen Browser gespeichert. Es erfolgt noch keine Speicherung auf dem Server.</p>
  </div>;
}
