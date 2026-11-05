import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { DEFAULT_PLATFORM_FEE_BPS } from "@repo/core";
import { Site, CTA, Heading, FAQ, Included } from "@/components/marketing/Site";
import PricingCalculator from "@/components/marketing/PricingCalculator";
export const metadata: Metadata = { title: "Simple pricing | Shophub by Voxel Labs", description: "No monthly platform fee. A standard 10% fee on goods after discounts, with all 20 designs and store management tools included." };
export default function Pricing() {return <Site active="Pricing"><Heading eyebrow="Straightforward from the start" title="Big plans. Simple pricing.">Put your energy into your products and your customers. Start your store without a monthly platform fee.</Heading><section className="voxel-wrap vl-pricing-layout"><div className="vl-plan"><span className="vl-pill">Your store, all together</span><h2>Start something of your own.</h2><div className="voxel-price"><strong>{DEFAULT_PLATFORM_FEE_BPS/100}<span>%</span></strong><p>standard fee on goods after discounts</p></div><p className="vl-plan-note">Rs. 0 monthly platform fee. Delivery and tax are excluded from the platform fee calculation.</p><Included/><Link href="/register" className="voxel-button">Create your store <ArrowUpRight size={18}/></Link></div><PricingCalculator/></section><FAQ/><CTA/></Site>;}
