import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../../app/shell/Breadcrumbs';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { errorMessage } from '../../../lib/api/errors';
import { formatDateTime } from '../../../lib/dates';
import { useAuth } from '../../auth/auth-context';
import { ConfirmDialog, Panel } from '../../../components/shared/common';
import { RelatedTripsPanel } from '../../network/components/RelatedTripsPanel';
import {
  SERVICE_CLASS_LABEL,
  useUpdateVehicle,
  useVehicle,
  VEHICLE_STATUS_LABEL,
  VEHICLE_STATUS_TRANSITIONS,
  VEHICLE_STATUS_VARIANT,
  type VehicleStatus,
} from '../api';
import { SeatGrid, SeatLegend } from '../components/SeatGrid';
import { layoutStats } from '../seatLayout';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-on-surface-variant">{label}</dt>
    <dd className="text-sm text-on-surface">{children}</dd>
  </div>
);

const STATUS_ACTION: Record<VehicleStatus, { label: string; icon: string; confirm: string; body: string; danger: boolean }> = {
  ACTIVE: {
    label: 'إعادة إلى الخدمة',
    icon: 'check_circle',
    confirm: 'إعادة التفعيل',
    body: 'ستظهر الحافلة مجددًا في قوائم الجدولة وتغيير الحافلة.',
    danger: false,
  },
  MAINTENANCE: {
    label: 'إرسال للصيانة',
    icon: 'build',
    confirm: 'تحويل إلى الصيانة',
    body: 'لن تظهر الحافلة في الجدولة الجديدة حتى تُعاد إلى الخدمة. الرحلات المجدولة عليها لا تتغيّر تلقائيًا — غيّر الحافلة من صفحة كل رحلة.',
    danger: false,
  },
  RETIRED: {
    label: 'إخراج من الخدمة',
    icon: 'do_not_disturb_on',
    confirm: 'إخراج من الخدمة',
    body: 'هذا بديل الحذف: تبقى الحافلة وسجل رحلاتها محفوظًا لكنها لا تُستخدم في الجدولة. الرحلات المجدولة عليها لا تتغيّر تلقائيًا — غيّر الحافلة من صفحة كل رحلة. يمكن إعادتها للخدمة لاحقًا.',
    danger: true,
  },
};

/** `/vehicles/:id` — profile, amenities, the seat layout, status actions and the vehicle's trips. */
export const FleetVehicleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const navigate = useNavigate();
  const vehicle = useVehicle(id);
  const update = useUpdateVehicle(id ?? '');
  const [target, setTarget] = React.useState<VehicleStatus | null>(null);
  const v = vehicle.data;
  const stats = v ? layoutStats(v.seatLayout) : null;

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'الأسطول' }, { label: 'الحافلات', path: '/vehicles' }, { label: v?.plateNumber ?? '...' }]} />
      {vehicle.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : vehicle.isError ? (
        <ErrorState title="تعذّر تحميل الحافلة" message={errorMessage(vehicle.error)} onRetry={() => vehicle.refetch()} />
      ) : v && stats ? (
        <>
          <PageHeader
            title={v.plateNumber}
            subtitle={v.model}
            className="mb-0"
            badge={<Badge variant={VEHICLE_STATUS_VARIANT[v.status]} dot>{VEHICLE_STATUS_LABEL[v.status]}</Badge>}
            actions={
              can('carrier.fleet') ? (
                <>
                  <Button variant="outline" icon="edit" onClick={() => navigate(`/vehicles/${v.id}/edit`)}>تعديل</Button>
                  {VEHICLE_STATUS_TRANSITIONS[v.status].map((s) => (
                    <Button key={s} variant={STATUS_ACTION[s].danger ? 'danger' : 'outline'} icon={STATUS_ACTION[s].icon} onClick={() => setTarget(s)}>
                      {STATUS_ACTION[s].label}
                    </Button>
                  ))}
                </>
              ) : null
            }
          />

          <Panel>
            <dl className="grid gap-space-md sm:grid-cols-3">
              <Field label="فئة الخدمة">{SERVICE_CLASS_LABEL[v.serviceClass]}</Field>
              <Field label="السعة"><span className="tabular-nums">{v.capacity}</span> مقعدًا ({stats.womenOnly} للنساء)</Field>
              <Field label="آخر تحديث">{formatDateTime(v.updatedAt)}</Field>
            </dl>
          </Panel>

          <Panel className="flex flex-col gap-space-sm">
            <h2 className="text-base font-bold">المزايا</h2>
            {v.amenities.length === 0 ? (
              <p className="text-xs text-on-surface-variant">لا توجد مزايا مسندة.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {v.amenities.map((a) => (
                  <li key={a.code} className="flex items-center gap-1.5 rounded-lg border border-surface-container-high px-3 py-1.5 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-secondary">{a.icon}</span>
                    {a.nameAr}
                    {a.value && <span className="text-xs text-on-surface-variant">({a.value})</span>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel className="flex flex-col gap-space-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">تخطيط المقاعد</h2>
              <SeatLegend />
            </div>
            <p className="text-xs text-on-surface-variant">
              {v.seatLayout.rows} صفوف × {v.seatLayout.columns} مقاعد، الممر بعد العمود {v.seatLayout.aisleAfterColumn}، السائق على
              {v.seatLayout.driverSide === 'LEFT' ? ' اليسار' : ' اليمين'}. أي تعديل على التخطيط يُطبَّق على الرحلات المجدولة بعده فقط.
            </p>
            <div className="max-w-full overflow-x-auto">
              <SeatGrid layout={v.seatLayout} />
            </div>
          </Panel>

          <RelatedTripsPanel scope={{ vehicleId: v.id }} title="رحلات الحافلة" emptyText="لم تُجدول رحلات على هذه الحافلة بعد." />

          <ConfirmDialog
            open={target !== null}
            onOpenChange={(o) => {
              if (!o) {
                setTarget(null);
                update.reset();
              }
            }}
            title={target ? `${STATUS_ACTION[target].label}: ${v.plateNumber}؟` : ''}
            confirmText={target ? STATUS_ACTION[target].confirm : ''}
            danger={target ? STATUS_ACTION[target].danger : false}
            pending={update.isPending}
            error={update.error}
            onConfirm={() => target && update.mutate({ status: target }, { onSuccess: () => setTarget(null) })}
          >
            {target ? STATUS_ACTION[target].body : null}
          </ConfirmDialog>
        </>
      ) : null}
    </div>
  );
};
