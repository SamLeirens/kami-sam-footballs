export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 animate-pulse space-y-4 px-4 py-6">
      <div className="mx-auto h-4 w-48 rounded bg-surface-2" />
      <div className="h-36 rounded-2xl bg-surface" />
      <div className="h-40 rounded-xl bg-surface-2" />
    </main>
  );
}
