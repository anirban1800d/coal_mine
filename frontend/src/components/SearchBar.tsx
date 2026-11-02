import { useRef, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Domain } from './DomainSelector';

interface SearchBarProps {
  domain: Domain;
  query: string;
  setQuery: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder?: string;
  examples?: string[];
}

export default function SearchBar({
  domain,
  query,
  setQuery,
  onSubmit,
  isLoading,
  placeholder = 'Search regulations...',
  examples = [],
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit();
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    inputRef.current?.focus();
  };

  return (
    <div
      id="search-panel"
      role="tabpanel"
      aria-labelledby={`domain-tab-${domain}`}
      className="mt-2"
    >
      <form onSubmit={handleSubmit} className="relative w-full">
        <div
          className={cn(
            'flex flex-col items-stretch gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 transition-all duration-300 sm:flex-row sm:items-center',
            'focus-within:border-[var(--color-cpcb)] focus-within:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
            isLoading ? 'search-active-pulse border-[var(--color-cpcb)]' : 'hover:border-[var(--color-border-strong)]'
          )}
        >
          <div className="flex flex-1 items-center">
            <div className="flex items-center justify-center pl-3 pr-2 text-[var(--color-muted)]">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>

            <label htmlFor="regulatory-search" className="sr-only">
              {placeholder}
            </label>
            <input
              id="regulatory-search"
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              placeholder={placeholder}
              className="flex-1 border-none bg-transparent px-1 py-3 text-base text-white outline-none placeholder:text-[var(--color-muted)] disabled:opacity-50"
            />

            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  type="button"
                  onClick={handleClear}
                  disabled={isLoading}
                  aria-label="Clear search"
                  className="p-2 text-[var(--color-muted)] transition-colors hover:text-white disabled:opacity-50"
                >
                  <X className="h-4.5 w-4.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className={cn(
              'flex min-w-[112px] items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors duration-200',
              'bg-[var(--color-dgms)] hover:bg-[var(--color-dgms)]/90',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--color-dgms)]'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Searching</span>
              </>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {examples.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[var(--color-muted)]">Try:</span>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              disabled={isLoading}
              onClick={() => handleExampleClick(example)}
              className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted-strong)] transition-colors hover:border-[var(--color-border-strong)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
