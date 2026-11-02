import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface ErrorStateProps {
  error: string;
  detail?: string | null;
  onRetry: () => void;
}

export default function ErrorState({ error, detail, onRetry }: ErrorStateProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="alert"
      className="mx-auto mt-4 max-w-xl"
    >
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: 'var(--color-hazard-dim)', background: 'var(--color-hazard-dim)' }}
      >
        <AlertTriangle className="mx-auto h-9 w-9" style={{ color: 'var(--color-hazard)' }} aria-hidden="true" />
        <h3 className="mt-3 text-base font-semibold tracking-tight text-white">Search couldn't be completed</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-muted-strong)]">
          {error}
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            style={{ borderColor: 'var(--color-hazard)', background: 'var(--color-hazard-dim)' }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retry search
          </button>
        </div>

        {detail && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-muted-strong)]"
              aria-expanded={showDetail}
            >
              Technical details
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDetail && 'rotate-180')} />
            </button>
            {showDetail && (
              <p className="mt-2 break-words font-mono-tight text-[11px] text-[var(--color-muted)]">
                {detail}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
