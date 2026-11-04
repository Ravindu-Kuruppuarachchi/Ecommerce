export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Store not found</h1>
        <p className="mt-2 text-zinc-600">Check the address and try again.</p>
      </div>
    </div>
  );
}
