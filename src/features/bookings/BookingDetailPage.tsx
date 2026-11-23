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
import { formatSdg } from '../../lib/money';
import { BOARDING_LABEL, BOARDING_VARIANT } from '../network/api';
import { useBooking } from './api';
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_VARIANT, CHANNEL_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from './labels';

const GENDER_LABEL = { MALE: 'ذكر', FEMALE: 'أنثى' } as const;
const TICKET_STATUS_LABEL: Record<string, string> = { CONFIRMED: 'مؤكدة', CANCELLED: 'ملغاة', CHANGED: 'نُقلت لرحلة أخرى' };

/** `/bookings/:key` (id or reference) — passengers, tickets, channel, payment and refund status (read-only). */
export const BookingDetailPage: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const booking = useBooking(key);
  const b = booking.data;
  const crumbs = [{ label: 'التشغيل' }, { label: 'الحجوزات', path: '/bookings' }, { label: b?.bookingRef ?? key ?? 'حجز' }];

  if (booking.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (booking.isError || !b) {
    return (
      <div className="flex flex-col gap-space-md">
        <Breadcrumbs items={crumbs} />
        {booking.isError ? (
          <ErrorState title="تعذّر تحميل الحجز" message={errorMessage(booking.error)} onRetry={() => booking.refetch()} />
        ) : (
          <EmptyState title="الحجز غير موجود" description="لا يوجد حجز بهذا الرقم على رحلات الشركة." icon="confirmation_number" />
        )}
      </div>
    );
  }

  const refunded = b.paymentStatus === 'REFUNDED' || b.paymentStatus === 'PARTIALLY_REFUNDED';

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={crumbs} />
      <PageHeader
        title={`حجز ${b.bookingRef}`}
        subtitle={`${b.trip.origin} ← ${b.trip.destination} · ${formatDateTime(b.trip.departureAt)}`}
        className="mb-0"
        badge={<Badge variant={BOOKING_STATUS_VARIANT[b.status]} dot>{BOOKING_STATUS_LABEL[b.status]}</Badge>}
      />

      <div className="grid gap-space-md lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle title="الحجز والرحلة" />
          <dl className="grid gap-space-md sm:grid-cols-3">
            <DetailField label="الرحلة">
              <Link to={`/trips/${b.trip.id}`} className="text-secondary">{b.trip.origin} ← {b.trip.destination}</Link>
            </DetailField>
            <DetailField label="المغادرة">{formatDateTime(b.trip.departureAt)}</DetailField>
            <DetailField label="القناة">
              {CHANNEL_LABEL[b.channel]}
              {b.office && (
                <div>
                  <Link to={`/brokers/${b.office.id}`} className="text-secondary text-xs">{b.office.name}</Link>
                </div>
              )}
            </DetailField>
            {b.employee && <DetailField label="الموظف البائع">{b.employee.displayName}</DetailField>}
            {b.customer && (
              <DetailField label="العميل">
                {b.customer.displayName ?? '—'} <span dir="ltr" className="font-mono text-xs">{b.customer.phone}</span>
              </DetailField>
            )}
            <DetailField label="أُنشئ">{formatDateTime(b.createdAt)}</DetailField>
            <DetailField label="التأكيد">{formatDateTime(b.confirmedAt)}</DetailField>
            {b.leg && <DetailField label="ذهاب وعودة">{b.leg === 'OUTBOUND' ? 'رحلة الذهاب' : 'رحلة العودة'}</DetailField>}
            {b.changeCount > 0 && <DetailField label="عدد التعديلات">{b.changeCount}</DetailField>}
            {b.replacesBookingId && (
              <DetailField label="بدلًا من الحجز">
                <Link to={`/bookings/${b.replacesBookingId}`} className="text-secondary font-mono text-xs" dir="ltr">{b.replacesBookingId.slice(-8).toUpperCase()}</Link>
              </DetailField>
            )}
            {b.replacedByBookingId && (
              <DetailField label="استُبدل بالحجز">
                <Link to={`/bookings/${b.replacedByBookingId}`} className="text-secondary font-mono text-xs" dir="ltr">{b.replacedByBookingId.slice(-8).toUpperCase()}</Link>
              </DetailField>
            )}
          </dl>
        </Panel>

        <Panel>
          <SectionTitle title="الدفع" />
          <dl className="grid gap-space-md">
            <DetailField label="الطريقة">{PAYMENT_METHOD_LABEL[b.paymentMethod] ?? b.paymentMethod}</DetailField>
            <DetailField label="حالة الدفع">
              <Badge size="sm" variant={refunded ? 'warning' : b.paymentStatus === 'PAID' || b.paymentStatus === 'PAID_CASH' ? 'success' : 'neutral'}>
                {PAYMENT_STATUS_LABEL[b.paymentStatus] ?? b.paymentStatus}
              </Badge>
            </DetailField>
            <DetailField label="المبلغ"><span className="tabular-nums text-lg font-bold">{formatSdg(b.totalAmountMinor)}</span></DetailField>
            {b.commissionAmountMinor > 0 && <DetailField label="عمولة الوكيل"><span className="tabular-nums">{formatSdg(b.commissionAmountMinor)}</span></DetailField>}
          </dl>
        </Panel>
      </div>

      {(b.cancelledAt || refunded) && (
        <Panel>
          <SectionTitle title="الإلغاء والاسترداد" />
          <dl className="grid gap-space-md sm:grid-cols-3">
            <DetailField label="أُلغي">{formatDateTime(b.cancelledAt)}</DetailField>
            <DetailField label="سبب الإلغاء">{b.cancelReason ?? '—'}</DetailField>
            <DetailField label="الاسترداد">{refunded ? PAYMENT_STATUS_LABEL[b.paymentStatus] : 'لا يوجد استرداد'}</DetailField>
          </dl>
          <p className="mt-2 text-xs text-on-surface-variant">مبالغ الاسترداد التفصيلية تظهر في كشف الحساب ضمن التقارير والتسويات.</p>
        </Panel>
      )}

      <Panel>
        <SectionTitle title={`المسافرون والتذاكر (${b.tickets.length})`} />
        {b.tickets.length === 0 ? (
          <EmptyState title="لا توجد تذاكر" icon="confirmation_number" />
        ) : (
          <TableShell
            head={
              <>
                <Th>المقعد</Th>
                <Th>المسافر</Th>
                <Th>الهاتف</Th>
                <Th>الهوية</Th>
                <Th>رقم التذكرة</Th>
                <Th>التذكرة</Th>
                <Th>الصعود</Th>
              </>
            }
          >
            {b.tickets.map((t) => {
              const p = b.passengers.find((x) => x.id === t.passengerId);
              return (
                <tr key={t.id} className="border-t border-surface-container">
                  <Td className="font-bold tabular-nums">{t.seatLabel ?? '—'}</Td>
                  <Td>
                    <div className="font-medium">{p?.fullName ?? t.passengerName}</div>
                    {p?.gender && <div className="text-xs text-on-surface-variant">{GENDER_LABEL[p.gender]}</div>}
                  </Td>
                  <Td className="font-mono text-xs" dir="ltr">{p?.phone ?? '—'}</Td>
                  <Td className="font-mono text-xs" dir="ltr">{p?.idNumber ?? '—'}</Td>
                  <Td className="font-mono text-xs" dir="ltr">{t.ticketNumber}</Td>
                  <Td className="text-xs">{TICKET_STATUS_LABEL[t.status] ?? t.status}</Td>
                  <Td>
                    <Badge size="sm" variant={BOARDING_VARIANT[t.boardingStatus]}>{BOARDING_LABEL[t.boardingStatus]}</Badge>
                  </Td>
                </tr>
              );
            })}
          </TableShell>
        )}
      </Panel>
    </div>
  );
};
