import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../../../app/shell/Breadcrumbs';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState, ErrorState } from '../../../components/ui/EmptyState';
import { SearchInput } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { errorMessage } from '../../../lib/api/errors';
import { useAuth } from '../../auth/auth-context';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { Pager, Panel, Select, TableShell, Td, Th } from '../../../components/shared/common';
import { usePageReset } from '../../../lib/usePageReset';
import { SERVICE_CLASS_LABEL, useVehicles, VEHICLE_STATUS_LABEL, VEHICLE_STATUS_VARIANT, type VehicleStatus } from '../api';
import { layoutStats } from '../seatLayout';

const PAGE_SIZE = 20;

export const VehiclesListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [status, setStatus] = React.useState<VehicleStatus | ''>('');
  const [page, setPage] = usePageReset(`${q}|${status}`);

  const vehicles = useVehicles({ page, pageSize: PAGE_SIZE, q: q || undefined, status: status || undefined });
  const rows = vehicles.data?.data ?? [];
  const filtered = Boolean(q || status);

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'الأسطول' }, { label: 'الحافلات' }]} />
      <PageHeader
        title="الحافلات"
        subtitle="حافلات الشركة وتخطيط مقاعدها ومزاياها."
        className="mb-0"
        actions={can('carrier.fleet') ? <Button icon="add" onClick={() => navigate('/vehicles/new')}>إضافة حافلة</Button> : null}
      />

      <div className="flex flex-wrap items-center gap-space-sm">
        <div className="w-full sm:w-72">
          <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder="بحث باللوحة أو الطراز..." />
        </div>
        <Select aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value as VehicleStatus | '')}>
          <option value="">كل الحالات</option>
          {(Object.keys(VEHICLE_STATUS_LABEL) as VehicleStatus[]).map((s) => <option key={s} value={s}>{VEHICLE_STATUS_LABEL[s]}</option>)}
        </Select>
        {vehicles.data?.meta && <span className="text-xs text-on-surface-variant">{vehicles.data.meta.total.toLocaleString('en-US')} حافلة</span>}
      </div>

      <Panel>
        {vehicles.isLoading ? (
          <Skeleton className="h-48 rounded-lg" />
        ) : vehicles.isError ? (
          <ErrorState title="تعذّر تحميل الحافلات" message={errorMessage(vehicles.error)} onRetry={() => vehicles.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtered ? 'لا توجد نتائج مطابقة' : 'لا توجد حافلات بعد'}
            description={filtered ? 'غيّر البحث أو عوامل التصفية.' : 'أضف أول حافلة للشركة.'}
            icon="directions_bus"
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>اللوحة</Th>
                <Th>الطراز</Th>
                <Th>الفئة</Th>
                <Th>السعة</Th>
                <Th>المزايا</Th>
                <Th>الحالة</Th>
              </>
            }
          >
            {rows.map((v) => {
              const stats = layoutStats(v.seatLayout);
              return (
                <tr key={v.id} className="border-t border-surface-container hover:bg-surface-container/50">
                  <Td>
                    <Link to={`/vehicles/${v.id}`} className="font-semibold text-secondary">{v.plateNumber}</Link>
                  </Td>
                  <Td>{v.model}</Td>
                  <Td>
                    <Badge size="sm" variant={v.serviceClass === 'VIP' ? 'secondary' : 'neutral'}>{SERVICE_CLASS_LABEL[v.serviceClass]}</Badge>
                  </Td>
                  <Td className="tabular-nums">
                    {v.capacity}
                    {stats.womenOnly > 0 && <span className="text-xs text-[#9D174D]"> ({stats.womenOnly} للنساء)</span>}
                  </Td>
                  <Td>
                    <div className="flex gap-1 text-secondary">
                      {v.amenities.map((a) => (
                        <span key={a.code} className="material-symbols-outlined text-[18px]" title={a.value ? `${a.nameAr}: ${a.value}` : a.nameAr}>{a.icon}</span>
                      ))}
                      {v.amenities.length === 0 && <span className="text-on-surface-variant">—</span>}
                    </div>
                  </Td>
                  <Td>
                    <Badge variant={VEHICLE_STATUS_VARIANT[v.status]} dot>{VEHICLE_STATUS_LABEL[v.status]}</Badge>
                  </Td>
                </tr>
              );
            })}
          </TableShell>
        )}
        <Pager meta={vehicles.data?.meta} busy={vehicles.isFetching} onPage={setPage} />
      </Panel>
    </div>
  );
};
