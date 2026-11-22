import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../../app/shell/Breadcrumbs';
import { TableShell, Td, Th } from '../../../components/shared/common';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { errorMessage } from '../../../lib/api/errors';
import { formatDateTime } from '../../../lib/dates';
import { formatSdg } from '../../../lib/money';
import { useAuth } from '../../auth/auth-context';
import { CHANNEL_LABEL, PAYMENT_METHOD_LABEL } from '../../bookings/labels';
import {
  BOARDING_LABEL,
  BOARDING_VARIANT,
  SERVICE_CLASS_LABEL,
  stationLabel,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_VARIANT,
  useManifest,
  useTrip,
  type ScheduledTrip,
} from '../api';
import { SeatMap } from '../components/SeatMap';
import { AssignmentModal, CancelTripModal, PriceModal } from '../components/TripModals';
import { formatDuration, formatSudanFull, formatSudanTime } from '../time';

const card = 'bg-surface-container-lowest border border-surface-container-high rounded-xl p-space-md';

/** `/trips/:id` — trip info, stops, seat map, manifest; schedule permission adds assignment / price / cancel. */
export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const trip = useTrip(id);
  const t = trip.data;
  const [modal, setModal] = React.useState<'assign' | 'price' | 'cancel' | null>(null);

  const crumbs = [{ label: 'التشغيل' }, { label: 'الرحلات', path: '/trips' }, { label: t?.tripNumber ?? 'رحلة' }];

  if (trip.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (trip.isError || !t) {
    return (
      <div className="flex flex-col gap-space-md">
        <Breadcrumbs items={crumbs} />
        <ErrorState title="تعذّر تحميل الرحلة" message={errorMessage(trip.error)} onRetry={() => trip.refetch()} />
      </div>
    );
  }

  const open = t.status !== 'COMPLETED' && t.status !== 'CANCELLED';
  const canSchedule = can('carrier.schedule');
  const canAssign = canSchedule && open;
  const canPrice = canSchedule && (t.status === 'SCHEDULED' || t.status === 'BOARDING');
  const canCancel = canSchedule && (t.status === 'SCHEDULED' || t.status === 'BOARDING');

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={crumbs} />
      <PageHeader
        title={`رحلة ${t.tripNumber ?? t.id.slice(-8).toUpperCase()}`}
        badge={<Badge variant={TRIP_STATUS_VARIANT[t.status]} dot>{TRIP_STATUS_LABEL[t.status]}</Badge>}
        subtitle={`${t.origin} ← ${t.destination}${t.route?.code ? ` · مسار ${t.route.code}` : ''}`}
        className="mb-0"
        actions={
          <div className="flex flex-wrap gap-2">
            {(t.status === 'BOARDING' || t.status === 'IN_PROGRESS') && (
              <Link to={`/tracking/${t.id}`}>
                <Button variant="outline" icon="share_location">التتبع المباشر</Button>
              </Link>
            )}
            {canAssign && <Button variant="outline" icon="swap_horiz" onClick={() => setModal('assign')}>تغيير الحافلة / السائق</Button>}
            {canPrice && <Button variant="outline" icon="sell" onClick={() => setModal('price')}>تغيير السعر</Button>}
            {canCancel && <Button variant="danger" icon="cancel" onClick={() => setModal('cancel')}>إلغاء الرحلة</Button>}
          </div>
        }
      />

      <div className="grid gap-space-md lg:grid-cols-3">
        <section className={`${card} grid grid-cols-2 gap-3 text-sm lg:col-span-2`}>
          <Info label="المغادرة" value={formatSudanFull(t.departureAt)} />
          <Info label="الوصول المتوقع" value={formatSudanFull(t.arrivalAt)} />
          <Info label="المدة" value={formatDuration(t.durationMinutes)} />
          <Info label="سعر المقعد" value={formatSdg(t.basePriceMinor)} />
          <Info label="فئة الخدمة" value={SERVICE_CLASS_LABEL[t.serviceClass]} />
          <Info label="البيع" value={t.isActive ? 'مفتوح' : 'متوقف'} />
        </section>
        <section className={`${card} space-y-3 text-sm`}>
          <h2 className="font-bold">الحافلة والسائق</h2>
          <Info
            label="الحافلة"
            value={
              t.vehicle ? (
                <Link to={`/vehicles/${t.vehicle.id}`} className="text-secondary">
                  {t.vehicle.plateNumber} — {t.vehicle.model} ({t.vehicle.capacity} مقعد)
                </Link>
              ) : (
                'غير معيّنة'
              )
            }
          />
          <Info label="السائق" value={t.driver ? `${t.driver.displayName} (${t.driver.driverCode})` : 'غير معيّن'} />
        </section>
      </div>

      <div className="grid gap-space-md lg:grid-cols-2">
        <section className={card}>
          <h2 className="font-bold mb-3">المحطات والأوقات (توقيت السودان)</h2>
          <StopsTimeline trip={t} />
        </section>
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-bold">خريطة المقاعد</h2>
            <div className="flex gap-2 text-xs">
              <Badge variant="neutral">الإجمالي {t.seatCounts.total}</Badge>
              <Badge variant="success">متاح {t.seatCounts.free}</Badge>
              <Badge variant="warning">مؤقت {t.seatCounts.held}</Badge>
              <Badge variant="secondary">مباع {t.seatCounts.sold}</Badge>
            </div>
          </div>
          {t.seats.length === 0 ? (
            <p className="text-sm text-on-surface-variant">لا توجد مقاعد.</p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <SeatMap seats={t.seats} aisleAfterColumn={t.vehicle?.aisleAfterColumn} />
            </div>
          )}
        </section>
      </div>

      <ManifestSection tripId={t.id} />

      {modal === 'assign' && <AssignmentModal trip={t} onClose={() => setModal(null)} />}
      {modal === 'price' && <PriceModal trip={t} onClose={() => setModal(null)} />}
      {modal === 'cancel' && <CancelTripModal trip={t} onClose={() => setModal(null)} />}
    </div>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="text-xs text-on-surface-variant">{label}</div>
    <div className="font-medium">{value}</div>
  </div>
);

