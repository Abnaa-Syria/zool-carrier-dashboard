import type { CarrierPermission } from '../../features/auth/permissions';

export interface NavItem {
  name: string;
  path: string;
  icon: string;
  /** Hidden unless the employee passes `can(permission)` (the API enforces it as well). */
  permission?: CarrierPermission;
  /** Kept for the shell banner; every carrier page is live. */
  data: 'live' | 'mock';
  badge?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'error' | 'secondary';
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Everyone sees the dashboard, trips (read), routes, fleet (read), bookings, tracking and brokers;
 * finance and staff pages need their permission. Write actions inside pages check `can()` too.
 */
export const navigationConfig: NavSection[] = [
  {
    title: 'التشغيل',
    items: [
      { name: 'الرئيسية', path: '/home', icon: 'home', data: 'live' },
      { name: 'الرحلات', path: '/trips', icon: 'departure_board', data: 'live' },
      { name: 'المسارات', path: '/routes', icon: 'route', data: 'live' },
      { name: 'الحجوزات', path: '/bookings', icon: 'confirmation_number', data: 'live' },
      { name: 'التتبع المباشر', path: '/tracking', icon: 'share_location', data: 'live' },
    ],
  },
  {
    title: 'الأسطول',
    items: [
      { name: 'الحافلات', path: '/vehicles', icon: 'directions_bus', data: 'live' },
      { name: 'السائقون', path: '/drivers', icon: 'badge', data: 'live' },
    ],
  },
  {
    title: 'المالية',
    items: [
      { name: 'التقارير', path: '/reports', icon: 'bar_chart', permission: 'carrier.finance', data: 'live' },
      { name: 'التسويات', path: '/settlements', icon: 'account_balance', permission: 'carrier.finance', data: 'live' },
    ],
  },
  {
    title: 'الشركة',
    items: [
      { name: 'الوكلاء', path: '/brokers', icon: 'storefront', data: 'live' },
      { name: 'الموظفون', path: '/staff', icon: 'group', permission: 'carrier.staff', data: 'live' },
    ],
  },
];

/** Nav item that owns a pathname (longest prefix wins). */
export function findNavItem(pathname: string, sections: NavSection[] = navigationConfig): NavItem | undefined {
  let best: NavItem | undefined;
  for (const section of sections) {
    for (const item of section.items) {
      const owns = pathname === item.path || pathname.startsWith(`${item.path}/`);
      if (owns && (!best || item.path.length > best.path.length)) best = item;
    }
  }
  return best;
}
