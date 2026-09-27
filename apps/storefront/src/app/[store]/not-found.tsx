import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-heading text-3xl font-semibold">Page not found</h1>
      <p className="mt-3 text-store-muted">It may have moved, or the link might be wrong.</p>
      <Link href="/" className="btn-secondary mt-8">Go back</Link>
    </div>
  );
}
