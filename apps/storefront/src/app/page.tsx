// Stores live at /<store-slug> (or ?store=<slug>, rewritten by middleware).
// Custom domains will map straight to a store; until then the bare root has nothing to show.
export default function Root() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 text-center">
      <p className="text-zinc-600">Open a store at /&lt;store-name&gt;.</p>
    </div>
  );
}
