"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { pagePath, type SitePage } from "@repo/core";
import { CartProvider } from "@/lib/cart";

/** Demo products never reach the checkout, newsletter or merchant tracking APIs. */
export default function TemplateDemo({ children, templateKey, pages = [] }: { children: ReactNode; templateKey?: string; pages?: SitePage[] }) {
  const router = useRouter();
  return (
    <CartProvider storeSlug="template-demo">
      <div onSubmitCapture={(e) => { e.preventDefault(); e.stopPropagation(); }} onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("[data-demo-control]")) return;
        const anchor = (e.target as HTMLElement).closest("a");
        if (anchor && templateKey) {
          const url = new URL(anchor.href);
          const path = url.pathname.replace(/^\/template-demo/, "") || "/";
          const page = pages.find(page => pagePath(page.slug) === path);
          if (page) { e.preventDefault(); e.stopPropagation(); router.push(`/template-preview/${templateKey}${page.slug === "home" ? "" : `?page=${encodeURIComponent(page.slug)}`}`); return; }
        }
        if ((e.target as HTMLElement).closest("a, button") && !(e.target as HTMLElement).closest("[data-demo-control]")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}>{children}</div>
    </CartProvider>
  );
}
