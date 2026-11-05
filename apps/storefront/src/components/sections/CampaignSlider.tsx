"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { storeHref, sectionButtons, type SectionButton } from "@repo/core";

export interface CampaignSlide {
  heading: string;
  eyebrow: string;
  body: string;
  image: string;
  imageAlt: string;
  imageFocus: string;
  ctaLabel: string;
  ctaLink: string;
  buttons?: SectionButton[];
}

/** Manual navigation keeps campaigns readable and respects reduced-motion preferences. */
export default function CampaignSlider({ slides, storeSlug, label, full, layout = "split" }: {
  slides: CampaignSlide[]; storeSlug: string; label: string; full: boolean; layout?: string;
}) {
  const [active, setActive] = useState(0);
  if (!slides.length) return null;
  const index = Math.min(active, slides.length - 1);
  const slide = slides[index];
  const go = (direction: number) => setActive((current) => (current + direction + slides.length) % slides.length);
  return (
    <section role="region" aria-roledescription="carousel" aria-label={label} className={`campaign-slider relative ${layout === "banner" ? "campaign-banner hero-photo" : ""} ${full ? "campaign-full" : ""}`}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("input, textarea, select")) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); go(event.key === "ArrowLeft" ? -1 : 1); }
      }}>
      <div role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`} className="campaign-layout">
        <div className="campaign-copy">
          {slide.eyebrow && <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.18em]">{slide.eyebrow}</p>}
          <h1 className="text-balance font-heading">{slide.heading}</h1>
          {slide.body && <p className="mt-6 max-w-[34ch] text-sm leading-relaxed text-store-muted">{slide.body}</p>}
          <div className="mt-7 flex flex-wrap gap-3">{sectionButtons({ ...slide }).filter(button => button.label && button.link).map((button, index) => <Link key={index} href={storeHref(storeSlug, button.link)} className={button.style === "secondary" ? "btn-secondary" : "btn-primary"}>{button.label}</Link>)}</div>
        </div>
        {slide.image && <img key={slide.image} src={slide.image} alt={slide.imageAlt} style={{ objectPosition: slide.imageFocus === "top" ? "center top" : slide.imageFocus === "bottom" ? "center bottom" : "center" }} fetchPriority="high" className="campaign-image" />}
      </div>
      {slides.length > 1 && <div className="campaign-controls">
        <div className="campaign-progress" aria-label="Choose campaign">
          {slides.map((item, i) => <button key={i} type="button" data-demo-control="true" aria-label={`Show ${item.heading || `campaign ${i + 1}`}`} aria-pressed={index === i} onClick={() => setActive(i)}><span /></button>)}
          <span className="!h-auto !w-auto !bg-transparent pl-3 text-[10px] tabular-nums">{String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" data-demo-control="true" onClick={() => go(-1)} aria-label="Previous campaign" className="flex h-10 w-10 items-center justify-center rounded-full border"><ArrowLeft size={18} /></button>
          <button type="button" data-demo-control="true" onClick={() => go(1)} aria-label="Next campaign" className="flex h-10 w-10 items-center justify-center rounded-full border"><ArrowRight size={18} /></button>
        </div>
      </div>}
      <p className="sr-only" aria-live="polite" aria-atomic="true">{slide.heading}</p>
    </section>
  );
}
