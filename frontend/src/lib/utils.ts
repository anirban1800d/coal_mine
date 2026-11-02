import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely normalizes a value coming back from the backend for display.
 * Treats null, undefined, NaN, empty strings, and the literal strings
 * "null" / "nan" / "none" (sometimes serialized that way from pandas)
 * as "no value" rather than rendering them verbatim.
 */
export function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    if (['null', 'nan', 'none', 'n/a', 'undefined'].includes(trimmed.toLowerCase())) {
      return null;
    }
    return trimmed;
  }
  return String(value);
}

export type RiskLevel = 'high' | 'medium' | 'low' | 'unknown';

/**
 * Best-effort classification of a risk/severity value returned by the
 * backend into a display level. Backend copy is not guaranteed, so this
 * matches on common keywords rather than exact strings.
 */
export function classifyRisk(value: unknown): RiskLevel {
  const text = formatValue(value)?.toLowerCase();
  if (!text) return 'unknown';
  if (/(high|critical|severe|major)/.test(text)) return 'high';
  if (/(medium|moderate)/.test(text)) return 'medium';
  if (/(low|minor|minimal)/.test(text)) return 'low';
  return 'unknown';
}

/** Finds a value in a record by matching key name against a pattern. */
export function findFieldByKey(
  record: Record<string, unknown>,
  pattern: RegExp
): unknown {
  const key = Object.keys(record).find((k) => pattern.test(k));
  return key ? record[key] : undefined;
}

/**
 * Turns a raw fetch/network/HTTP error into a professional, user-facing
 * message. The technical detail is preserved separately so it can be
 * shown behind a "technical details" disclosure rather than the main
 * message.
 */
export function describeError(err: unknown): { message: string; detail: string | null } {
  const raw = err instanceof Error ? err.message : String(err);

  // Network-level failure (server down, CORS, offline) surfaces as a
  // generic "Failed to fetch" / "NetworkError" from the browser.
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return {
      message: 'The compliance server is unreachable right now. Check your connection and try again.',
      detail: raw,
    };
  }

  const statusMatch = raw.match(/(\d{3})/);
  const status = statusMatch ? Number(statusMatch[1]) : null;

  if (status && status >= 500) {
    return {
      message: 'The server ran into a problem processing this search. Please try again in a moment.',
      detail: raw,
    };
  }

  if (status === 404) {
    return {
      message: 'This search endpoint could not be found. The service may be misconfigured.',
      detail: raw,
    };
  }

  if (status && status >= 400) {
    return {
      message: 'This search could not be completed as requested.',
      detail: raw,
    };
  }

  return {
    message: 'An unexpected error occurred while fetching results.',
    detail: raw,
  };
}
