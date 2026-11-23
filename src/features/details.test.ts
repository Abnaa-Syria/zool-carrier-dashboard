import { describe, expect, it } from 'vitest';
import { findBooking } from './bookings/api';
import { commissionMinor } from './brokers/api';
import { licenseStatus, VEHICLE_STATUS_TRANSITIONS } from './fleet/api';
import { routeTimeline, type StationLite } from './network/api';
import { accessPatch } from './staff/api';

const station = (id: string): StationLite => ({ id, nameAr: id, nameEn: id, city: { id: `c-${id}`, code: id, nameAr: id, nameEn: id } });
const NONE = { canManageFleet: false, canManageSchedule: false, canViewFinance: false, canManageStaff: false };

describe('detail page helpers', () => {
  it('classifies license expiry against a Sudan day', () => {
    expect(licenseStatus(null, '2026-11-23')).toEqual({ kind: 'none', daysLeft: null });
    expect(licenseStatus('2026-11-22', '2026-11-23')).toEqual({ kind: 'expired', daysLeft: -1 });
    expect(licenseStatus('2026-11-23', '2026-11-23')).toEqual({ kind: 'expiring', daysLeft: 0 });
    expect(licenseStatus('2026-12-23', '2026-11-23')).toEqual({ kind: 'expiring', daysLeft: 30 });
    expect(licenseStatus('2026-12-24', '2026-11-23')).toEqual({ kind: 'valid', daysLeft: 31 });
    expect(licenseStatus('not-a-date', '2026-11-23').kind).toBe('none');
  });

  it('offers only safe vehicle status changes (no self-transition)', () => {
    for (const [from, targets] of Object.entries(VEHICLE_STATUS_TRANSITIONS)) expect(targets).not.toContain(from);
    expect(VEHICLE_STATUS_TRANSITIONS.RETIRED).toEqual(['ACTIVE']);
  });

  it('builds the route timeline with stop offsets and dwell', () => {
    const points = routeTimeline({
      originStation: station('KRT'),
      destinationStation: station('PZU'),
      durationMinutes: 600,
      stops: [
        { sequence: 2, station: station('ATB'), offsetMinutes: 300, dwellMinutes: 20 },
        { sequence: 1, station: station('SHN'), offsetMinutes: 120, dwellMinutes: 10 },
      ],
    });
    expect(points.map((p) => [p.kind, p.station.id, p.arriveOffset, p.departOffset])).toEqual([
      ['origin', 'KRT', 0, 0],
      ['stop', 'SHN', 120, 130],
      ['stop', 'ATB', 300, 320],
      ['destination', 'PZU', 600, null],
    ]);
  });

  it('finds the exact booking among contains-matches by id or reference', () => {
    const rows = [
      { id: 'b-10', bookingRef: 'ZG-AB12' },
      { id: 'b-1', bookingRef: 'ZG-AB1' },
    ];
    expect(findBooking(rows, 'b-1')?.bookingRef).toBe('ZG-AB1');
    expect(findBooking(rows, 'zg-ab1')?.id).toBe('b-1');
    expect(findBooking(rows, 'ZG-AB')).toBeNull();
  });

  it('computes broker commission in minor units', () => {
    expect(commissionMinor(1_000_000, 5)).toBe(50_000);
    expect(commissionMinor(333, 2.5)).toBe(8);
    expect(commissionMinor(0, 10)).toBe(0);
  });

  it('sends only changed role / flags, and no flags for managers', () => {
    const staff = { role: 'STAFF' as const, flags: NONE };
    expect(accessPatch(staff, 'STAFF', NONE)).toEqual({});
    expect(accessPatch(staff, 'STAFF', { ...NONE, canViewFinance: true })).toEqual({ flags: { canViewFinance: true } });
    expect(accessPatch(staff, 'MANAGER', { ...NONE, canViewFinance: true })).toEqual({ role: 'MANAGER' });
    expect(accessPatch({ role: 'MANAGER', flags: NONE }, 'STAFF', { ...NONE, canManageFleet: true })).toEqual({ role: 'STAFF', flags: { canManageFleet: true } });
  });
});
