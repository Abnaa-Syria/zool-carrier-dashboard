import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { LayoutInput, SeatLayout } from './seatLayout';

export type VehicleStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
export type ServiceClass = 'STANDARD' | 'VIP';
export type DriverStatus = 'ACTIVE' | 'SUSPENDED';

export type CompanyRef = { id: string; key: string; name: string };

/** GET /carrier/vehicles row and GET /carrier/vehicles/:id (backend fleet.service `toVehicleDto`). */
export type Vehicle = {
  id: string;
  company: CompanyRef;
  plateNumber: string;
  model: string;
  capacity: number;
  serviceClass: ServiceClass;
  status: VehicleStatus;
  seatLayout: SeatLayout;
  amenities: Array<{ code: string; nameAr: string; nameEn: string; icon: string; value: string | null }>;
  createdAt: string;
  updatedAt: string;
};

/** `toDriverDto` */
export type Driver = {
  id: string;
  company: CompanyRef;
  driverCode: string;
  displayName: string;
  phone: string | null;
  avatarUrl: string | null;
  licenseNumber: string | null;
  /** YYYY-MM-DD */
  licenseExpiry: string | null;
  status: DriverStatus;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AmenityInput = { code: string; value?: string };

export type VehicleFilters = { page?: number; pageSize?: number; status?: VehicleStatus; q?: string };
export type DriverFilters = { page?: number; pageSize?: number; status?: DriverStatus; q?: string };

/** POST /carrier/vehicles — the company comes from the session. */
export type CreateVehicleInput = {
  plateNumber: string;
  model: string;
  serviceClass?: ServiceClass;
  layout: LayoutInput;
  amenities?: AmenityInput[];
};
export type VehiclePatch = Partial<{
  model: string;
  serviceClass: ServiceClass;
  status: VehicleStatus;
  layout: LayoutInput;
  amenities: AmenityInput[];
}>;

/** POST /carrier/drivers — the company comes from the session. */
export type CreateDriverInput = {
  displayName: string;
  phone: string;
  driverCode?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
};
export type DriverPatch = Partial<{
  displayName: string;
  phone: string;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  status: DriverStatus;
}>;

export const fleetKeys = {
  all: ['carrier-fleet'] as const,
  vehicles: (f: VehicleFilters) => [...fleetKeys.all, 'vehicles', f] as const,
  vehicle: (id: string) => [...fleetKeys.all, 'vehicle', id] as const,
  drivers: (f: DriverFilters) => [...fleetKeys.all, 'drivers', f] as const,
};

export function useVehicles(filters: VehicleFilters) {
  return useQuery({
    queryKey: fleetKeys.vehicles(filters),
    queryFn: ({ signal }) => api.get<Vehicle[]>('/carrier/vehicles', filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: fleetKeys.vehicle(id ?? ''),
    queryFn: ({ signal }) => api.get<Vehicle>(`/carrier/vehicles/${id}`, undefined, signal).then((r) => r.data),
    enabled: Boolean(id),
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => api.post<Vehicle>('/carrier/vehicles', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fleetKeys.all }),
  });
}

export function useUpdateVehicle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: VehiclePatch) => api.patch<Vehicle>(`/carrier/vehicles/${id}`, patch).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(fleetKeys.vehicle(id), data);
      return qc.invalidateQueries({ queryKey: fleetKeys.all });
    },
  });
}

export function useDrivers(filters: DriverFilters) {
  return useQuery({
    queryKey: fleetKeys.drivers(filters),
    queryFn: ({ signal }) => api.get<Driver[]>('/carrier/drivers', filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDriverInput) => api.post<Driver>('/carrier/drivers', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fleetKeys.all }),
  });
}

/** Phone change or suspension revokes the driver's sessions server-side. */
export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; patch: DriverPatch }) => api.patch<Driver>(`/carrier/drivers/${v.id}`, v.patch).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: fleetKeys.all }),
  });
}

export const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = { ACTIVE: 'نشطة', MAINTENANCE: 'صيانة', RETIRED: 'خارج الخدمة' };
export const VEHICLE_STATUS_VARIANT: Record<VehicleStatus, 'success' | 'warning' | 'neutral'> = {
  ACTIVE: 'success',
  MAINTENANCE: 'warning',
  RETIRED: 'neutral',
};
export const SERVICE_CLASS_LABEL: Record<ServiceClass, string> = { STANDARD: 'عادية', VIP: 'VIP' };
export const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = { ACTIVE: 'نشط', SUSPENDED: 'موقوف' };

// ---------------- Amenity catalog

export type AmenityOption = { code: string; nameAr: string; icon: string };

/** Platform standard amenities (backend seed `AMENITIES`). */
export const STANDARD_AMENITIES: AmenityOption[] = [
  { code: 'wifi', nameAr: 'واي فاي', icon: 'wifi' },
  { code: 'usb', nameAr: 'شحن USB', icon: 'usb' },
  { code: 'ac', nameAr: 'تكييف', icon: 'ac_unit' },
  { code: 'snack', nameAr: 'وجبة خفيفة', icon: 'restaurant' },
  { code: 'wc', nameAr: 'دورة مياه', icon: 'wc' },
  { code: 'tv', nameAr: 'شاشات', icon: 'tv' },
  { code: 'vip_seats', nameAr: 'مقاعد VIP', icon: 'event_seat' },
  { code: 'luggage', nameAr: 'أمتعة', icon: 'luggage' },
];

/** Standard amenities + any used on the company's vehicles (their server names win). Pure, unit-tested. */
export function mergeAmenityCatalog(standard: AmenityOption[], vehicles: Pick<Vehicle, 'amenities'>[]): AmenityOption[] {
  const out = new Map(standard.map((a) => [a.code, a]));
  for (const v of vehicles) for (const a of v.amenities) out.set(a.code, { code: a.code, nameAr: a.nameAr, icon: a.icon });
  return [...out.values()];
}

/** Platform amenity catalog (`GET /carrier/amenities`); falls back to the standard list if it fails. */
export function useAmenityCatalog() {
  return useQuery({
    queryKey: [...fleetKeys.all, 'amenity-catalog'] as const,
    queryFn: async ({ signal }) => {
      const res = await api.get<AmenityOption[]>('/carrier/amenities', undefined, signal).catch(() => ({ data: STANDARD_AMENITIES }));
      return res.data.length > 0 ? res.data : STANDARD_AMENITIES;
    },
    staleTime: 5 * 60_000,
  });
}
