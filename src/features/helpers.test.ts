import { describe, expect, it } from 'vitest';
import { mergeAmenityCatalog, STANDARD_AMENITIES } from './fleet/api';
import { occupancyPercent } from './home/api';
import { stationsFromCities } from './network/api';
import { changedFlags } from './staff/api';

describe('carrier portal helpers', () => {
  it('flattens public cities into station options', () => {
    const out = stationsFromCities([
      { id: 'c1', code: 'KRT', nameAr: 'الخرطوم', nameEn: 'Khartoum', stations: [{ id: 's1', nameAr: 'الميناء البري', nameEn: 'Mina' }] },
      { id: 'c2', code: 'DOG', nameAr: 'دنقلا', nameEn: 'Dongola', stations: [] },
    ]);
    expect(out).toEqual([{ id: 's1', nameAr: 'الميناء البري', nameEn: 'Mina', isActive: true, city: { id: 'c1', code: 'KRT', nameAr: 'الخرطوم', nameEn: 'Khartoum' } }]);
  });

  it('merges vehicle amenities into the standard catalog (server names win, no duplicates)', () => {
    const merged = mergeAmenityCatalog(STANDARD_AMENITIES, [
      {
        amenities: [
          { code: 'ac', nameAr: 'مكيّف', nameEn: 'AC', icon: 'ac_unit', value: null },
          { code: 'blanket', nameAr: 'بطانية', nameEn: 'Blanket', icon: 'bed', value: null },
        ],
      },
    ]);
    expect(merged.filter((a) => a.code === 'ac')).toEqual([{ code: 'ac', nameAr: 'مكيّف', icon: 'ac_unit' }]);
    expect(merged.map((a) => a.code)).toContain('blanket');
    expect(merged).toHaveLength(STANDARD_AMENITIES.length + 1);
  });

  it('computes occupancy', () => {
    expect(occupancyPercent(1, 28)).toBe(4);
    expect(occupancyPercent(28, 28)).toBe(100);
    expect(occupancyPercent(0, 0)).toBe(0);
  });

  it('sends only changed staff flags', () => {
    const cur = { canManageFleet: true, canManageSchedule: false, canViewFinance: false, canManageStaff: false };
    expect(changedFlags(cur, { ...cur })).toEqual({});
    expect(changedFlags(cur, { ...cur, canManageFleet: false, canViewFinance: true })).toEqual({ canManageFleet: false, canViewFinance: true });
  });
});
