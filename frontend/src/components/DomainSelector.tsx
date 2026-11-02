import { useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Leaf, HardHat, ShieldCheck } from 'lucide-react';

export type Domain = 'cpcb' | 'dgms' | 'ppe';

interface DomainSelectorProps {
  selected: Domain;
  onChange: (domain: Domain) => void;
  disabled?: boolean;
}

const OPTIONS = [
  {
    id: 'cpcb' as const,
    label: 'CPCB',
    description: 'Pollution control standards',
    icon: Leaf,
    color: 'var(--color-cpcb)',
    dim: 'var(--color-cpcb-dim)',
  },
  {
    id: 'dgms' as const,
    label: 'DGMS',
    description: 'Mine safety regulations',
    icon: HardHat,
    color: 'var(--color-dgms)',
    dim: 'var(--color-dgms-dim)',
  },
  {
    id: 'ppe' as const,
    label: 'PPE',
    description: 'Safety equipment detection',
    icon: ShieldCheck,
    color: 'var(--color-ppe)',
    dim: 'var(--color-ppe-dim)',
  },
];

export default function DomainSelector({ selected, onChange, disabled }: DomainSelectorProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const nextIndex = e.key === 'ArrowRight'
      ? (index + 1) % OPTIONS.length
      : (index - 1 + OPTIONS.length) % OPTIONS.length;
    const next = OPTIONS[nextIndex];
    onChange(next.id);
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Regulatory domain"
      className="flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background-raised)] p-1.5 sm:flex-row"
    >
      {OPTIONS.map((option, index) => {
        const isSelected = selected === option.id;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            ref={(el) => { buttonRefs.current[index] = el; }}
            id={`domain-tab-${option.id}`}
            role="tab"
            aria-selected={isSelected}
            aria-controls="search-panel"
            tabIndex={isSelected ? 0 : -1}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              'relative flex flex-1 items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors duration-200 focus-visible:outline-offset-4',
              isSelected ? 'text-white' : 'text-[var(--color-muted-strong)] hover:text-white',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="domain-active-bg"
                className="absolute inset-0 rounded-lg border"
                style={{ background: option.dim, borderColor: option.color }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
            <Icon
              className="relative z-10 h-4.5 w-4.5 shrink-0"
              style={{ color: isSelected ? option.color : undefined }}
              aria-hidden="true"
            />
            <span className="relative z-10 flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">{option.label}</span>
              <span className="text-[11px] font-normal text-[var(--color-muted)]">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
