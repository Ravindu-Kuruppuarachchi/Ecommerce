import Link from "next/link";
import type { PublicStore } from "@/lib/types";
import { storeNavLinks } from "@/lib/nav";

export default function StoreFooter({ store }: { store: PublicStore }) {
  return (
    <footer className="mt-12 border-t border-store-line bg-store-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-8 md:grid-cols-[2fr_1fr]">
        <div>
          <p className="font-heading text-4xl font-semibold tracking-[-0.05em] md:text-6xl">{store.name}</p>
          {store.description && <p className="mt-2 max-w-md text-sm leading-relaxed text-store-muted">{store.description}</p>}
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 content-start gap-x-6 gap-y-3 text-sm">
          {storeNavLinks(store).map((l) => (
            <Link key={l.href} href={l.href} className="text-store-muted hover:text-store-fg">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <p className="mx-auto max-w-7xl px-4 pb-8 text-xs text-store-muted sm:px-8">
        © {new Date().getFullYear()} {store.name}
      </p>
    </footer>
  );
}
