/** Platform calendar is Sudan time (API_CONVENTIONS §6). */
export const PLATFORM_TZ = 'Africa/Khartoum';

/** YYYY-MM-DD of `date` in Sudan time. */
export function sudanDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PLATFORM_TZ }).format(date);
}

/** `{ from, to }` Sudan days covering the last `days` days including today. */
export function lastDays(days: number, now: Date = new Date()): { from: string; to: string } {
  return { from: sudanDate(new Date(now.getTime() - (days - 1) * 86_400_000)), to: sudanDate(now) };
}

const dateTime = new Intl.DateTimeFormat('ar-SD', {
  timeZone: PLATFORM_TZ,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** "22 نوفمبر، 06:30 ص" in Sudan time. */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : '—';
}

const longDate = new Intl.DateTimeFormat('ar-SD', { timeZone: PLATFORM_TZ, day: 'numeric', month: 'long', year: 'numeric' });

/** "22 نوفمبر 2026" in Sudan time. */
export function formatLongDate(date: Date | string): string {
  return longDate.format(typeof date === 'string' ? new Date(date) : date);
}

const dayOnly = new Intl.DateTimeFormat('ar-SD', { timeZone: PLATFORM_TZ, day: 'numeric', month: 'short', year: 'numeric' });

/** "22 نوفمبر 2026" (short month) for period bounds. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? dayOnly.format(new Date(iso)) : '—';
}

/**
 * Inclusive Sudan-day label of a half-open UTC period [from, to) returned by the API
 * (e.g. settlements: periodTo is the start of the day after the last day).
 */
export function periodLabel(fromIso: string, toIso: string): string {
  const lastDay = new Date(new Date(toIso).getTime() - 1);
  return `${sudanDate(new Date(fromIso))} → ${sudanDate(lastDay)}`;
}
