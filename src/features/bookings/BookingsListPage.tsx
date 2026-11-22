import * as React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../../app/shell/Breadcrumbs';
import { Pager, Panel, SELECT_CLASS, TableShell, Td, Th } from '../../components/shared/common';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../../components/ui/Drawer';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { errorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../lib/dates';
import { formatSdg } from '../../lib/money';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { usePageReset } from '../../lib/usePageReset';
import { BOARDING_LABEL, BOARDING_VARIANT } from '../network/api';
import { useBookings, type CarrierBooking } from './api';
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_VARIANT,
  CHANNEL_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  type BookingStatus,
} from './labels';

const PAGE_SIZE = 20;

/** `/bookings` — every booking on the company's trips (read-only). */
export const BookingsListPage: React.FC = () => {
  const [search, setSearch] = React.useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = React.useState<BookingStatus | ''>('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = usePageReset([q, status, from, to].join('|'));
  const [selected, setSelected] = React.useState<CarrierBooking | null>(null);

  const bookings = useBookings({ page, pageSize: PAGE_SIZE, q: q || undefined, status: status || undefined, from: from || undefined, to: to || undefined });
  const rows = bookings.data?.data ?? [];
  const meta = bookings.data?.meta;
  const filtered = Boolean(q || status || from || to);

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'التشغيل' }, { label: 'الحجوزات' }]} />
      <PageHeader title="الحجوزات" subtitle="كل الحجوزات على رحلات الشركة من تطبيق العميل ومكاتب الوكلاء." className="mb-0" />

      <div className="flex flex-wrap items-end gap-space-sm">
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder="رقم الحجز، اسم أو هاتف المسافر..." />
        </div>
        <select aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | '')} className={SELECT_CLASS}>
          <option value="">كل الحالات</option>
          {(Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]).map((s) => (
            <option key={s} value={s}>{BOOKING_STATUS_LABEL[s]}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-on-surface-variant" title="تاريخ تأكيد الحجز (توقيت السودان)">
          أُكّد من
          <input type="date" aria-label="من يوم" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={SELECT_CLASS} />
        </label>
        <label className="flex items-center gap-1 text-xs text-on-surface-variant">
          إلى
          <input type="date" aria-label="إلى يوم" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={SELECT_CLASS} />
        </label>
        {filtered && (
          <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setStatus(''); setFrom(''); setTo(''); }}>
            مسح
          </Button>
        )}
        {meta && <span className="text-xs text-on-surface-variant">{meta.total.toLocaleString('en-US')} حجز</span>}
      </div>

      <Panel>
        {bookings.isLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : bookings.isError ? (
          <ErrorState title="تعذّر تحميل الحجوزات" message={errorMessage(bookings.error)} onRetry={() => bookings.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtered ? 'لا توجد نتائج مطابقة' : 'لا توجد حجوزات بعد'}
            description={filtered ? 'غيّر البحث أو عوامل التصفية.' : 'تظهر هنا الحجوزات فور بيع مقاعد على رحلاتك.'}
            icon="confirmation_number"
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>رقم الحجز</Th>
                <Th>الرحلة</Th>
                <Th>المسافرون</Th>
                <Th>القناة</Th>
                <Th>الدفع</Th>
                <Th>المبلغ</Th>
                <Th>التأكيد</Th>
                <Th>الحالة</Th>
              </>
            }
          >
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-surface-container hover:bg-surface-container/50 cursor-pointer" onClick={() => setSelected(b)}>
                <Td>
                  <button type="button" className="font-mono text-xs text-secondary font-semibold" dir="ltr" onClick={() => setSelected(b)}>
                    {b.bookingRef}
                  </button>
                </Td>
                <Td>
                  <div>{b.trip.origin} ← {b.trip.destination}</div>
                  <div className="text-xs text-on-surface-variant">{formatDateTime(b.trip.departureAt)}</div>
                </Td>
                <Td>
                  <div>{b.passengers[0]?.fullName ?? '—'}</div>
                  {b.passengers.length > 1 && <div className="text-xs text-on-surface-variant">+{b.passengers.length - 1} مسافر</div>}
                </Td>
                <Td className="text-xs">
                  {CHANNEL_LABEL[b.channel]}
                  {b.office && <div className="text-on-surface-variant">{b.office.name}</div>}
                </Td>
                <Td className="text-xs">
                  {PAYMENT_METHOD_LABEL[b.paymentMethod]}
                  <div className="text-on-surface-variant">{PAYMENT_STATUS_LABEL[b.paymentStatus] ?? b.paymentStatus}</div>
                </Td>
                <Td className="tabular-nums whitespace-nowrap">{formatSdg(b.totalAmountMinor)}</Td>
                <Td className="text-xs text-on-surface-variant whitespace-nowrap">{formatDateTime(b.confirmedAt)}</Td>
                <Td>
                  <Badge variant={BOOKING_STATUS_VARIANT[b.status]} dot>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                </Td>
              </tr>
            ))}
          </TableShell>
        )}
        <Pager meta={meta} busy={bookings.isFetching} onPage={setPage} />
      </Panel>

      <BookingDrawer booking={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex justify-between gap-3 text-sm py-1">
    <span className="text-on-surface-variant">{label}</span>
    <span className="font-medium text-left">{children}</span>
  </div>
);

