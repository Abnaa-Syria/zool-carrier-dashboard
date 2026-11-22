import * as React from 'react';
import { Breadcrumbs } from '../../../app/shell/Breadcrumbs';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState } from '../../../components/ui/EmptyState';
import { SearchInput } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { errorMessage } from '../../../lib/api/errors';
import { formatDateTime, sudanDate } from '../../../lib/dates';
import { useAuth } from '../../auth/auth-context';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { ConfirmDialog, Pager, Panel, Select, TableShell, Td, Th } from '../../../components/shared/common';
import { usePageReset } from '../../../lib/usePageReset';
import { DRIVER_STATUS_LABEL, useDrivers, useUpdateDriver, type Driver, type DriverStatus } from '../api';
import { DriverModal } from '../components/DriverModal';

const PAGE_SIZE = 20;

export const DriversListPage: React.FC = () => {
  const { can } = useAuth();
  const canManage = can('carrier.fleet');
  const [search, setSearch] = React.useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = React.useState<DriverStatus | ''>('');
  const [page, setPage] = usePageReset(`${q}|${status}`);
  const [modal, setModal] = React.useState<{ driver?: Driver } | null>(null);
  const [toggling, setToggling] = React.useState<Driver | null>(null);
  const update = useUpdateDriver();

  const drivers = useDrivers({ page, pageSize: PAGE_SIZE, q: q || undefined, status: status || undefined });
  const rows = drivers.data?.data ?? [];
  const filtered = Boolean(q || status);
  const today = sudanDate();
  const suspending = toggling?.status === 'ACTIVE';

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'الأسطول' }, { label: 'السائقون' }]} />
      <PageHeader
        title="السائقون"
        subtitle="سائقو الشركة وحساباتهم في تطبيق السائق."
        className="mb-0"
        actions={canManage ? <Button icon="person_add" onClick={() => setModal({})}>إضافة سائق</Button> : null}
      />

      <div className="flex flex-wrap items-center gap-space-sm">
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder="بحث بالاسم أو الرمز أو الهاتف..." />
        </div>
        <Select aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value as DriverStatus | '')}>
          <option value="">كل الحالات</option>
          <option value="ACTIVE">{DRIVER_STATUS_LABEL.ACTIVE}</option>
          <option value="SUSPENDED">{DRIVER_STATUS_LABEL.SUSPENDED}</option>
        </Select>
        {drivers.data?.meta && <span className="text-xs text-on-surface-variant">{drivers.data.meta.total.toLocaleString('en-US')} سائق</span>}
      </div>

      <Panel>
        {drivers.isLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : drivers.isError ? (
          <ErrorState title="تعذّر تحميل السائقين" message={errorMessage(drivers.error)} onRetry={() => drivers.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtered ? 'لا توجد نتائج مطابقة' : 'لا يوجد سائقون بعد'}
            description={filtered ? 'غيّر البحث أو عوامل التصفية.' : 'أضف أول سائق للشركة.'}
            icon="badge"
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>السائق</Th>
                <Th>الرمز</Th>
                <Th>الهاتف</Th>
                <Th>الرخصة</Th>
                <Th>آخر دخول</Th>
                <Th>الحالة</Th>
                {canManage && <Th className="text-left">إجراءات</Th>}
              </>
            }
          >
            {rows.map((d) => {
              const expired = d.licenseExpiry !== null && d.licenseExpiry < today;
              return (
                <tr key={d.id} className="border-t border-surface-container hover:bg-surface-container/50">
                  <Td className="font-semibold">{d.displayName}</Td>
                  <Td className="font-mono text-xs" dir="ltr">{d.driverCode}</Td>
                  <Td className="font-mono text-xs" dir="ltr">{d.phone ?? '—'}</Td>
                  <Td className="text-xs">
                    {d.licenseNumber ? <span dir="ltr" className="font-mono">{d.licenseNumber}</span> : '—'}
                    {d.licenseExpiry && (
                      <div className={expired ? 'text-error font-medium' : 'text-on-surface-variant'}>
                        {expired ? 'منتهية ' : 'تنتهي '}
                        <span dir="ltr">{d.licenseExpiry}</span>
                      </div>
                    )}
                  </Td>
                  <Td className="text-xs text-on-surface-variant">{formatDateTime(d.lastLoginAt)}</Td>
                  <Td>
                    <Badge variant={d.status === 'ACTIVE' ? 'success' : 'error'} dot>{DRIVER_STATUS_LABEL[d.status]}</Badge>
                  </Td>
                  {canManage && (
                    <Td className="text-left whitespace-nowrap">
                      <Button size="sm" variant="ghost" icon="edit" onClick={() => setModal({ driver: d })}>تعديل</Button>
                      <Button size="sm" variant="ghost" icon={d.status === 'ACTIVE' ? 'block' : 'check_circle'} onClick={() => setToggling(d)}>
                        {d.status === 'ACTIVE' ? 'إيقاف' : 'إعادة التفعيل'}
                      </Button>
                    </Td>
                  )}
                </tr>
              );
            })}
          </TableShell>
        )}
        <Pager meta={drivers.data?.meta} busy={drivers.isFetching} onPage={setPage} />
      </Panel>

      <DriverModal driver={modal?.driver} open={modal !== null} onOpenChange={(o) => !o && setModal(null)} />
      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(o) => {
          if (!o) {
            setToggling(null);
            update.reset();
          }
        }}
        title={suspending ? `إيقاف السائق ${toggling?.displayName ?? ''}؟` : `إعادة تفعيل ${toggling?.displayName ?? ''}؟`}
        confirmText={suspending ? 'إيقاف وإنهاء الجلسات' : 'إعادة التفعيل'}
        danger={suspending}
        pending={update.isPending}
        error={update.error}
        onConfirm={() =>
          toggling &&
          update.mutate({ id: toggling.id, patch: { status: suspending ? 'SUSPENDED' : 'ACTIVE' } }, { onSuccess: () => setToggling(null) })
        }
      >
        {suspending
          ? 'سيتم إنهاء كل جلسات السائق فورًا وتسجيل خروجه من تطبيق السائق، ولن يتمكن من الدخول حتى يُعاد تفعيله.'
          : 'سيتمكن السائق من تسجيل الدخول مجددًا برقم هاتفه.'}
      </ConfirmDialog>
    </div>
  );
};
