export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-5">
      <span className="sr-only">Loading your finances</span>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="panel grid h-[118px] content-center gap-3 px-5">
            <span className="block h-3 w-24 rounded-sm bg-[var(--surface-neutral)]" />
            <span className="block h-7 w-36 max-w-full rounded-sm bg-[var(--surface-neutral)]" />
            <span className="block h-3 w-28 rounded-sm bg-[var(--surface-neutral)]" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="panel grid h-[320px] content-start gap-5 p-5">
            <span className="block h-4 w-36 rounded-sm bg-[var(--surface-neutral)]" />
            <span className="block h-56 rounded-sm bg-[var(--surface-muted)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
