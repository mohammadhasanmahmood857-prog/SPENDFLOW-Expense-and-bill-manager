export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-5">
      <span className="sr-only">Loading your finances</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="panel h-[118px] bg-white motion-safe:animate-pulse" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => <div key={index} className="panel h-[320px] bg-white motion-safe:animate-pulse" />)}
      </div>
    </div>
  );
}
