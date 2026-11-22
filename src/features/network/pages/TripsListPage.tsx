import * as React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../../../app/shell/Breadcrumbs';
import { Pager, Panel, TableShell, Td, Th } from '../../../components/shared/common';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState } from '../../../components/ui/EmptyState';
import { SearchInput } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { errorMessage } from '../../../lib/api/errors';
import { formatDateTime } from '../../../lib/dates';
import { formatSdg } from '../../../lib/money';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { usePageReset } from '../../../lib/usePageReset';
import { useAuth } from '../../auth/auth-context';
import { TRIP_STATUS_LABEL, TRIP_STATUS_VARIANT, useActiveRoutes, useDriverOptions, useTrips, useVehicleOptions, type TripStatus } from '../api';
import { ScheduleTripsModal } from '../components/ScheduleTripsModal';
import { selectClass } from '../components/fields';

const PAGE_SIZE = 20;

/** `/trips` — the company's trips (GET /carrier/trips), filters in Sudan days. */
export const TripsListPage: React.FC = () => {
  const { can } = useAuth();
  const [search, setSearch] = React.useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = React.useState<TripStatus | ''>('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [routeId, setRouteId] = React.useState('');
  const [vehicleId, setVehicleId] = React.useState('');
  const [driverId, setDriverId] = React.useState('');
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [page, setPage] = usePageReset([q, status, dateFrom, dateTo, routeId, vehicleId, driverId].join('|'));

  const routes = useActiveRoutes();
  const vehicles = useVehicleOptions();
  const drivers = useDriverOptions();
  const trips = useTrips({
    page,
    pageSize: PAGE_SIZE,
    q: q || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    routeId: routeId || undefined,
    vehicleId: vehicleId || undefined,
    driverId: driverId || undefined,
  });
  const rows = trips.data?.data ?? [];
  const meta = trips.data?.meta;
  const filtered = Boolean(q || status || dateFrom || dateTo || routeId || vehicleId || driverId);
  const clear = () => {
    setSearch('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setRouteId('');
    setVehicleId('');
    setDriverId('');
  };

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'التشغيل' }, { label: 'الرحلات' }]} />
      <PageHeader
        title="الرحلات"
        subtitle="رحلات الشركة بتوقيت السودان. الجدولة تُنشئ رحلات من مسار وحافلة وسائق."
        className="mb-0"
        actions={can('carrier.schedule') ? <Button icon="event_repeat" onClick={() => setScheduleOpen(true)}>جدولة رحلات</Button> : null}
      />

      <div className="flex flex-wrap items-end gap-space-sm">
        <div className="w-full sm:w-64">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder="رقم الرحلة أو المدينة..." />
        </div>
        <select aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value as TripStatus | '')} className={selectClass}>
          <option value="">كل الحالات</option>
          {(Object.keys(TRIP_STATUS_LABEL) as TripStatus[]).map((s) => (
            <option key={s} value={s}>{TRIP_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-on-surface-variant">
          من
          <input type="date" aria-label="من يوم" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={selectClass} />
        </label>
        <label className="flex items-center gap-1 text-xs text-on-surface-variant">
          إلى
          <input type="date" aria-label="إلى يوم" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={selectClass} />
        </label>
        <select aria-label="المسار" value={routeId} onChange={(e) => setRouteId(e.target.value)} className={selectClass}>
          <option value="">كل المسارات</option>
          {(routes.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>{r.code ?? r.id.slice(-6)} — {r.originStation.city.nameAr} ← {r.destinationStation.city.nameAr}</option>
          ))}
        </select>
        <select aria-label="الحافلة" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className={selectClass}>
          <option value="">كل الحافلات</option>
          {(vehicles.data ?? []).map((v) => (
            <option key={v.id} value={v.id}>{v.plateNumber}</option>
          ))}
        </select>
        <select aria-label="السائق" value={driverId} onChange={(e) => setDriverId(e.target.value)} className={selectClass}>
          <option value="">كل السائقين</option>
          {(drivers.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>{d.displayName}</option>
          ))}
        </select>
        {filtered && <Button size="sm" variant="ghost" onClick={clear}>مسح</Button>}
        {meta && <span className="text-xs text-on-surface-variant">{meta.total.toLocaleString('en-US')} رحلة</span>}
      </div>

      <Panel>
        {trips.isLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : trips.isError ? (
          <ErrorState title="تعذّر تحميل الرحلات" message={errorMessage(trips.error)} onRetry={() => trips.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtered ? 'لا توجد نتائج مطابقة' : 'لا توجد رحلات بعد'}
            description={filtered ? 'غيّر عوامل التصفية.' : 'جدول رحلات من مسار نشط.'}
            icon="directions_bus"
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>رقم الرحلة</Th>
                <Th>المسار</Th>
                <Th>المغادرة</Th>
                <Th>الحافلة</Th>
                <Th>السائق</Th>
                <Th>السعر</Th>
                <Th>المباع / الإجمالي</Th>
                <Th>الحالة</Th>
              </>
            }
          >
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-surface-container hover:bg-surface-container/50">
                <Td>
                  <Link to={`/trips/${t.id}`} className="font-mono text-xs text-secondary font-semibold" dir="ltr">
                    {t.tripNumber ?? t.id.slice(-8).toUpperCase()}
                  </Link>
                </Td>
                <Td>
                  <div>{t.origin} ← {t.destination}</div>
                  {t.route?.code && <div className="text-xs text-on-surface-variant" dir="ltr">{t.route.code}</div>}
                </Td>
                <Td className="text-on-surface-variant whitespace-nowrap">{formatDateTime(t.departureAt)}</Td>
                <Td>{t.vehicle?.plateNumber ?? '—'}</Td>
                <Td>{t.driver?.displayName ?? <span className="text-on-surface-variant">غير معيّن</span>}</Td>
                <Td className="tabular-nums whitespace-nowrap">{formatSdg(t.basePrice)}</Td>
                <Td className="tabular-nums">
                  {t.seats.sold} / {t.seats.total}
                  {t.seats.held > 0 && <span className="text-[11px] text-on-surface-variant"> (+{t.seats.held} مؤقت)</span>}
                </Td>
                <Td>
                  <Badge variant={TRIP_STATUS_VARIANT[t.status]} dot>{TRIP_STATUS_LABEL[t.status]}</Badge>
                </Td>
              </tr>
            ))}
          </TableShell>
        )}
        <Pager meta={meta} busy={trips.isFetching} onPage={setPage} />
      </Panel>

      {scheduleOpen && <ScheduleTripsModal onClose={() => setScheduleOpen(false)} />}
    </div>
  );
};