const BookingDrawer: React.FC<{ booking: CarrierBooking | null; onClose: () => void }> = ({ booking: b, onClose }) => (
  <Drawer open={b !== null} onOpenChange={(o) => !o && onClose()}>
    <DrawerContent side="left">
      {b && (
        <div className="flex flex-col gap-4">
          <DrawerHeader>
            <DrawerTitle>
              حجز <span dir="ltr" className="font-mono">{b.bookingRef}</span>
            </DrawerTitle>
            <DrawerDescription>
              <Badge variant={BOOKING_STATUS_VARIANT[b.status]} dot>{BOOKING_STATUS_LABEL[b.status]}</Badge>
            </DrawerDescription>
          </DrawerHeader>

          <section>
            <Row label="الرحلة">
              <Link to={`/trips/${b.trip.id}`} className="text-secondary" onClick={onClose}>
                {b.trip.origin} ← {b.trip.destination}
              </Link>
            </Row>
            <Row label="المغادرة">{formatDateTime(b.trip.departureAt)}</Row>
            <Row label="القناة">{CHANNEL_LABEL[b.channel]}{b.office ? ` — ${b.office.name}` : ''}</Row>
            {b.employee && <Row label="الموظف البائع">{b.employee.displayName}</Row>}
            {b.customer && <Row label="العميل">{b.customer.displayName ?? '—'} <span dir="ltr" className="font-mono text-xs">{b.customer.phone}</span></Row>}
            <Row label="الدفع">{PAYMENT_METHOD_LABEL[b.paymentMethod]} — {PAYMENT_STATUS_LABEL[b.paymentStatus] ?? b.paymentStatus}</Row>
            <Row label="المبلغ">{formatSdg(b.totalAmountMinor)}</Row>
            {b.commissionAmountMinor > 0 && <Row label="عمولة الوكيل">{formatSdg(b.commissionAmountMinor)}</Row>}
            <Row label="التأكيد">{formatDateTime(b.confirmedAt)}</Row>
            {b.cancelledAt && <Row label="الإلغاء">{formatDateTime(b.cancelledAt)}</Row>}
            {b.cancelReason && <Row label="سبب الإلغاء">{b.cancelReason}</Row>}
            {b.leg && <Row label="رحلة ذهاب وعودة">{b.leg === 'OUTBOUND' ? 'الذهاب' : 'العودة'}</Row>}
            {b.changeCount > 0 && <Row label="عدد التعديلات">{b.changeCount}</Row>}
          </section>

          <section>
            <h3 className="font-bold text-sm mb-2">التذاكر ({b.tickets.length})</h3>
            <ul className="space-y-2">
              {b.tickets.map((t) => (
                <li key={t.id} className="rounded-lg border border-surface-container-high p-2 text-sm flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{t.passengerName}</div>
                    <div className="text-xs text-on-surface-variant">
                      مقعد <strong>{t.seatLabel}</strong> · <span dir="ltr" className="font-mono">{t.ticketNumber}</span>
                    </div>
                  </div>
                  <Badge size="sm" variant={BOARDING_VARIANT[t.boardingStatus]}>{BOARDING_LABEL[t.boardingStatus]}</Badge>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </DrawerContent>
  </Drawer>
);
