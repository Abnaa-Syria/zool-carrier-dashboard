import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../../lib/api/client';

// ---------------- DTOs (backend src/modules/network/network.service.ts)

export type CityLite = { id: string; code: string; nameAr: string; nameEn: string };
export type StationLite = { id: string; nameAr: string; nameEn: string; city: CityLite };
export type CompanyLite = { id: string; key: string; name: string };

export type RouteStop = { sequence: number; station: StationLite; offsetMinutes: number; dwellMinutes: number };

/** GET /carrier/routes row, GET/POST/PATCH /carrier/routes/:id */
export type RouteDto = {
  id: string;
  code: string | null;
  company: CompanyLite;
  originStation: StationLite;
  destinationStation: StationLite;
  durationMinutes: number;
  isActive: boolean;
  stops: RouteStop[];
  createdAt: string;
};

export type StopInput = { stationId: string; offsetMinutes: number; dwellMinutes?: number };

/** POST /carrier/routes — the company comes from the session. */
export type CreateRouteInput = {
  code?: string;
  originStationId: string;
  destinationStationId: string;
  durationMinutes: number;
  stops?: StopInput[];
};

/** Only these fields are editable after creation (backend `patchRouteSchema`). */
export type PatchRouteInput = Partial<{ durationMinutes: number; isActive: boolean; stops: StopInput[] }>;

export type TripStatus = 'SCHEDULED' | 'BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type SeatStatus = 'FREE' | 'HELD' | 'SOLD';
export type ServiceClass = 'STANDARD' | 'VIP';

export type TripSeat = { seatLabel: string; status: SeatStatus; layoutRow: number | null; layoutColumn: number | null; isWomenOnly: boolean };
export type SeatCounts = { total: number; free: number; held: number; sold: number };

/** GET /carrier/trips/:id — structured trip (`toScheduledTripDto`). */
export type ScheduledTrip = {
  id: string;
  tripNumber: string | null;
  status: TripStatus;
  company: CompanyLite;
  route: { id: string; code: string | null } | null;
  origin: string;
  destination: string;
  originStation: StationLite | null;
  destinationStation: StationLite | null;
  departureAt: string;
  arrivalAt: string | null;
  durationMinutes: number | null;
  basePriceMinor: number;
  currency: 'SDG';
  serviceClass: ServiceClass;
  isActive: boolean;
  vehicle: { id: string; plateNumber: string; model: string; capacity: number; aisleAfterColumn?: number } | null;
  driver: { id: string; driverCode: string; displayName: string } | null;
  stops: Array<{
    sequence: number;
    station: StationLite;
    scheduledArrivalAt: string | null;
    scheduledDepartureAt: string | null;
    actualArrivalAt: string | null;
  }>;
  seatCounts: SeatCounts;
  seats: TripSeat[];
};

/** GET /carrier/trips row (`toAdminTripDto`): legacy fields + structured trip fields. */
export type CatalogTrip = {
  id: string;
  tripNumber: string | null;
  status: TripStatus;
  serviceClass: 'STANDARD' | 'VIP';
  arrivalAt: string | null;
  route: { id: string; code: string | null } | null;
  vehicle: { id: string; plateNumber: string; model: string } | null;
  driver: { id: string; driverCode: string; displayName: string } | null;
  company: CompanyLite;
  origin: string;
  destination: string;
  departureAt: string;
  basePrice: number;
  isActive: boolean;
  seats: SeatCounts;
  createdAt: string;
};

export type ScheduleTripsInput = {
  routeId: string;
  vehicleId: string;
  driverId?: string;
  departures: string[];
  basePrice: number;
  serviceClass?: ServiceClass;
};

export type CancelTripResult = {
  trip: ScheduledTrip;
  refundedBookings: number;
  refundedAmountMinor: number;
  failed: Array<{ bookingId: string; code: string; message: string }>;
};

/** `details` of VEHICLE_BUSY / DRIVER_BUSY (overlapping trips, max 5). */
export type BusyTrip = { id: string; tripNumber: string | null; departureAt: string; arrivalAt: string | null };

