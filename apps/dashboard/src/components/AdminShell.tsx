"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Article,
  ArrowSquareOut,
  ChartLine,
  Gear,
  House,
  List,
  Package,
  Receipt,
  SignOut,
  SquaresFour,
  Star,
  Storefront,
  Tag,
  Truck,
  Users,
  Wallet,
  X,
  type IconProps,
} from "@phosphor-icons/react";
import type { ModuleKey } from "@repo/core";
import { storeApi } from "@/lib/api-client";
import { storefrontUrl } from "@/lib/urls";
import { useAuthStore, useHasHydrated } from "@/stores/auth-store";

const MODULE_ICONS: Record<ModuleKey, ComponentType<IconProps>> = {
  catalog: Package,
  orders: Receipt,
  storefront: Storefront,
  payments: Wallet,
  customers: Users,
  shipping: Truck,
  discounts: Tag,
  inventory: Package,
  reviews: Star,
  analytics: ChartLine,
  blog: Article,
};

interface NavItem {
  label: string;
  href: string;
  module: ModuleKey;
}

/** Features page and elsewhere call this after changing modules so the menu updates. */
export const MODULES_CHANGED_EVENT = "modules-changed";

// Full-screen routes (the page editor) get the whole viewport, no sidebar.
const isFullScreen = (path: string) => path.startsWith("/store/pages/");

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: ComponentType<IconProps>; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`sidebar-link ${active ? "active" : "text-gray-600"}`}>
      <Icon size={18} weight={active ? "fill" : "regular"} />
      {label}
    </Link>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useHasHydrated();
  const { token, store, logout } = useAuthStore();
  const [nav, setNav] = useState<NavItem[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && !token) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hasHydrated, token, pathname, router]);

  const loadNav = useCallback(() => {
    storeApi
      .modules()
      .then((res) => setNav(res.data.nav))
      .catch(() => setNav([]));
  }, []);

  useEffect(() => {
    if (!token) return;
    loadNav();
    window.addEventListener(MODULES_CHANGED_EVENT, loadNav);
    return () => window.removeEventListener(MODULES_CHANGED_EVENT, loadNav);
  }, [token, loadNav]);

  useEffect(() => setMenuOpen(false), [pathname]);

  if (!hasHydrated || !token) {
    return <div className="min-h-[100dvh] bg-gray-50" aria-busy="true" />;
  }

  if (isFullScreen(pathname)) return <>{children}</>;

  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col">
      <div className="border-b border-gray-100 px-5 py-5">
        <p className="text-lg font-bold tracking-tight text-gray-900">ShopHub</p>
        {store && (
          <a
            href={storefrontUrl(store.slug)}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-gray-500 hover:text-brand-700"
          >
            {store.name}
            <ArrowSquareOut size={12} />
          </a>
        )}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <NavLink href="/dashboard" label="Home" icon={House} active={isActive("/dashboard")} />
        {nav === null
          ? Array.from({ length: 4 }, (_, i) => <div key={i} className="mx-4 my-3 h-4 animate-pulse rounded bg-gray-100" />)
          : nav.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={MODULE_ICONS[item.module]} active={isActive(item.href)} />
            ))}
      </div>
      <div className="space-y-1 border-t border-gray-100 px-3 py-4">
        <NavLink href="/features" label="Features" icon={SquaresFour} active={isActive("/features")} />
        <NavLink href="/settings" label="Settings" icon={Gear} active={isActive("/settings")} />
        <button
          type="button"
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="sidebar-link w-full text-gray-600"
        >
          <SignOut size={18} />
          Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-gray-200 bg-white lg:block">{sidebar}</aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <span className="font-bold tracking-tight">ShopHub</span>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-gray-100">
          <List size={22} />
        </button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-gray-900/30" />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-2 hover:bg-gray-100">
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-60">{children}</div>
    </div>
  );
}
