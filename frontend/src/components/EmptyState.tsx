import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';

export default function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="status"
      className="mx-auto flex max-w-md flex-col items-center py-20 text-center"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <SearchX className="h-6 w-6 text-[var(--color-muted)]" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-white">No matching requirements</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        No CPCB or DGMS entries matched this search. Try a broader term, check
        the spelling, or switch to the other regulatory domain.
      </p>
    </motion.div>
  );
}
