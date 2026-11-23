import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../../app/shell/Breadcrumbs';
import { ConfirmDialog, DetailField, Panel, SectionTitle, SELECT_CLASS } from '../../../components/shared/common';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { errorMessage } from '../../../lib/api/errors';
import { formatDateTime, sudanDate } from '../../../lib/dates';
import { formatSdg } from '../../../lib/money';
import { presetRange } from '../../../lib/range';
import { useAuth } from '../../auth/auth-context';
import { RelatedTripsPanel } from '../../network/components/RelatedTripsPanel';
import { useCashByDriver } from '../../reports/api';
import { DRIVER_STATUS_LABEL, LICENSE_LABEL, LICENSE_VARIANT, licenseStatus, useDriver, useUpdateDriver } from '../api';
import { DriverModal } from '../components/DriverModal';

/** `/drivers/:id` — profile, license, status, assigned trips and (finance) cash collected. */
export const DriverDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const canManage = can('carrier.fleet');
  const driver = useDriver(id);
  const update = useUpdateDriver();
  const [editing, setEditing] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const d = driver.data;
  const crumbs = [{ label: 'الأسطول' }, { label: 'السائقون', path: '/drivers' }, { label: d?.displayName ?? 'سائق' }];

  if (driver.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (driver.isError || !d) {
    return (
      <div className="flex flex-col gap-space-md">
        <Breadcrumbs items={crumbs} />
        <ErrorState title="تعذّر تحميل السائق" message={errorMessage(driver.error)} onRetry={() => driver.refetch()} />
      </div>
    );
  }

  const license = licenseStatus(d.licenseExpiry, sudanDate());
  const suspending = d.status === 'ACTIVE';

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={crumbs} />
      <PageHeader
        title={d.displayName}
        subtitle={`رمز السائق ${d.driverCode}`}
        className="mb-0"
        badge={<Badge variant={d.status === 'ACTIVE' ? 'success' : 'error'} dot>{DRIVER_STATUS_LABEL[d.status]}</Badge>}
        actions={
          canManage ? (
            <>
              <Button variant="outline" icon="edit" onClick={() => setEditing(true)}>تعديل</Button>
              <Button variant={suspending ? 'danger' : 'primary'} icon={suspending ? 'block' : 'check_circle'} onClick={() => setToggling(true)}>
                {suspending ? 'إيقاف السائق' : 'إعادة التفعيل'}
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-space-md lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle title="الملف الشخصي" />
          <dl className="grid gap-space-md sm:grid-cols-3">
            <DetailField label="الاسم">{d.displayName}</DetailField>
            <DetailField label="الهاتف"><span dir="ltr" className="font-mono">{d.phone ?? '—'}</span></DetailField>
            <DetailField label="رمز السائق"><span dir="ltr" className="font-mono">{d.driverCode}</span></DetailField>
            <DetailField label="آخر دخول للتطبيق">{formatDateTime(d.lastLoginAt)}</DetailField>
            <DetailField label="أُضيف">{formatDateTime(d.createdAt)}</DetailField>
            <DetailField label="الحالة">{DRIVER_STATUS_LABEL[d.status]}</DetailField>
          </dl>
        </Panel>
        <Panel>
          <SectionTitle title="الرخصة">
            <Badge variant={LICENSE_VARIANT[license.kind]} dot>{LICENSE_LABEL[license.kind]}</Badge>
          </SectionTitle>
          <dl className="grid gap-space-md">
            <DetailField label="رقم الرخصة"><span dir="ltr" className="font-mono">{d.licenseNumber ?? '—'}</span></DetailField>
            <DetailField label="تاريخ الانتهاء">
              <span dir="ltr">{d.licenseExpiry ?? '—'}</span>
              {license.daysLeft !== null && (
                <span className={license.kind === 'expired' ? 'text-error' : 'text-on-surface-variant'}>
                  {' '}
                  ({license.daysLeft < 0 ? `انتهت منذ ${-license.daysLeft} يوم` : license.daysLeft === 0 ? 'تنتهي اليوم' : `باقٍ ${license.daysLeft} يوم`})
                </span>
              )}
            </DetailField>
          </dl>
        </Panel>
      </div>

      {can('carrier.finance') && <DriverCashPanel driverId={d.id} />}

      <RelatedTripsPanel scope={{ driverId: d.id }} title="رحلات السائق" emptyText="لم تُسند رحلات لهذا السائق بعد." />

      <DriverModal driver={d} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog
        open={toggling}
        onOpenChange={(o) => {
          setToggling(o);
          if (!o) update.reset();
        }}
        title={suspending ? `إيقاف السائق ${d.displayName}؟` : `إعادة تفعيل ${d.displayName}؟`}
        confirmText={suspending ? 'إيقاف وإنهاء الجلسات' : 'إعادة التفعيل'}
        danger={suspending}
        pending={update.isPending}
        error={update.error}
        onConfirm={() => update.mutate({ id: d.id, patch: { status: suspending ? 'SUSPENDED' : 'ACTIVE' } }, { onSuccess: () => setToggling(false) })}
      >
        {suspending
          ? 'سيتم إنهاء كل جلسات السائق فورًا وتسجيل خروجه من تطبيق السائق، ولن يتمكن من الدخول حتى يُعاد تفعيله. الرحلات المسندة إليه تبقى كما هي — غيّر السائق من صفحة كل رحلة.'
          : 'سيتمكن السائق من تسجيل الدخول مجددًا برقم هاتفه.'}
      </ConfirmDialog>
    </div>
  );
};

const CASH_PRESETS = [
  { key: '7days', label: 'آخر 7 أيام' },
  { key: '30days', label: 'آخر 30 يومًا' },
  { key: '90days', label: 'آخر 90 يومًا' },
] as const;

/** Cash this driver collected on board (GET /carrier/reports/cash-by-driver, carrier.finance). */
const DriverCashPanel: React.FC<{ driverId: string }> = ({ driverId }) => {
  const [preset, setPreset] = React.useState<(typeof CASH_PRESETS)[number]['key']>('30days');
  const range = React.useMemo(() => presetRange(preset), [preset]);
  const cash = useCashByDriver(range, true);
  const row = cash.data?.rows.find((r) => r.driver.id === driverId);

  return (
    <Panel>
      <SectionTitle title="النقد المحصّل من الركاب">
        <select aria-label="الفترة" value={preset} onChange={(e) => setPreset(e.target.value as typeof preset)} className={SELECT_CLASS}>
          {CASH_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </SectionTitle>
      {cash.isLoading ? (
        <Skeleton className="h-16 rounded-lg" />
      ) : cash.isError ? (
        <ErrorState title="تعذّر تحميل النقد" message={errorMessage(cash.error)} onRetry={() => cash.refetch()} />
      ) : (
        <dl className="grid gap-space-md sm:grid-cols-3">
          <DetailField label="المبلغ المحصّل"><span className="tabular-nums text-lg font-bold">{formatSdg(row?.collectedMinor ?? 0)}</span></DetailField>
          <DetailField label="تذاكر نقدية حُصّلت"><span className="tabular-nums">{row?.tickets ?? 0}</span></DetailField>
          <DetailField label="الفترة (توقيت السودان)">
            <span dir="ltr">{range.from} → {range.to}</span>
            <div className="text-xs font-normal">
              <Link to="/reports" className="text-secondary">كل السائقين في التقارير</Link>
            </div>
          </DetailField>
        </dl>
      )}
    </Panel>
  );
};
