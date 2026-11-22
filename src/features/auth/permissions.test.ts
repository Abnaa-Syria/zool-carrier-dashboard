import { describe, expect, it } from 'vitest';
import { navigationConfig, findNavItem } from '../../app/shell/navigationConfig';
import { CARRIER_PERMISSIONS, filterNavSections, hasPermission, permissionsFor } from './permissions';

const none = { canManageFleet: false, canManageSchedule: false, canViewFinance: false, canManageStaff: false };

describe('carrier permissions', () => {
  it('managers hold every permission regardless of flags (same rule as the API)', () => {
    expect(permissionsFor({ ...none, role: 'MANAGER' })).toEqual([...CARRIER_PERMISSIONS]);
  });

  it('staff hold only their flags, in a stable order', () => {
    expect(permissionsFor({ ...none, role: 'STAFF' })).toEqual([]);
    expect(permissionsFor({ ...none, canViewFinance: true, canManageFleet: true, role: 'STAFF' })).toEqual(['carrier.fleet', 'carrier.finance']);
  });

  it('hasPermission treats a missing permission as public', () => {
    expect(hasPermission(['carrier.fleet'], 'carrier.fleet')).toBe(true);
    expect(hasPermission(['carrier.fleet'], 'carrier.finance')).toBe(false);
    expect(hasPermission(undefined, 'carrier.fleet')).toBe(false);
    expect(hasPermission(undefined, undefined)).toBe(true);
  });
});

describe('navigation filtering', () => {
  const paths = (perms: string[]) => filterNavSections(navigationConfig, (p) => hasPermission(perms, p)).flatMap((s) => s.items.map((i) => i.path));

  it('a view-only employee sees operations, fleet (read) and brokers but not finance or staff', () => {
    const visible = paths([]);
    expect(visible).toEqual(expect.arrayContaining(['/home', '/trips', '/routes', '/bookings', '/tracking', '/vehicles', '/drivers', '/brokers']));
    expect(visible).not.toContain('/reports');
    expect(visible).not.toContain('/settlements');
    expect(visible).not.toContain('/staff');
  });

  it('drops a section whose items are all hidden', () => {
    const sections = filterNavSections(navigationConfig, () => false);
    expect(sections.map((s) => s.title)).not.toContain('المالية');
  });

  it('finance and staff permissions reveal their pages', () => {
    expect(paths(['carrier.finance'])).toEqual(expect.arrayContaining(['/reports', '/settlements']));
    expect(paths(['carrier.staff'])).toContain('/staff');
    expect(paths([...CARRIER_PERMISSIONS])).toHaveLength(navigationConfig.flatMap((s) => s.items).length);
  });

  it('finds the nav item owning a nested path', () => {
    expect(findNavItem('/trips/abc')?.path).toBe('/trips');
    expect(findNavItem('/settlements/x')?.path).toBe('/settlements');
    expect(findNavItem('/tripsx')).toBeUndefined();
  });
});
