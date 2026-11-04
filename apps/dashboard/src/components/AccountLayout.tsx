import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check } from "@phosphor-icons/react/dist/ssr";
import VoxelBrand from "./VoxelBrand";

/** Shared company branding around the existing merchant account forms. */
export default function AccountLayout({ children, register = false }: { children: React.ReactNode; register?: boolean }) {
  return <main className="voxel-account">
    <aside className="voxel-account-story">
      <Link href="/" aria-label="Voxel Labs home"><VoxelBrand /></Link>
      <div className="voxel-account-message">
        <p className="voxel-eyebrow">Commerce by Voxel Labs</p>
        <h2>{register ? <>Your business.<br />Your next chapter.</> : <>Good to have<br />you back.</>}</h2>
        <p>{register ? "Turn your idea into a store that feels like you. We bring the tools. You bring the ambition." : "Your products, your people, your next big idea. Pick up where you left off."}</p>
        <ul>{["20 designs to make your own", "Products, orders and customers together", "No monthly fee. 10% of each sale."].map(item => <li key={item}><Check size={18} />{item}</li>)}</ul>
      </div>
      <a href="https://voxel-lab.vercel.app/" target="_blank" rel="noreferrer" className="voxel-company-link">Built by Voxel Labs <ArrowUpRight size={16} /></a>
    </aside>
    <section className="voxel-account-form">
      <div className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-950"><ArrowLeft size={16} />Back to home</Link><div className="lg:hidden"><VoxelBrand compact /></div></div>
      {children}
      <p className="mt-8 text-xs text-gray-500">&copy; {new Date().getFullYear()} Voxel Labs</p>
    </section>
  </main>;
}
