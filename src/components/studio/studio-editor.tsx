"use client";
import { useState } from "react";

type TextLayer = { text: string; x: number; y: number; size: number; color: string };
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
  const [status, setStatus] = useState("");
  const dimensions = { post: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };
  const [width, height] = dimensions[format];
  const patch = (data: Partial<TextLayer>) => setLayers(old => old.map((layer, index) => index === selected ? { ...layer, ...data } : layer));
  const save = () => {
    try {
      localStorage.setItem("fas-nav-studio:" + organizationId, JSON.stringify({ preset, format, layers }));
      setStatus("Entwurf in diesem Browser gespeichert.");
    } catch { setStatus("Speichern fehlgeschlagen."); }
  };
  const load = () => {
    try {
      const data = JSON.parse(localStorage.getItem("fas-nav-studio:" + organizationId) || "null");
      if (!data || !Array.isArray(data.layers)) return setStatus("Kein gespeicherter Entwurf vorhanden.");
      setPreset(data.preset); setFormat(data.format); setLayers(data.layers);
      setStatus("Entwurf geladen.");
    } catch { setStatus("Entwurf konnte nicht geladen werden."); }
  };
  const exportPng = async () => {
    const svg = document.getElementById("studio-artwork");
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
      <button className="rounded-lg border px-4 py-2" onClick={load}>Laden</button>
      <button className="rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={exportPng}>PNG exportieren</button>
      <span role="status" className="text-sm text-muted-foreground">{status}</span>
    </div>
    <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
      <aside className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Vorlagen</h2>
        {presets.map(item => <button key={item.name} className="block w-full rounded-lg border p-3 text-left text-sm" onClick={() => { setPreset(item); setLayers(old => old.map((l,i) => i===1 ? {...l,text:item.title,color:item.accent} : l)); }}><span className="mb-2 block h-8 rounded" style={{background:item.bg,borderBottom:"4px solid "+item.accent}}/>{item.name}</button>)}
        <label className="block text-sm">Format<select className="mt-1 w-full rounded border bg-background p-2" value={format} onChange={e => setFormat(e.target.value as typeof format)}><option value="post">Instagram 4:5</option><option value="square">Quadrat 1:1</option><option value="story">Story 9:16</option></select></label>
      </aside>
      <div className="flex justify-center overflow-hidden rounded-xl border bg-muted/30 p-4">
        <svg id="studio-artwork" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{width:"min(100%, 480px)",height:"auto"}} className="shadow-lg">
          <rect width={width} height={height} fill={preset.bg}/>
          <circle cx="540" cy={height/2} r="300" stroke={preset.accent} strokeWidth="10" fill="none" opacity=".4"/>
          {layers.map((layer,i) => <text key={i} x={layer.x} y={layer.y} textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize={layer.size} fill={layer.color} onClick={() => setSelected(i)} style={{cursor:"pointer"}}>{layer.text}</text>)}
        </svg>
      </div>
      <aside className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Texte bearbeiten</h2>
        <div className="space-y-1">{layers.map((layer,i) => <button key={i} className={`block w-full truncate rounded border px-2 py-2 text-left text-xs ${selected===i?"border-primary":""}`} onClick={() => setSelected(i)}>{layer.text}</button>)}</div>
        {layers[selected] && <div className="space-y-3">
          <label className="block text-sm">Text<input className="mt-1 w-full rounded border bg-background p-2" maxLength={100} value={layers[selected].text} onChange={e => patch({text:e.target.value})}/></label>
          <label className="block text-sm">Schriftgrösse<input type="range" min="20" max="150" className="w-full" value={layers[selected].size} onChange={e => patch({size:Number(e.target.value)})}/></label>
          <label className="block text-sm">Farbe<input type="color" className="block w-full" value={layers[selected].color} onChange={e => patch({color:e.target.value})}/></label>
          <label className="block text-sm">Horizontal<input type="range" min="0" max={width} className="w-full" value={layers[selected].x} onChange={e => patch({x:Number(e.target.value)})}/></label>
          <label className="block text-sm">Vertikal<input type="range" min="0" max={height} className="w-full" value={layers[selected].y} onChange={e => patch({y:Number(e.target.value)})}/></label>
        </div>}
      </aside>
    </div>
    <p className="text-xs text-muted-foreground">Entwürfe werden vorerst nur lokal im aktuellen Browser gespeichert. Es erfolgt noch keine Speicherung auf dem Server.</p>
  </div>;
}
