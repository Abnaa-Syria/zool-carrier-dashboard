import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { CarrierBooking } from '../bookings/api';

/** GET /carrier/brokers row: a broker office assigned to sell this company's trips. */
export type BrokerAssignment = {
  office: { id: string; code: string; name: string; status: 'ACTIVE' | 'SUSPENDED' | string };
  commissionPercent: number;
};

export function useBrokers() {
  return useQuery({
    queryKey: ['carrier-brokers'],
    queryFn: ({ signal }) => api.get<BrokerAssignment[]>('/carrier/brokers', undefined, signal).then((r) => r.data),
  });
}

/** Commission in minor units for a sale at `percent` (rounded to the nearest minor unit; pure, unit-tested). */
export function commissionMinor(amountMinor: number, percent: number): number {
  return Math.round((amountMinor * percent) / 100);
}

export const RECENT_BOOKINGS_WINDOW = 100;

/** The office's latest {@link RECENT_BOOKINGS_WINDOW} bookings on this company's trips (server-side office filter). */
export function useOfficeRecentBookings(officeId: string | undefined) {
  return useQuery({
    queryKey: ['carrier-bookings', 'office-recent', officeId ?? ''],
    queryFn: ({ signal }) =>
      api
        .get<CarrierBooking[]>('/carrier/bookings', { officeId, page: 1, pageSize: RECENT_BOOKINGS_WINDOW }, signal)
        .then((r) => r.data),
    enabled: Boolean(officeId),
  });
}
