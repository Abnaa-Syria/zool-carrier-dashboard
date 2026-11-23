import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { BookingChannel, BookingStatus, PaymentMethod, PaymentStatus } from './labels';

/** GET /carrier/bookings row (backend bookings `toBookingDto`). */
export type CarrierBooking = {
  id: string;
  status: BookingStatus;
  bookingRef: string;
  channel: BookingChannel;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  officeId: string | null;
  office: { id: string; code?: string; name: string } | null;
  customerId: string | null;
  customer: { id: string; displayName: string | null; phone: string | null } | null;
  employee: { id: string; displayName: string } | null;
  trip: { id: string; origin: string; destination: string; departureAt: string; company: { id: string; name: string } };
  totalAmountMinor: number;
  commissionAmountMinor: number;
  commissionStatus: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  passengers: Array<{ id: string; fullName: string; phone: string | null; idNumber: string | null; gender: 'MALE' | 'FEMALE' | null }>;
  replacedByBookingId: string | null;
  replacesBookingId: string | null;
  changeCount: number;
  groupId: string | null;
  leg: 'OUTBOUND' | 'RETURN' | null;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
    seatId: string;
    seatLabel: string;
    passengerId: string;
    passengerName: string;
    boardingStatus: 'PENDING' | 'BOARDED' | 'NO_SHOW';
    qrPayload: string | null;
  }>;
};

/** `from` / `to` are Sudan days applied to the confirmation time. */
export type BookingFilters = { page: number; pageSize: number; status?: BookingStatus; from?: string; to?: string; q?: string };

export function useBookings(filters: BookingFilters) {
  return useQuery({
    queryKey: ['carrier-bookings', filters],
    queryFn: ({ signal }) => api.get<CarrierBooking[]>('/carrier/bookings', filters, signal),
    placeholderData: keepPreviousData,
  });
}

/** The booking whose id or reference equals `key` exactly (the list search is a `contains` match; pure, unit-tested). */
export function findBooking<T extends Pick<CarrierBooking, 'id' | 'bookingRef'>>(rows: T[], key: string): T | null {
  const k = key.trim();
  return rows.find((b) => b.id === k) ?? rows.find((b) => b.bookingRef.toUpperCase() === k.toUpperCase()) ?? null;
}

/**
 * One booking by id (GET /carrier/bookings/:id) or, for a booking reference, by searching
 * GET /carrier/bookings?q=<key> and keeping the exact match.
 */
export function useBooking(key: string | undefined) {
  return useQuery({
    queryKey: ['carrier-bookings', 'one', key ?? ''],
    queryFn: async ({ signal }) => {
      if (!/^BK-/i.test(key!)) {
        const direct = await api.get<CarrierBooking>(`/carrier/bookings/${encodeURIComponent(key!)}`, undefined, signal).catch(() => null);
        if (direct) return direct.data;
      }
      const res = await api.get<CarrierBooking[]>('/carrier/bookings', { q: key, page: 1, pageSize: 50 }, signal);
      return findBooking(res.data, key!);
    },
    enabled: Boolean(key),
  });
}
