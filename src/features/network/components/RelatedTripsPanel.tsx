import * as React from 'react';
import { Link } from 'react-router-dom';
import { Pager, Panel, SectionTitle, TableShell, Td, Th } from '../../../components/shared/common';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState, ErrorState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { errorMessage } from '../../../lib/api/errors';
import { formatDateTime } from '../../../lib/dates';
import { formatSdg } from '../../../lib/money';
import { usePageReset } from '../../../lib/usePageReset';
import { TRIP_STATUS_LABEL, TRIP_STATUS_VARIANT, useTrips, type TripStatus } from '../api';
import { selectClass } from './fields';

const PAGE_SIZE = 10;

type Scope = { driverId: string } | { vehicleId: string } | { routeId: string };

/**
 * Trips of one driver / vehicle / route (GET /carrier/trips?driverId|vehicleId|routeId) with a
 * status filter and paging. The column that repeats the scope is hidden.
 */
export const RelatedTripsPanel: React.FC<{ scope: Scope; title?: string; emptyText?: string }> = ({ scope, title = 'الرحلات', emptyText }) => {
  const [status, setStatus] = React.useState<TripStatus | ''>('');
  const [page, setPage] = usePageReset(status);
  const trips = useTrips({ page, pageSize: PAGE_SIZE, status: status || undefined, ...scope });
  const rows = trips.data?.data ?? [];
  const meta = trips.data?.meta;
  const hide = { vehicle: 'vehicleId' in scope, driver: 'driverId' in scope, route: 'routeId' in scope };

  return (
    <Panel>
      <SectionTitle title={title}>
        <div className="flex items-center gap-2">
          <select aria-label="حالة الرحلة" value={status} onChange={(e) => setStatus(e.target.value as TripStatus | '')} className={selectClass}>
            <option value="">كل الحالات</option>
            {(Object.keys(TRIP_STATUS_LABEL) as TripStatus[]).map((s) => (
              <option key={s} value={s}>{TRIP_STATUS_LABEL[s]}</option>
            ))}
          </select>
          {meta && <span className="text-xs text-on-surface-variant">{meta.total.toLocaleString('en-US')} رحلة</span>}
        </div>
      </SectionTitle>
      {trips.isLoading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : trips.isError ? (
        <ErrorState title="تعذّر تحميل الرحلات" message={errorMessage(trips.error)} onRetry={() => trips.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title={status ? 'لا توجد رحلات بهذه الحالة' : 'لا توجد رحلات'} description={emptyText} icon="departure_board" />
      ) : (
        <TableShell
          head={
            <>
              <Th>رقم الرحلة</Th>
              {!hide.route && <Th>المسار</Th>}
              <Th>المغادرة</Th>
              {!hide.vehicle && <Th>الحافلة</Th>}
              {!hide.driver && <Th>السائق</Th>}
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
              {!hide.route && (
                <Td>
                  {t.route ? <Link to={`/routes/${t.route.id}`} className="hover:text-secondary">{t.origin} ← {t.destination}</Link> : `${t.origin} ← ${t.destination}`}
                </Td>
              )}
              <Td className="text-on-surface-variant whitespace-nowrap">{formatDateTime(t.departureAt)}</Td>
              {!hide.vehicle && (
                <Td>{t.vehicle ? <Link to={`/vehicles/${t.vehicle.id}`} className="text-secondary">{t.vehicle.plateNumber}</Link> : '—'}</Td>
              )}
              {!hide.driver && (
                <Td>
                  {t.driver ? (
                    <Link to={`/drivers/${t.driver.id}`} className="text-secondary">{t.driver.displayName}</Link>
                  ) : (
                    <span className="text-on-surface-variant">غير معيّن</span>
                  )}
                </Td>
              )}
              <Td className="tabular-nums whitespace-nowrap">{formatSdg(t.basePrice)}</Td>
              <Td className="tabular-nums">{t.seats.sold} / {t.seats.total}</Td>
              <Td>
                <Badge variant={TRIP_STATUS_VARIANT[t.status]} dot>{TRIP_STATUS_LABEL[t.status]}</Badge>
              </Td>
            </tr>
          ))}
        </TableShell>
      )}
      <Pager meta={meta} busy={trips.isFetching} onPage={setPage} />
    </Panel>
  );
};