export function busyTrips(error: unknown): BusyTrip[] {
  if (!(error instanceof ApiError) || (error.code !== 'VEHICLE_BUSY' && error.code !== 'DRIVER_BUSY')) return [];
  const details = error.details as { trips?: BusyTrip[] } | undefined;
  return Array.isArray(details?.trips) ? details.trips : [];
}

/** VEHICLE_BUSY raised by two departures of the same request (`details.departure`). */
export function selfBusyDeparture(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== 'VEHICLE_BUSY') return null;
  const details = error.details as { departure?: string } | undefined;
  return typeof details?.departure === 'string' ? details.departure : null;
}

// ---------------- Lookup lists

export type StationOption = StationLite & { isActive: boolean };
export type VehicleOption = {
  id: string;
  company: CompanyLite;
  plateNumber: string;
  model: string;
  capacity: number;
  serviceClass: ServiceClass;
  status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
  seatLayout?: { rows: number; columns: number; aisleAfterColumn: number; driverSide: 'LEFT' | 'RIGHT' };
};
export type DriverOption = { id: string; company: CompanyLite; driverCode: string; displayName: string; status: 'ACTIVE' | 'SUSPENDED' };

type Query = Record<string, string | number | boolean | undefined>;

/** Follows pagination (pageSize 100) up to `maxPages`; lookup lists are small. */
async function fetchAll<T>(path: string, query: Query, signal?: AbortSignal, maxPages = 10): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await api.get<T[]>(path, { ...query, page, pageSize: 100 }, signal);
    out.push(...res.data);
    if (!res.meta || page >= res.meta.totalPages) break;
  }
  return out;
}

export const networkKeys = {
  all: ['carrier-network'] as const,
  routes: (f: RouteFilters) => [...networkKeys.all, 'routes', f] as const,
  allRoutes: () => [...networkKeys.all, 'routes-all'] as const,
  route: (id: string) => [...networkKeys.all, 'route', id] as const,
  trips: (f: TripFilters) => [...networkKeys.all, 'trips', f] as const,
  trip: (id: string) => [...networkKeys.all, 'trip', id] as const,
  manifest: (id: string) => [...networkKeys.all, 'manifest', id] as const,
  stations: () => [...networkKeys.all, 'lookup', 'stations'] as const,
  vehicles: () => [...networkKeys.all, 'lookup', 'vehicles'] as const,
  vehicle: (id: string) => [...networkKeys.all, 'lookup', 'vehicle', id] as const,
  drivers: () => [...networkKeys.all, 'lookup', 'drivers'] as const,
};

/** GET /public/cities row (cities with their active stations). */
export type PublicCity = { id: string; code: string; nameAr: string; nameEn: string; stations: Array<{ id: string; nameAr: string; nameEn: string }> };

/** Flattens public cities into station options (pure; unit-tested). */
export function stationsFromCities(cities: PublicCity[]): StationOption[] {
  return cities.flatMap((c) =>
    c.stations.map((s) => ({ id: s.id, nameAr: s.nameAr, nameEn: s.nameEn, isActive: true, city: { id: c.id, code: c.code, nameAr: c.nameAr, nameEn: c.nameEn } })),
  );
}