/** Passenger manifest (GET /carrier/trips/:id/manifest) with boarding and cash status. */
const ManifestSection: React.FC<{ tripId: string }> = ({ tripId }) => {
  const manifest = useManifest(tripId);
  const m = manifest.data;
  return (
    <section className={card} id="manifest">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-bold">كشف الركاب</h2>
        {m && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="neutral">محجوز {m.counts.booked}</Badge>
            <Badge variant="success">صعد {m.counts.boarded}</Badge>
            <Badge variant="warning">بانتظار الصعود {m.counts.pending}</Badge>
            <Badge variant="error">لم يحضر {m.counts.noShow}</Badge>
          </div>
        )}
      </div>
      {manifest.isLoading ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : manifest.isError ? (
        <ErrorState title="تعذّر تحميل كشف الركاب" message={errorMessage(manifest.error)} onRetry={() => manifest.refetch()} />
      ) : !m || m.passengers.length === 0 ? (
        <EmptyState title="لا يوجد ركاب بعد" description="تظهر هنا التذاكر المؤكدة لهذه الرحلة." icon="groups" />
      ) : (
        <TableShell
          head={
            <>
              <Th>المقعد</Th>
              <Th>الراكب</Th>
              <Th>الحجز</Th>
              <Th>القناة</Th>
              <Th>الدفع</Th>
              <Th>الأجرة</Th>
              <Th>الصعود</Th>
            </>
          }
        >
          {m.passengers.map((p) => (
            <tr key={p.ticketNumber} className="border-t border-surface-container">
              <Td className="font-bold tabular-nums">
                {p.seatLabel}
                {p.isWomenOnlySeat && <span className="material-symbols-outlined text-[14px] text-[#EC4899] align-middle" title="مقعد للنساء">woman</span>}
              </Td>
              <Td>
                <div className="font-medium">{p.passenger.fullName}</div>
                {p.passenger.phone && <div className="text-xs text-on-surface-variant font-mono" dir="ltr">{p.passenger.phone}</div>}
              </Td>
              <Td className="font-mono text-xs" dir="ltr">{p.bookingRef}</Td>
              <Td className="text-xs">
                {CHANNEL_LABEL[p.channel] ?? p.channel}
                {p.soldBy && <div className="text-on-surface-variant">{p.soldBy}</div>}
              </Td>
              <Td className="text-xs">
                {PAYMENT_METHOD_LABEL[p.paymentMethod] ?? p.paymentMethod}
                {p.cashToCollectMinor > 0 && <div className="text-[#B45309]">يُحصَّل {formatSdg(p.cashToCollectMinor)}</div>}
                {p.cashCollectedMinor > 0 && <div className="text-[#15803D]">حُصِّل {formatSdg(p.cashCollectedMinor)}</div>}
              </Td>
              <Td className="tabular-nums whitespace-nowrap">{formatSdg(p.fareMinor)}</Td>
              <Td>
                <Badge size="sm" variant={BOARDING_VARIANT[p.boardingStatus]}>{BOARDING_LABEL[p.boardingStatus]}</Badge>
                {p.boardedAt && <div className="text-[11px] text-on-surface-variant mt-0.5">{formatDateTime(p.boardedAt)}</div>}
              </Td>
            </tr>
          ))}
        </TableShell>
      )}
    </section>
  );
};

const StopsTimeline: React.FC<{ trip: ScheduledTrip }> = ({ trip }) => {
  const points: Array<{ key: string; name: string; arrive: string | null; depart: string | null; actual?: string | null; kind: 'start' | 'stop' | 'end' }> = [
    { key: 'origin', name: trip.originStation ? stationLabel(trip.originStation) : trip.origin, arrive: null, depart: trip.departureAt, kind: 'start' },
    ...trip.stops.map((s) => ({
      key: `s${s.sequence}`,
      name: stationLabel(s.station),
      arrive: s.scheduledArrivalAt,
      depart: s.scheduledDepartureAt,
      actual: s.actualArrivalAt,
      kind: 'stop' as const,
    })),
    { key: 'dest', name: trip.destinationStation ? stationLabel(trip.destinationStation) : trip.destination, arrive: trip.arrivalAt, depart: null, kind: 'end' },
  ];
  return (
    <ol className="relative border-r-2 border-outline-variant/50 mr-2 space-y-4">
      {points.map((p) => (
        <li key={p.key} className="pr-5 relative">
          <span className={`absolute -right-[9px] top-1 h-4 w-4 rounded-full border-2 border-surface-container-lowest ${p.kind === 'stop' ? 'bg-outline' : 'bg-secondary'}`} />
          <div className="font-semibold text-sm">{p.name}</div>
          <div className="text-xs text-on-surface-variant flex flex-wrap gap-x-3">
            {p.arrive && <span>وصول {formatSudanTime(p.arrive)}</span>}
            {p.depart && <span>مغادرة {formatSudanTime(p.depart)}</span>}
            {p.actual && <span className="text-[#15803D]">وصل فعليًا {formatSudanTime(p.actual)}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
};
