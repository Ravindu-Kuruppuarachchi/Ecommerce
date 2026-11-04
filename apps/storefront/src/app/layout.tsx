import type { Metadata } from "next";
import "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Store",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] antialiased">{children}</body>
    </html>
  );
}
