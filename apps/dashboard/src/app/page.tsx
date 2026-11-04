import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CursorClick, Package, Storefront, Users } from "@phosphor-icons/react/dist/ssr";
import { TEMPLATE_KEYS, TEMPLATES } from "@repo/core";
import VoxelBrand from "@/components/VoxelBrand";
import { STOREFRONT_URL } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Voxel Labs | Build your online store",
  description: "Launch a store that feels like your brand with Voxel Labs. Explore 20 designs, edit every page and manage products, orders and customers in one place.",
};

const designs = [
  { key: "runway", image: "runway", label: "For the next big label", category: "Fashion & lifestyle" },
  { key: "reef", image: "reef", label: "For a world of your own", category: "Aquariums & specialist stores" },
  { key: "circuit", image: "circuit", label: "For what comes next", category: "Electronics & technology" },
] as const;

export default function Home() {
  return <div className="voxel-site">
    <a href="#main" className="voxel-skip">Skip to content</a>
    <header className="voxel-header">
      <Link href="/" aria-label="Voxel Labs home"><VoxelBrand /></Link>
      <nav aria-label="Main" className="voxel-nav"><a href="#features">Features</a><a href="#designs">Designs</a><a href="#pricing">Pricing</a></nav>
      <div className="voxel-header-actions"><Link href="/login" className="voxel-sign-in">Sign in</Link><Link href="/register" className="voxel-button">Get started <ArrowUpRight size={17} /></Link></div>
    </header>
    <main id="main">
      <section className="voxel-hero voxel-wrap">
        <div className="voxel-hero-copy">
          <p className="voxel-eyebrow">Commerce by Voxel Labs</p>
          <h1>Your store.<br /><span>Built for more.</span></h1>
          <p className="voxel-hero-description">Create a store that feels like your brand. Everything you need to start selling, in one place.</p>
          <div className="voxel-hero-actions"><Link href="/register" className="voxel-button">Build your store <ArrowUpRight size={18} /></Link><a href="#designs" className="voxel-text-link">Explore the designs <ArrowDown size={17} /></a></div>
        </div>
        <div className="voxel-hero-visual">
          <div className="voxel-preview-frame"><div className="voxel-preview-bar"><span>Habitat / Furniture & home</span><a href={`${STOREFRONT_URL}/template-preview/habitat`} target="_blank" rel="noreferrer" aria-label="Open Habitat live preview"><ArrowUpRight size={18} /></a></div><Image src="/brand/previews/habitat.png" alt="Habitat store design with furniture photography and a full-width hero" width={1000} height={1000} priority sizes="(max-width: 767px) 100vw, 52vw" /></div>
        </div>
      </section>
      <div className="voxel-facts voxel-wrap"><p><strong>{TEMPLATE_KEYS.length}</strong> ready-to-edit designs</p><p><strong>Your brand.</strong> Every page.</p><p><strong>One place</strong> to run your store</p></div>
      <section id="features" className="voxel-section voxel-wrap">
        <div className="voxel-section-heading"><h2>A storefront is just the start.</h2><p>Build the experience your customers see. Keep the business behind it organised.</p></div>
        <div className="voxel-feature-grid">
          <div className="voxel-feature-main"><CursorClick size={30} weight="light" /><h3>Make every page yours.</h3><p>Choose your design, change colours and photos, and connect your pages. Your story, your catalog, your way.</p><div className="voxel-page-flow" aria-label="Example site structure"><span>Home</span><ArrowRight size={18} /><span>Collection</span><ArrowRight size={18} /><span>Product</span></div><Link href="/register" className="voxel-text-link">Start creating <ArrowUpRight size={17} /></Link></div>
          <div className="voxel-feature-list">{[
            { icon: Package, title: "A catalog that works as hard as you.", copy: "Products, options, prices and stock. Keep everything ready for your next order." },
            { icon: Storefront, title: "From first click to order.", copy: "Search, collections, cart and checkout work together across every design." },
            { icon: Users, title: "Know the people behind the purchases.", copy: "Google sign-in keeps customer profiles and order history together." },
          ].map(({icon: Icon,title,copy}) => <div className="voxel-feature-row" key={title}><Icon size={24} weight="light" /><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div>
        </div>
      </section>
      <section id="designs" className="voxel-section voxel-design-section">
        <div className="voxel-wrap"><div className="voxel-section-heading"><h2>Different businesses.<br />Distinct personalities.</h2><p>A starting point for what you do. Make it something only you could build.</p></div>
          <div className="voxel-design-grid">{designs.map(design => <article key={design.key}><a href={`${STOREFRONT_URL}/template-preview/${design.key}`} target="_blank" rel="noreferrer" className="voxel-design-image" aria-label={`Preview ${TEMPLATES[design.key].name} in a new tab`}><Image src={`/brand/previews/${design.image}.png`} alt={`${TEMPLATES[design.key].name} storefront design`} width={800} height={900} sizes="(max-width: 767px) 90vw, 33vw" /></a><div className="voxel-design-caption"><div><p>{design.category}</p><h3>{design.label}</h3></div><a href={`${STOREFRONT_URL}/template-preview/${design.key}`} target="_blank" rel="noreferrer" aria-label={`Open ${TEMPLATES[design.key].name} preview`}><ArrowUpRight size={24} /></a></div></article>)}</div>
          <p className="voxel-design-note">Fashion, furniture, electronics, aquariums and more. <Link href="/register">Find your starting point <ArrowRight size={16} /></Link></p>
        </div>
      </section>
      <section id="pricing" className="voxel-section voxel-wrap voxel-pricing">
        <div className="voxel-section-heading"><h2>A simple way<br />to get started.</h2><p>Put your energy into your business. Build and manage your store without a monthly platform fee.</p></div>
        <div className="voxel-price-detail"><div className="voxel-price"><strong>10<span>%</span></strong><p>of each sale’s goods subtotal</p></div><ul>{["No monthly platform fee", "All 20 store designs", "Page editor and product management", "Orders and customer profiles"].map(item=><li key={item}><Check size={18} />{item}</li>)}</ul><Link href="/register" className="voxel-button">Create your store <ArrowUpRight size={18} /></Link></div>
      </section>
    </main>
    <footer className="voxel-footer voxel-wrap"><div><Link href="/" aria-label="Voxel Labs home"><VoxelBrand /></Link><p>Tools for your next chapter.</p></div><nav aria-label="Footer"><Link href="/login">Merchant sign in</Link><a href="https://voxel-lab.vercel.app/" target="_blank" rel="noreferrer">About Voxel Labs <ArrowUpRight size={15} /></a><a href="https://voxel-lab.vercel.app/contact" target="_blank" rel="noreferrer">Contact us <ArrowUpRight size={15} /></a></nav><p className="voxel-copyright">&copy; {new Date().getFullYear()} Voxel Labs</p></footer>
  </div>;
}
