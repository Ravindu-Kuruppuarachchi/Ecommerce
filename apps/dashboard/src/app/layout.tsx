import type { Metadata } from "next";
import "./globals.css";
import "./voxel.css";

export const metadata: Metadata = {
  title: "Voxel Labs | Commerce",
  description:
    "Manage your online store, products, orders, and analytics from the Voxel Labs merchant dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
