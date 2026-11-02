import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, HardHat, Sparkles, Database } from 'lucide-react';

interface HeroSectionProps {
  children: ReactNode;
}

const TRUST_INDICATORS = [
  { label: 'CPCB Standards', icon: ShieldCheck },
  { label: 'DGMS Regulations', icon: HardHat },
  { label: 'Semantic Search', icon: Sparkles },
  { label: 'Regulatory Knowledge Base', icon: Database },
];

export default function HeroSection({ children }: HeroSectionProps) {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-[var(--color-border)] bg-contour bg-grid px-4 pb-14 pt-16 sm:px-6 lg:px-8"
    >
      {/* Faint vignette so the grid/contour pattern fades toward the edges
          instead of tiling uniformly across the whole viewport. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, transparent 0%, var(--color-background) 85%)',
        }}
        aria-hidden="true"
      />

      <div className="container relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="text-balance max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-5xl">
            Search environmental and mining safety regulations, instantly.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-muted-strong)] sm:text-lg">
            GeoMine AI indexes CPCB environmental standards and DGMS mining
            safety regulations, so your team can find the exact requirement,
            clause, or corrective action behind any compliance question.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Platform capabilities">
            {TRUST_INDICATORS.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-strong)]"
              >
                <Icon className="h-3.5 w-3.5" style={{ color: 'var(--color-cpcb)' }} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.12 }}
          className="mt-10 rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)]/80 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-5"
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
