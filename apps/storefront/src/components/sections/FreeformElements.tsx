"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { isSafeContentUrl, storeHref, type Section } from "@repo/core";

type Element = Record<string, unknown>;
const n = (e: Element, key: string, fallback: number) => typeof e[key] === "number" ? e[key] as number : fallback;
const s = (e: Element, key: string, fallback = "") => typeof e[key] === "string" ? e[key] as string : fallback;

/** Percentage coordinates keep the same composition at every preview width. */
export default function FreeformElements({ section, storeSlug, preview }: { section: Section; storeSlug: string; preview?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ index: number; value: Element } | null>(null);
  const elements = Array.isArray(section.props.elements) ? section.props.elements as Element[] : [];
  const gesture = useRef<{ index: number; x: number; y: number; width: number; height: number; original: Element; next: Element; resize: boolean } | null>(null);
  function start(event: PointerEvent<HTMLDivElement>, index: number) {
    if (!preview || !ref.current) return;
    event.preventDefault(); event.stopPropagation();
    const rect = ref.current.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setActive(index);
    gesture.current = { index, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, original: elements[index], next: elements[index], resize: !!(event.target as HTMLElement).closest('[data-resize]') };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const dx = (event.clientX - g.x) / g.width * 100;
    const dy = (event.clientY - g.y) / g.height * 100;
    const clamp = (value: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, value)));
    g.next = g.resize ? { ...g.original, width: clamp(n(g.original, 'width', 30) + dx, 1, 100 - n(g.original, 'x', 5)), height: clamp(n(g.original, 'height', 15) + dy, 1, 100 - n(g.original, 'y', 5)) } : { ...g.original, x: clamp(n(g.original, 'x', 5) + dx, 0, 100 - n(g.original, 'width', 30)), y: clamp(n(g.original, 'y', 5) + dy, 0, 100 - n(g.original, 'height', 15)) };
    setDraft({ index: g.index, value: g.next });
  }
  function commit() {
    const g = gesture.current;
    if (!g) return;
    window.dispatchEvent(new CustomEvent('builder:element-change', { detail: { id: section.id, index: g.index, element: g.next } }));
    gesture.current = null;
    setDraft(null);
  }
  return <div ref={ref} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    {elements.map((original, index) => {
      const e = draft?.index === index ? draft.value : original;
      const fill = s(e, 'fill', '#ff6a30');
      const style: CSSProperties = { position: 'absolute', left: `${n(e,'x',5)}%`, top: `${n(e,'y',5)}%`, width: `${Math.min(n(e,'width',30),100-n(e,'x',5))}%`, height: `${Math.min(n(e,'height',15),100-n(e,'y',5))}%`, color: s(e,'color','#171717'), backgroundColor: `${fill}${Math.round(n(e,'fillOpacity',e.kind === 'text' ? 0 : 100)*2.55).toString(16).padStart(2,'0')}`, opacity:n(e,'opacity',100)/100, borderRadius:n(e,'radius',8), fontFamily:s(e,'font','inherit'), fontSize:`clamp(8px, ${n(e,'fontSize',24)/10}cqw, ${n(e,'fontSize',24)}px)`, fontWeight:s(e,'weight','400'), textAlign:s(e,'align','left') as CSSProperties['textAlign'], whiteSpace:'pre-wrap', overflowWrap:'anywhere', pointerEvents:'auto', touchAction:preview?'none':undefined, cursor:preview?'move':undefined, outline:preview && active===index?'2px solid #ff6a30':undefined, outlineOffset:-2 };
      const link = s(e,'link','/products');
      return <div key={index} style={style} onPointerDown={event=>start(event,index)} onPointerMove={move} onPointerUp={commit} onPointerCancel={()=>{gesture.current=null;setDraft(null);}} tabIndex={preview?0:undefined} aria-label={preview?`${s(e,'kind','text')} ${index+1}: drag to move, use controls for precise position`:undefined}>
        {e.kind==='image' && isSafeContentUrl(s(e,'image')) ? <img src={s(e,'image')} alt={s(e,'text')} draggable={false} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/> : e.kind==='button' ? <a href={isSafeContentUrl(link)?storeHref(storeSlug,link):'#'} style={{display:'flex',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',color:'inherit',textDecoration:'none'}}>{s(e,'text','Shop now')}</a> : <div style={{padding: e.kind==='panel'?12:4}}>{s(e,'text')}</div>}
        {preview && active===index && <span data-resize style={{position:'absolute',right:0,bottom:0,width:16,height:16,background:'#ff6a30',border:'2px solid white',cursor:'nwse-resize'}}/>}
      </div>;
    })}
  </div>;
}
