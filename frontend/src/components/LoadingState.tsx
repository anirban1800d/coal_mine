export default function LoadingState() {
  const skeletons = Array.from({ length: 4 });

  return (
    <div className="w-full py-8" role="status" aria-label="Searching regulations">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-surface)]" />
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--color-surface)]" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {skeletons.map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className="flex justify-between">
              <div className="h-6 w-28 animate-pulse rounded-md bg-[var(--color-background-raised)]" />
              <div className="h-6 w-16 animate-pulse rounded-md bg-[var(--color-background-raised)]" />
            </div>
            <div className="space-y-2.5">
              <div className="h-4 w-full animate-pulse rounded bg-[var(--color-background-raised)]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--color-background-raised)]" />
              <div className="h-4 w-3/6 animate-pulse rounded bg-[var(--color-background-raised)]" />
            </div>
            <div className="h-16 w-full animate-pulse rounded-lg bg-[var(--color-background-raised)]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Searching regulations, please wait…</span>
    </div>
  );
}
