import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check } from "@phosphor-icons/react/dist/ssr";
import { StoreGraphic } from "./marketing/Toolkit";
import VoxelBrand from "./VoxelBrand";

/** Shared company branding around the existing merchant account forms. */
export default function AccountLayout({ children, register = false }: { children: React.ReactNode; register?: boolean }) {
  return <main className="voxel-account">
    <aside className="voxel-account-story">
      <Link href="/" aria-label="Shophub home"><VoxelBrand /></Link>
      <div className="voxel-account-content"><div className="voxel-account-message">
        <p className="voxel-eyebrow">Your ambition. Your space.</p>
        <h2>{register ? <>Your business.<br />Your next chapter.</> : <>Good to have<br />you back.</>}</h2>
        <p>{register ? "Start with an idea. Give it a home. Build a store that looks like your brand, with the tools to keep your business moving." : "Your products, your people, your next big idea. Step into your workspace and keep building something of your own."}</p>
        <ul>{[
          ["A storefront with your personality", "20 editable designs. Your colours, content and story."],
          ["A little more order in your everyday", "Products, stock, customers and orders in one place."],
          ["Space to start something", "No monthly platform fee. Standard 10% fee on goods after discounts."],
        ].map(([title,copy]) => <li key={title}><Check size={18}/><span><strong>{title}</strong><span>{copy}</span></span></li>)}</ul>
      </div><div className="voxel-account-graphic"><StoreGraphic/></div><p className="voxel-account-caption">A small business. A world of possibility.</p></div>
      <a href="https://voxel-lab.vercel.app/" target="_blank" rel="noreferrer" className="voxel-company-link">Built by Voxel Labs <ArrowUpRight size={16} /></a>
    </aside>
    <section className="voxel-account-form">
      <div className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-950"><ArrowLeft size={16} />Back to home</Link><div className="lg:hidden"><VoxelBrand compact /></div></div>
      {children}
      <p className="mt-8 text-xs text-gray-500">&copy; {new Date().getFullYear()} Shophub by Voxel Labs</p>
    </section>
  </main>;
}