/** Active stations. The carrier API has no stations endpoint; the public city list includes them. */
export function useStationOptions(enabled = true) {
  return useQuery({
    queryKey: networkKeys.stations(),
    queryFn: ({ signal }) => api.get<PublicCity[]>('/public/cities', undefined, signal).then((r) => stationsFromCities(r.data)),
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Active vehicles of the company. */
export function useVehicleOptions(enabled = true) {
  return useQuery({
    queryKey: networkKeys.vehicles(),
    queryFn: ({ signal }) => fetchAll<VehicleOption>('/carrier/vehicles', { status: 'ACTIVE' }, signal),
    enabled,
    staleTime: 60_000,
  });
}

/** One vehicle (for the seat-map aisle position). */
export function useVehicle(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: networkKeys.vehicle(id ?? ''),
    queryFn: ({ signal }) => api.get<VehicleOption>(`/carrier/vehicles/${id}`, undefined, signal).then((r) => r.data),
    enabled: Boolean(id) && enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Active drivers of the company. */
export function useDriverOptions(enabled = true) {
  return useQuery({
    queryKey: networkKeys.drivers(),
    queryFn: ({ signal }) => fetchAll<DriverOption>('/carrier/drivers', { status: 'ACTIVE' }, signal),
    enabled,
    staleTime: 60_000,
  });
}

// ---------------- Routes

export type RouteFilters = { page: number; pageSize: number; stationId?: string; isActive?: 'true' | 'false' };

export function useRoutes(filters: RouteFilters) {
  return useQuery({
    queryKey: networkKeys.routes(filters),
    queryFn: ({ signal }) => api.get<RouteDto[]>('/carrier/routes', filters, signal),
    placeholderData: keepPreviousData,
  });
}

/** Active routes (for the scheduling picker). */
export function useActiveRoutes(enabled = true) {
  return useQuery({
    queryKey: networkKeys.allRoutes(),
    queryFn: ({ signal }) => fetchAll<RouteDto>('/carrier/routes', { isActive: 'true' }, signal),
    enabled,
  });
}

/** GET /carrier/routes/:id (company-scoped). */
export function useRoute(id: string | undefined) {
  return useQuery({
    queryKey: networkKeys.route(id ?? ''),
    queryFn: ({ signal }) => api.get<RouteDto>(`/carrier/routes/${id}`, undefined, signal).then((r) => r.data),
    enabled: Boolean(id),
  });
}

export type RoutePoint = {
  key: string;
  kind: 'origin' | 'stop' | 'destination';
  station: StationLite;
  /** Minutes after departure (arrival at the point; 0 at the origin). */
  arriveOffset: number;
  /** Minutes after departure the bus leaves the point (null at the destination). */
  departOffset: number | null;
  dwellMinutes: number;
};

/** Origin → stops (by sequence) → destination with their offsets (pure, unit-tested). */
export function routeTimeline(route: Pick<RouteDto, 'originStation' | 'destinationStation' | 'durationMinutes' | 'stops'>): RoutePoint[] {
  const stops = [...route.stops].sort((a, b) => a.sequence - b.sequence);
  return [
    { key: 'origin', kind: 'origin', station: route.originStation, arriveOffset: 0, departOffset: 0, dwellMinutes: 0 },
    ...stops.map((s) => ({
      key: `s${s.sequence}`,
      kind: 'stop' as const,
      station: s.station,
      arriveOffset: s.offsetMinutes,
      departOffset: s.offsetMinutes + s.dwellMinutes,
      dwellMinutes: s.dwellMinutes,
    })),
    { key: 'destination', kind: 'destination', station: route.destinationStation, arriveOffset: route.durationMinutes, departOffset: null, dwellMinutes: 0 },
  ];
}

export function useCreateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRouteInput) => api.post<RouteDto>('/carrier/routes', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: networkKeys.all }),
  });
}

export function useUpdateRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: PatchRouteInput }) => api.patch<RouteDto>(`/carrier/routes/${input.id}`, input.patch).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(networkKeys.route(data.id), data);
      return qc.invalidateQueries({ queryKey: networkKeys.all });
    },
  });
}

// ---------------- Trips

/** GET /carrier/trips filters (dates are Sudan days). */
export type TripFilters = {
  page: number;
  pageSize: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: TripStatus;
  routeId?: string;
  vehicleId?: string;
  driverId?: string;
  q?: string;
};

export function useTrips(filters: TripFilters) {
  return useQuery({
    queryKey: networkKeys.trips(filters),
    queryFn: ({ signal }) => api.get<CatalogTrip[]>('/carrier/trips', filters, signal),
    placeholderData: keepPreviousData,
  });
}

const fetchTrip = (id: string, signal?: AbortSignal) => api.get<ScheduledTrip>(`/carrier/trips/${id}`, undefined, signal).then((r) => r.data);

export function useTrip(id: string | undefined) {
  return useQuery({ queryKey: networkKeys.trip(id ?? ''), queryFn: ({ signal }) => fetchTrip(id!, signal), enabled: Boolean(id) });
}

export function useScheduleTrips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleTripsInput) => api.post<ScheduledTrip[]>('/carrier/trips/schedule', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: networkKeys.all }),
  });
}

