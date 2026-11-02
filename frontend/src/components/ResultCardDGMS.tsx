import { useState } from 'react';
import { motion } from 'framer-motion';
import { type DGMSRequirement } from '../services/api';
import { Tag, FileText, Layers, Copy, Check, ChevronDown, AlertTriangle } from 'lucide-react';
import { cn, formatValue, findFieldByKey, classifyRisk, type RiskLevel } from '../lib/utils';

interface ResultCardDGMSProps {
  item: DGMSRequirement;
  variants: any;
}

const LONG_TEXT_THRESHOLD = 220;

// Label -> key-matching pattern. Backend field naming for the "dynamic
// extracted fields" isn't guaranteed to be a fixed schema, so we match on
// keywords in the key name rather than an exact string.
const KNOWN_SPEC_FIELDS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Responsible role', pattern: /responsible.*role/i },
  { label: 'Responsible entity', pattern: /responsible.*entity/i },
  { label: 'Applicability', pattern: /applicab/i },
  { label: 'Trigger event', pattern: /trigger/i },
  { label: 'Frequency', pattern: /frequency/i },
  { label: 'Required records', pattern: /record/i },
  { label: 'Required evidence', pattern: /evidence/i },
  { label: 'Corrective action', pattern: /corrective/i },
  { label: 'Violation condition', pattern: /violation/i },
  { label: 'Relevance reason', pattern: /relevance.*reason|reason.*relevance/i },
];

const RISK_STYLES: Record<RiskLevel, { border: string; bg: string; text: string; label: string }> = {
  high: { border: 'var(--color-danger)', bg: 'var(--color-danger-dim)', text: 'var(--color-danger)', label: 'High risk' },
  medium: { border: 'var(--color-hazard)', bg: 'var(--color-hazard-dim)', text: 'var(--color-hazard)', label: 'Medium risk' },
  low: { border: 'var(--color-safe)', bg: 'var(--color-safe-dim)', text: 'var(--color-safe)', label: 'Low risk' },
  unknown: { border: 'var(--color-border-strong)', bg: 'transparent', text: 'var(--color-muted)', label: 'Risk not specified' },
};

export default function ResultCardDGMS({ item, variants }: ResultCardDGMSProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    Score,
    'Requirement ID': reqIdRaw,
    'Regulation Number': regNumberRaw,
    'Regulation Title': regTitleRaw,
    Chapter: chapterRaw,
    'Clause Number': clauseRaw,
    ...rest
  } = item;

  const reqId = formatValue(reqIdRaw);
  const regNumber = formatValue(regNumberRaw);
  const regTitle = formatValue(regTitleRaw);
  const chapter = formatValue(chapterRaw);
  const clause = formatValue(clauseRaw);
  const score = typeof Score === 'number' && !Number.isNaN(Score) ? Score : null;

  const requirementText = formatValue(findFieldByKey(rest, /^requirement$/i));
  const riskValue = findFieldByKey(rest, /risk/i);
  const riskLevel = classifyRisk(riskValue);
  const riskLabel = formatValue(riskValue);

  const consumedKeys = new Set<string>();
  Object.keys(rest).forEach((key) => {
    if (/^requirement$/i.test(key) || /risk/i.test(key) || /^rank$/i.test(key)) {
      consumedKeys.add(key);
    }
  });

  const specFields = KNOWN_SPEC_FIELDS.map(({ label, pattern }) => {
    const matchedKey = Object.keys(rest).find((k) => pattern.test(k) && !consumedKeys.has(k));
    if (!matchedKey) return null;
    consumedKeys.add(matchedKey);
    const value = formatValue(rest[matchedKey]);
    if (value === null) return null;
    return { label, value };
  }).filter((f): f is { label: string; value: string } => f !== null);

  const additionalFields = Object.entries(rest)
    .filter(([key]) => !consumedKeys.has(key))
    .map(([key, value]) => ({ label: key, value: formatValue(value) }))
    .filter((f): f is { label: string; value: string } => f.value !== null);

  const isLong = (requirementText?.length ?? 0) > LONG_TEXT_THRESHOLD;
  const riskStyle = RISK_STYLES[riskLevel];

  const handleCopy = async () => {
    const text = [regTitle, requirementText, ...specFields.map((f) => `${f.label}: ${f.value}`)]
      .filter(Boolean)
      .join('\n');
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
      className="group relative flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-lg shadow-black/20 result-card-interactive result-card-dgms"
    >
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
        style={{ background: 'var(--color-dgms)' }}
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-center gap-2 pl-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono-tight text-xs font-medium"
          style={{ borderColor: 'var(--color-dgms-dim)', color: 'var(--color-dgms)', background: 'var(--color-dgms-dim)' }}
        >
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {reqId ?? 'ID not specified'}
        </span>
        {regNumber && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2 py-1 font-mono-tight text-xs text-[var(--color-muted-strong)]">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {regNumber}
          </span>
        )}
        {clause && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2 py-1 font-mono-tight text-xs text-[var(--color-muted-strong)]">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            {clause}
          </span>
        )}
        {score !== null && (
          <span className="ml-auto font-mono-tight text-[11px] text-[var(--color-muted)]">
            Match {(score * (score <= 1 ? 100 : 1)).toFixed(0)}
            {score <= 1 ? '%' : ''}
          </span>
        )}
      </div>

      <div className="pl-2">
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-white">
          {regTitle ?? 'General safety regulation'}
        </h3>
        {chapter && (
          <p className="mt-1 text-xs font-medium text-[var(--color-muted)]">{chapter}</p>
        )}

        {requirementText && (
          <>
            <p
              className={cn(
                'mt-3 max-w-[65ch] whitespace-pre-line border-l-2 py-0.5 pl-3 text-sm leading-relaxed text-[var(--color-muted-strong)]',
                isLong && !expanded && 'line-clamp-4'
              )}
              style={{ borderColor: 'var(--color-dgms)' }}
            >
              {requirementText}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: 'var(--color-dgms)' }}
              >
                {expanded ? 'Show less' : 'Show more'}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
              </button>
            )}
          </>
        )}
      </div>

      <div className="pl-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold"
          style={{ borderColor: riskStyle.border, background: riskStyle.bg, color: riskStyle.text }}
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {riskLabel && riskLevel !== 'unknown' ? riskLabel : riskStyle.label}
        </span>
      </div>

      {(specFields.length > 0 || additionalFields.length > 0) && (
        <div className="ml-2 grid grid-cols-1 gap-x-6 gap-y-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-background-raised)] p-3.5 sm:grid-cols-2">
          {[...specFields, ...additionalFields].map((field) => (
            <div key={field.label} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                {field.label}
              </span>
              <span className="text-xs leading-relaxed text-[var(--color-muted-strong)]">
                {field.value}
              </span>
            </div>
          ))}
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
