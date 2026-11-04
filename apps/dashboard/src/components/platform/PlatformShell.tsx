"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChartLine, ClockCounterClockwise, List, ShieldCheck, SignOut, Storefront, X } from "@phosphor-icons/react";
import VoxelBrand from "../VoxelBrand";
import { useAuthStore, useHasHydrated } from "@/stores/auth-store";

const NAV = [
  { href: "/platform", label: "Overview", icon: ChartLine },
  { href: "/platform/stores", label: "Stores", icon: Storefront },
  { href: "/platform/audit", label: "Audit log", icon: ClockCounterClockwise },
];

/** Shell for platform staff. Visually distinct from the merchant admin so it's never mistaken for a store. */
export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useHasHydrated();
  const { token, user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (user?.role !== "platform_admin") router.replace("/dashboard");
  }, [hasHydrated, token, user?.role, pathname, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (!hasHydrated || !token || user?.role !== "platform_admin") return <div className="min-h-[100dvh] bg-gray-50" aria-busy="true" />;

  const active = (href: string) => (href === "/platform" ? pathname === href : pathname.startsWith(href));
  const nav = (
    <nav aria-label="Platform" className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/" aria-label="Voxel Labs home" className="inline-block rounded-lg bg-white px-3 py-2"><VoxelBrand compact /></Link>
        <p className="mt-0.5 text-xs text-gray-400">Platform admin</p>
      </div>
      <div className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active(href) ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </div>
      <div className="border-t border-white/10 px-3 py-4">
        <p className="truncate px-3 pb-2 text-xs text-gray-500">{user.email}</p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <SignOut size={18} /> Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 bg-gray-950 lg:block">{nav}</aside>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-gray-950 px-4 text-white lg:hidden">
        <span className="flex items-center gap-2 font-bold"><ShieldCheck size={18} weight="fill" /> Platform admin</span>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-white/10">
          <List size={22} />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/40" />
          <aside className="absolute inset-y-0 left-0 w-64 bg-gray-950">
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-2 text-white hover:bg-white/10">
              <X size={20} />
            </button>
            {nav}
          </aside>
        </div>
      )}
      <div className="lg:pl-56">{children}</div>
    </div>
  );
}