export function useUpdateAssignment(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { vehicleId?: string; driverId?: string | null }) =>
      api.patch<ScheduledTrip>(`/carrier/trips/${tripId}/assignment`, patch).then((r) => r.data),
    onSuccess: (trip) => {
      qc.setQueryData(networkKeys.trip(tripId), trip);
      return qc.invalidateQueries({ queryKey: [...networkKeys.all, 'trips'] });
    },
  });
}

/** New price applies to new sales only; confirmed bookings keep what they paid. */
export function useUpdatePrice(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (basePriceMinor: number) => api.patch<ScheduledTrip>(`/carrier/trips/${tripId}/price`, { basePriceMinor }).then((r) => r.data),
    onSuccess: (trip) => {
      qc.setQueryData(networkKeys.trip(tripId), trip);
      return qc.invalidateQueries({ queryKey: [...networkKeys.all, 'trips'] });
    },
  });
}

/** Cancel the trip and refund every confirmed booking in full. */
export function useCancelScheduledTrip(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => api.post<CancelTripResult>(`/carrier/trips/${tripId}/cancel`, { reason }).then((r) => r.data),
    onSuccess: (res) => {
      qc.setQueryData(networkKeys.trip(tripId), res.trip);
      return Promise.all([
        qc.invalidateQueries({ queryKey: [...networkKeys.all, 'trips'] }),
        qc.invalidateQueries({ queryKey: networkKeys.manifest(tripId) }),
        qc.invalidateQueries({ queryKey: ['carrier-bookings'] }),
        qc.invalidateQueries({ queryKey: ['carrier-dashboard'] }),
      ]);
    },
  });
}

// ---------------- Manifest

export type BoardingStatus = 'PENDING' | 'BOARDED' | 'NO_SHOW';

/** GET /carrier/trips/:id/manifest (driver-app `manifestOf`). */
export type Manifest = {
  tripId: string;
  status: TripStatus;
  counts: { booked: number; boarded: number; pending: number; noShow: number };
  passengers: Array<{
    ticketNumber: string;
    seatLabel: string;
    isWomenOnlySeat: boolean;
    passenger: { fullName: string; phone: string | null; gender: 'MALE' | 'FEMALE' | null };
    ticketStatus: string;
    boardingStatus: BoardingStatus;
    boardingMethod: string | null;
    boardedAt: string | null;
    bookingRef: string;
    channel: 'DIRECT' | 'BROKER';
    /** Broker office name for broker sales. */
    soldBy: string | null;
    paymentMethod: string;
    fareMinor: number;
    cashToCollectMinor: number;
    cashCollectedMinor: number;
  }>;
};

export function useManifest(tripId: string | undefined) {
  return useQuery({
    queryKey: networkKeys.manifest(tripId ?? ''),
    queryFn: ({ signal }) => api.get<Manifest>(`/carrier/trips/${tripId}/manifest`, undefined, signal).then((r) => r.data),
    enabled: Boolean(tripId),
  });
}

export const BOARDING_LABEL: Record<BoardingStatus, string> = { PENDING: 'لم يصعد', BOARDED: 'صعد', NO_SHOW: 'لم يحضر' };
export const BOARDING_VARIANT: Record<BoardingStatus, 'neutral' | 'success' | 'error'> = { PENDING: 'neutral', BOARDED: 'success', NO_SHOW: 'error' };

// ---------------- Labels

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  SCHEDULED: 'مجدولة',
  BOARDING: 'صعود الركاب',
  IN_PROGRESS: 'في الطريق',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
};

export const TRIP_STATUS_VARIANT: Record<TripStatus, 'info' | 'warning' | 'success' | 'neutral' | 'error'> = {
  SCHEDULED: 'info',
  BOARDING: 'warning',
  IN_PROGRESS: 'success',
  COMPLETED: 'neutral',
  CANCELLED: 'error',
};

export const SERVICE_CLASS_LABEL: Record<ServiceClass, string> = { STANDARD: 'عادية', VIP: 'VIP' };

export function stationLabel(s: StationLite | null | undefined): string {
  return s ? `${s.city.nameAr} — ${s.nameAr}` : '—';
}


