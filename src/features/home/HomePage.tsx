import * as React from 'react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../../components/ui/Card';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { errorMessage } from '../../lib/api/errors';
import { formatDateTime, formatLongDate } from '../../lib/dates';
import { formatSdg } from '../../lib/money';
import { cn } from '../../lib/utils';
import { useAuth } from '../auth/auth-context';
import { occupancyPercent, useCarrierDashboard } from './api';

const quickLink = 'flex items-center gap-2 rounded-xl border border-surface-container-high bg-surface-container-lowest px-4 py-3 hover:bg-surface-container';

/** Carrier home: today's KPIs (Sudan day), live trips, next departures and shortcuts. */
export const HomePage: React.FC = () => {
  const { employee, can } = useAuth();
  const dashboard = useCarrierDashboard();
  const d = dashboard.data;
  const k = d?.kpis;

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-lg">
      <div>
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">مرحبًا، {employee?.displayName}</h1>
        <p className="text-sm text-on-surface-variant">
          {employee?.company.name}
          {d && ` · ${formatLongDate(`${d.date}T12:00:00Z`)}`}
        </p>
      </div>

      {employee?.company.status === 'SUSPENDED' && (
        <div role="alert" className="rounded-lg border border-error/40 bg-error-container/40 px-space-md py-2 text-sm">
          الشركة موقوفة حاليًا من إدارة المنصة: بيع التذاكر متوقف. تواصل مع إدارة ZoolGo.
        </div>
      )}

      <section className="space-y-space-sm">
        <h2 className="font-bold text-on-surface">أداء اليوم</h2>
        {dashboard.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : dashboard.isError ? (
          <ErrorState title="تعذّر تحميل لوحة اليوم" message={errorMessage(dashboard.error)} onRetry={() => dashboard.refetch()} />
        ) : k ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
            <MetricCard title="رحلات اليوم" value={k.tripsToday.toLocaleString('en-US')} subValue="غير الملغاة" icon="departure_board" />
            <MetricCard
              title="رحلات على الطريق الآن"
              value={k.liveTrips.toLocaleString('en-US')}
              icon="share_location"
              iconBg={k.liveTrips > 0 ? 'bg-[#DCFCE7] text-[#15803D]' : undefined}
              footer={<Link to="/tracking" className="text-secondary font-semibold">فتح التتبع المباشر</Link>}
            />
            <MetricCard title="مقاعد مباعة لرحلات اليوم" value={k.seatsSoldForToday.toLocaleString('en-US')} icon="event_seat" />
            <MetricCard
              title="مبيعات مؤكدة اليوم"
              value={formatSdg(k.salesConfirmedTodayMinor)}
              subValue={`${k.bookingsConfirmedToday.toLocaleString('en-US')} حجز`}
              icon="payments"
            />
            <MetricCard
              title="الحافلات"
              value={(k.vehicles.ACTIVE ?? 0).toLocaleString('en-US')}
              subValue="نشطة"
              icon="directions_bus"
              footer={
                <span>
                  صيانة {k.vehicles.MAINTENANCE ?? 0} · خارج الخدمة {k.vehicles.RETIRED ?? 0}
                </span>
              }
            />
            <MetricCard title="السائقون النشطون" value={k.activeDrivers.toLocaleString('en-US')} icon="badge" />
          </div>
        ) : null}
      </section>

      <section className="space-y-space-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-on-surface">الرحلات القادمة</h2>
          <Link to="/trips" className="text-sm text-secondary">كل الرحلات</Link>
        </div>
        <div className="bg-surface-container-lowest border border-surface-container-high rounded-xl p-space-md">
          {dashboard.isLoading ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : dashboard.isError ? (
            <p className="text-sm text-on-surface-variant">—</p>
          ) : !d || d.nextTrips.length === 0 ? (
            <EmptyState title="لا توجد رحلات مجدولة قادمة" description="جدول رحلات جديدة من صفحة الرحلات." icon="event_busy" />
          ) : (
            <ul className="divide-y divide-surface-container">
              {d.nextTrips.map((t) => {
                const pct = occupancyPercent(t.seatsSold, t.seatsTotal);
                return (
                  <li key={t.id} className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 justify-between">
                    <div className="min-w-0">
                      <Link to={`/trips/${t.id}`} className="font-semibold text-on-surface hover:text-secondary">
                        {t.origin} ← {t.destination}
                      </Link>
                      <div className="text-xs text-on-surface-variant">
                        {formatDateTime(t.departureAt)}
                        {t.tripNumber && (
                          <span className="font-mono" dir="ltr">
                            {' '}· {t.tripNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs w-48">
                      <div className="h-1.5 flex-1 rounded-full bg-surface-container overflow-hidden" aria-label={`الإشغال ${pct}%`}>
                        <div className={cn('h-full rounded-full', pct >= 80 ? 'bg-[#15803D]' : 'bg-secondary')} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tabular-nums whitespace-nowrap">
                        {t.seatsSold}/{t.seatsTotal}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-space-sm">
        <h2 className="font-bold text-on-surface">الوصول السريع</h2>
        <div className="flex flex-wrap gap-space-sm">
          {can('carrier.schedule') && (
            <Link to="/trips" className={quickLink}>
              <span className="material-symbols-outlined">event_repeat</span> جدولة رحلات
            </Link>
          )}
          {can('carrier.fleet') && (
            <Link to="/vehicles/new" className={quickLink}>
              <span className="material-symbols-outlined">directions_bus</span> إضافة حافلة
            </Link>
          )}
          <Link to="/bookings" className={quickLink}>
            <span className="material-symbols-outlined">confirmation_number</span> الحجوزات
          </Link>
          {can('carrier.finance') && (
            <Link to="/reports" className={quickLink}>
              <span className="material-symbols-outlined">bar_chart</span> كشف الحساب
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};
