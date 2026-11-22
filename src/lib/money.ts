/**
 * Money is always integer minor units from the API (1 SDG = 100). Convert only for display.
 */
export function minorToSdg(minor: number): number {
  return minor / 100;
}

export function sdgToMinor(sdg: number): number {
  return Math.round(sdg * 100);
}

/** "12,500 ج.س" — no decimals unless there are piasters. */
export function formatSdg(minor: number | null | undefined): string {
  if (minor === null || minor === undefined) return '—';
  const value = minor / 100;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ج.س`;
}

/** "10%" / "2.5%" — at most 2 decimals, no trailing zeros. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Number(value.toFixed(2)).toLocaleString('en-US')}%`;
}

/** Basis points (500 = 5%) as a percent label. */
export function formatBasisPoints(bp: number): string {
  return formatPercent(bp / 100);
}
