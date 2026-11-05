"use client";

import { useState } from "react";
import { CaretLeft, CaretRight, Package } from "@phosphor-icons/react/dist/ssr";
import type { Product } from "@/lib/types";

/** A keyboard-accessible gallery shared by every product page. */
export default function ProductGallery({ images, name, contain = false }: { images: Product["images"]; name: string; contain?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const index = Math.min(selected, Math.max(0, images.length - 1));
  const current = images[index];
  const move = (step: number) => setSelected((index + step + images.length) % images.length);
  return <section aria-label={`${name} photos`} onKeyDown={event => {
    if (images.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);
  }}>
    <div className="relative aspect-product overflow-hidden rounded-media bg-store-surface">
      {current && !failed.includes(current.url) ? <img key={current.url} src={current.url} alt={current.alt || name} fetchPriority="high" onError={() => setFailed(previous => [...previous, current.url])} className={`h-full w-full ${contain ? "object-contain p-6" : "object-cover"}`} /> : <div className="flex h-full flex-col items-center justify-center gap-3 text-store-muted"><Package size={40} weight="light" /><p className="text-sm">Photo unavailable</p></div>}
      {images.length > 1 && <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} aria-label="Previous photo" className="rounded-control bg-store-bg p-3 text-store-fg shadow-sm"><CaretLeft size={20} /></button>
        <span className="rounded-control bg-store-bg px-3 py-2 text-xs tabular-nums text-store-fg" role="status">{index + 1} / {images.length}</span>
        <button type="button" onClick={() => move(1)} aria-label="Next photo" className="rounded-control bg-store-bg p-3 text-store-fg shadow-sm"><CaretRight size={20} /></button>
      </div>}
    </div>
    {images.length > 1 && <div className="mt-4 flex gap-3 overflow-x-auto pb-2" aria-label="Choose a photo">
      {images.map((image, number) => <button key={`${image.url}-${number}`} type="button" onClick={() => setSelected(number)} aria-label={`View photo ${number + 1}`} aria-pressed={index === number} className={`h-20 w-16 shrink-0 overflow-hidden rounded-control border-2 p-1 sm:h-24 sm:w-20 ${index === number ? "border-store-fg" : "border-transparent hover:border-store-line"}`}>
        <img src={image.url} alt="" loading="lazy" className="h-full w-full rounded-control object-cover" />
      </button>)}
    </div>}
  </section>;
}
