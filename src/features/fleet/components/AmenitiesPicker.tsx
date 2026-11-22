import * as React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { cn } from '../../../lib/utils';
import { useAmenityCatalog, type AmenityInput } from '../api';

/**
 * Pick amenities, each with an optional short value (e.g. "20 كغ").
 * The carrier API has no amenity catalog endpoint, so the list is the platform's standard amenities
 * merged with those already used on this company's vehicles (see `useAmenityCatalog`).
 */
export const AmenitiesPicker: React.FC<{ value: AmenityInput[]; onChange: (next: AmenityInput[]) => void }> = ({ value, onChange }) => {
  const catalog = useAmenityCatalog();
  if (catalog.isLoading) return <Skeleton className="h-24 rounded-lg" />;
  const items = catalog.data ?? [];

  const byCode = new Map(value.map((a) => [a.code, a]));
  const toggle = (code: string) => onChange(byCode.has(code) ? value.filter((a) => a.code !== code) : [...value, { code }]);
  const setValue = (code: string, v: string) => onChange(value.map((a) => (a.code === code ? { code, ...(v ? { value: v } : {}) } : a)));

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((a) => {
        const picked = byCode.get(a.code);
        return (
          <div
            key={a.code}
            className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', picked ? 'border-secondary bg-secondary/5' : 'border-outline-variant/50')}
          >
            <label className="flex items-center gap-2 text-sm flex-1 cursor-pointer min-w-0">
              <input type="checkbox" checked={Boolean(picked)} onChange={() => toggle(a.code)} />
              <span className="material-symbols-outlined text-[18px] text-secondary">{a.icon}</span>
              <span className="truncate">{a.nameAr}</span>
            </label>
            {picked && (
              <input
                aria-label={`قيمة ${a.nameAr}`}
                value={picked.value ?? ''}
                maxLength={32}
                onChange={(e) => setValue(a.code, e.target.value)}
                placeholder="قيمة اختيارية"
                className="h-8 w-28 rounded-md border border-outline-variant/60 bg-surface-container-lowest px-2 text-xs"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
