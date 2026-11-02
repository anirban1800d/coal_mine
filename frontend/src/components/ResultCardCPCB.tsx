import { useState } from 'react';
import { motion } from 'framer-motion';
import { type CPCBRequirement } from '../services/api';
import { FileText, Tag, ClipboardCheck, Copy, Check, ChevronDown } from 'lucide-react';
import { formatValue, cn } from '../lib/utils';

interface ResultCardCPCBProps {
  item: CPCBRequirement;
  variants: any;
}

const LONG_TEXT_THRESHOLD = 220;

export default function ResultCardCPCB({ item, variants }: ResultCardCPCBProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const reqId = formatValue(item.Requirement_id);
  const chapter = formatValue(item.Chapter);
  const parameter = formatValue(item.parameter);
  const requirementText = formatValue(item.Requirements);
  const actionText = formatValue(item.Requirement_actions);
  const isLong = (requirementText?.length ?? 0) > LONG_TEXT_THRESHOLD;

  const handleCopy = async () => {
    const text = [parameter, requirementText, actionText].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  };

  return (
    <motion.article
      variants={variants}
      className="group relative flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg shadow-black/20 result-card-interactive result-card-cpcb"
    >
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
        style={{ background: 'var(--color-cpcb)' }}
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 pl-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono-tight text-xs font-medium"
          style={{ borderColor: 'var(--color-cpcb-dim)', color: 'var(--color-cpcb)', background: 'var(--color-cpcb-dim)' }}
        >
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {reqId ?? 'ID not specified'}
        </span>
        {chapter && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {chapter}
          </span>
        )}
      </div>

      <div className="pl-2">
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-white">
          {parameter ?? 'General requirement'}
        </h3>
        <p
          className={cn(
            'mt-2 max-w-[65ch] whitespace-pre-line text-sm leading-relaxed text-[var(--color-muted-strong)]',
            isLong && !expanded && 'line-clamp-4'
          )}
        >
          {requirementText ?? 'No requirement text provided for this entry.'}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-cpcb)] hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
        )}
      </div>

      {actionText && (
        <div
          className="ml-2 rounded-lg border p-3.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-background-raised)' }}
        >
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted-strong)]">
            <ClipboardCheck className="h-3.5 w-3.5" style={{ color: 'var(--color-cpcb)' }} aria-hidden="true" />
            Required action
          </h4>
          <p className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-[var(--color-muted-strong)]">
            {actionText}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy this requirement"
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-md border border-transparent p-1.5 text-[var(--color-muted)] opacity-0 transition-all hover:border-[var(--color-border)] hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="h-4 w-4" style={{ color: 'var(--color-safe)' }} /> : <Copy className="h-4 w-4" />}
      </button>
    </motion.article>
  );
}
