import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';

/** GET /carrier/dashboard (backend `CarrierPortalService.dashboard`). "Today" is the Sudan day. */
export type CarrierDashboard = {
  date: string;
  kpis: {
    tripsToday: number;
    liveTrips: number;
    seatsSoldForToday: number;
    bookingsConfirmedToday: number;
    salesConfirmedTodayMinor: number;
    activeDrivers: number;
    /** Vehicle count per status (ACTIVE / MAINTENANCE / RETIRED); missing = 0. */
    vehicles: Partial<Record<'ACTIVE' | 'MAINTENANCE' | 'RETIRED', number>>;
  };
  nextTrips: Array<{
    id: string;
    tripNumber: string | null;
    origin: string;
    destination: string;
    departureAt: string;
    seatsTotal: number;
    seatsSold: number;
  }>;
  currency: 'SDG';
};

export function useCarrierDashboard() {
  return useQuery({
    queryKey: ['carrier-dashboard'],
    queryFn: ({ signal }) => api.get<CarrierDashboard>('/carrier/dashboard', undefined, signal).then((r) => r.data),
    refetchInterval: 60_000,
  });
}

/** Occupancy of a trip as a whole percent (0 when the trip has no seats). */
export function occupancyPercent(sold: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((sold / total) * 100);
}
