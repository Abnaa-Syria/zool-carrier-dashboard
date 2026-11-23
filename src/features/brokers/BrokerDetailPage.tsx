import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../app/shell/Breadcrumbs';
import { DetailField, Panel, SectionTitle, TableShell, Td, Th } from '../../components/shared/common';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { errorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../lib/dates';
import { formatPercent, formatSdg } from '../../lib/money';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_VARIANT } from '../bookings/labels';
import { commissionMinor, RECENT_BOOKINGS_WINDOW, useBrokers, useOfficeRecentBookings } from './api';

const EXAMPLE_FARE_MINOR = 1_000_000; // 10,000 SDG

/** `/brokers/:officeId` — an assigned broker office, its commission and its recent sales (read-only). */
export const BrokerDetailPage: React.FC = () => {
  const { officeId } = useParams<{ officeId: string }>();
  const brokers = useBrokers();
  const row = brokers.data?.find((r) => r.office.id === officeId);
  const crumbs = [{ label: 'الشركة' }, { label: 'الوكلاء', path: '/brokers' }, { label: row?.office.name ?? 'مكتب وكيل' }];

  if (brokers.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (brokers.isError || !row) {
    return (
      <div className="flex flex-col gap-space-md">
        <Breadcrumbs items={crumbs} />
        {brokers.isError ? (
          <ErrorState title="تعذّر تحميل الوكيل" message={errorMessage(brokers.error)} onRetry={() => brokers.refetch()} />
        ) : (
          <EmptyState title="المكتب غير مُسند للشركة" description="لم يعد هذا المكتب ضمن وكلاء الشركة، أو أن الرابط غير صحيح." icon="storefront" />
        )}
      </div>
    );
  }

  const active = row.office.status === 'ACTIVE';

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={crumbs} />
      <PageHeader
        title={row.office.name}
        subtitle={`مكتب وكيل · الرمز ${row.office.code}`}
        className="mb-0"
        badge={<Badge variant={active ? 'success' : 'error'} dot>{active ? 'نشط' : 'موقوف'}</Badge>}
      />

      <Panel>
        <SectionTitle title="العمولة" />
        <dl className="grid gap-space-md sm:grid-cols-3">
          <DetailField label="نسبة العمولة"><span className="text-lg font-bold tabular-nums">{formatPercent(row.commissionPercent)}</span></DetailField>
          <DetailField label={`مثال: تذكرة بـ ${formatSdg(EXAMPLE_FARE_MINOR)}`}>
            عمولة <span className="tabular-nums">{formatSdg(commissionMinor(EXAMPLE_FARE_MINOR, row.commissionPercent))}</span>
          </DetailField>
          <DetailField label="من يتحمّل العمولة">
            حسب إعداد المنصة للشركة — يظهر في <Link to="/reports" className="text-secondary">كشف الحساب</Link> وفي كل تسوية.
          </DetailField>
        </dl>
        <p className="mt-3 text-xs text-on-surface-variant">إسناد المكاتب ونِسب العمولة تُدار من إدارة المنصة ولا تُعدَّل من بوابة الشركة.</p>
      </Panel>

      <OfficeBookings officeId={row.office.id} />
    </div>
  );
};

const OfficeBookings: React.FC<{ officeId: string }> = ({ officeId }) => {
  const q = useOfficeRecentBookings(officeId);
  const rows = q.data ?? [];
  const total = rows.filter((b) => b.status === 'CONFIRMED').reduce((n, b) => n + b.totalAmountMinor, 0);
  const commission = rows.filter((b) => b.status === 'CONFIRMED').reduce((n, b) => n + b.commissionAmountMinor, 0);

  return (
    <Panel>
      <SectionTitle title="مبيعات المكتب الأخيرة">
        {rows.length > 0 && (
          <span className="text-xs text-on-surface-variant">
            المؤكدة: {formatSdg(total)} · العمولة: {formatSdg(commission)}
          </span>
        )}
      </SectionTitle>
      <p className="text-xs text-on-surface-variant mb-3">آخر {RECENT_BOOKINGS_WINDOW} حجز باعها هذا المكتب على رحلات الشركة.</p>
      {q.isLoading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : q.isError ? (
        <ErrorState title="تعذّر تحميل الحجوزات" message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="لا توجد مبيعات حديثة لهذا المكتب" icon="confirmation_number" />
      ) : (
        <TableShell
          head={
            <>
              <Th>رقم الحجز</Th>
              <Th>الرحلة</Th>
              <Th>المسافرون</Th>
              <Th>المبلغ</Th>
              <Th>العمولة</Th>
              <Th>التأكيد</Th>
              <Th>الحالة</Th>
            </>
          }
        >
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-surface-container">
              <Td>
                <Link to={`/bookings/${b.id}`} className="font-mono text-xs text-secondary font-semibold" dir="ltr">{b.bookingRef}</Link>
              </Td>
              <Td>
                <Link to={`/trips/${b.trip.id}`} className="hover:text-secondary">{b.trip.origin} ← {b.trip.destination}</Link>
                <div className="text-xs text-on-surface-variant">{formatDateTime(b.trip.departureAt)}</div>
              </Td>
              <Td className="tabular-nums">{b.passengers.length}</Td>
              <Td className="tabular-nums whitespace-nowrap">{formatSdg(b.totalAmountMinor)}</Td>
              <Td className="tabular-nums whitespace-nowrap">{formatSdg(b.commissionAmountMinor)}</Td>
              <Td className="text-xs text-on-surface-variant whitespace-nowrap">{formatDateTime(b.confirmedAt)}</Td>
              <Td>
                <Badge variant={BOOKING_STATUS_VARIANT[b.status]} dot>{BOOKING_STATUS_LABEL[b.status]}</Badge>
              </Td>
            </tr>
          ))}
        </TableShell>
      )}
    </Panel>
  );
};
