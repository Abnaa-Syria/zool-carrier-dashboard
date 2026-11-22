/**
 * Carrier-portal permissions (D-CARRIER-PORTAL-01), mirroring backend
 * `src/shared/constants/carrier-permissions.ts`. Pure functions, unit-tested.
 *
 * Every employee can view the dashboard, trips (read), bookings, manifests, tracking and brokers.
 */
export const CARRIER_PERMISSIONS = ['carrier.fleet', 'carrier.schedule', 'carrier.finance', 'carrier.staff'] as const;
export type CarrierPermission = (typeof CARRIER_PERMISSIONS)[number];

export type StaffFlags = {
  canManageFleet: boolean;
  canManageSchedule: boolean;
  canViewFinance: boolean;
  canManageStaff: boolean;
};

export const PERMISSION_FLAG: Record<CarrierPermission, keyof StaffFlags> = {
  'carrier.fleet': 'canManageFleet',
  'carrier.schedule': 'canManageSchedule',
  'carrier.finance': 'canViewFinance',
  'carrier.staff': 'canManageStaff',
};

export const PERMISSION_LABEL: Record<CarrierPermission, { title: string; description: string }> = {
  'carrier.fleet': { title: 'إدارة الأسطول', description: 'إضافة وتعديل الحافلات وتخطيط المقاعد والسائقين.' },
  'carrier.schedule': { title: 'الجدولة والتسعير', description: 'المسارات، جدولة الرحلات، تغيير الحافلة/السائق والسعر، وإلغاء الرحلات.' },
  'carrier.finance': { title: 'المالية', description: 'التقارير المالية، النقد لدى السائقين، والتسويات.' },
  'carrier.staff': { title: 'إدارة الموظفين', description: 'إضافة موظفين وتعديل صلاحياتهم أو إيقافهم.' },
};

/** Same rule as the API: managers hold every permission, staff only their flags. */
export function permissionsFor(e: StaffFlags & { role: 'MANAGER' | 'STAFF' }): CarrierPermission[] {
  if (e.role === 'MANAGER') return [...CARRIER_PERMISSIONS];
  return CARRIER_PERMISSIONS.filter((p) => e[PERMISSION_FLAG[p]]);
}

/** `can()` over the permission list returned by the API (`employee.permissions`). */
export function hasPermission(permissions: readonly string[] | undefined, permission: string | undefined): boolean {
  if (!permission) return true;
  return Boolean(permissions?.includes(permission));
}

type Gated = { permission?: string };

/** Keeps only the nav items the employee may open, and drops sections left empty. */
export function filterNavSections<S extends { items: Gated[] }>(sections: S[], can: (permission: string) => boolean): S[] {
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => !item.permission || can(item.permission)) }))
    .filter((section) => section.items.length > 0);
}
