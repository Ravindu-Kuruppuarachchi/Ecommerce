"use client";
import { useState } from "react";
import { applyBps, DEFAULT_PLATFORM_FEE_BPS, formatMoney, toMinor } from "@repo/core";
export default function PricingCalculator() {
 const [amount,setAmount] = useState("10000"); const minor = toMinor(amount); const valid = minor!==null; const fee = valid ? applyBps(minor,DEFAULT_PLATFORM_FEE_BPS) : 0;
 return <div className="vl-calculator"><p className="voxel-eyebrow">See the numbers</p><h2>A little less guesswork.</h2><p>Try an example goods subtotal after discounts.</p><label htmlFor="goods-subtotal">Goods subtotal (LKR)</label><input id="goods-subtotal" type="text" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} aria-invalid={!valid} aria-describedby="price-note"/>{!valid && <p role="alert">Enter a positive amount or zero, with up to two decimal places (maximum Rs. 21,474,836.47).</p>}<dl aria-live="polite"><div><dt>Platform fee ({DEFAULT_PLATFORM_FEE_BPS/100}%)</dt><dd>{valid ? formatMoney(fee) : "—"}</dd></div><div><dt>Goods amount after platform fee</dt><dd>{valid ? formatMoney(minor-fee) : "—"}</dd></div></dl><p id="price-note" className="vl-caption">Illustrative only. Excludes delivery, tax, refunds and your business costs. This shows the goods amount after the platform fee, not profit or an automatic payout.</p></div>;
}
