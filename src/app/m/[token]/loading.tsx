export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 animate-pulse space-y-4 px-4 py-6">
      <div className="mx-auto h-4 w-48 rounded bg-black/10" />
      <div className="h-40 rounded-2xl bg-pitch-800/30" />
      <div className="h-48 rounded-xl bg-black/5" />
    </main>
  );
}
