import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../app/shell/Breadcrumbs';
import { Pager, Panel, SELECT_CLASS, TableShell, Td, Th } from '../../components/shared/common';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { errorMessage } from '../../lib/api/errors';
import { formatDateTime, periodLabel } from '../../lib/dates';
import { formatSdg } from '../../lib/money';
import { usePageReset } from '../../lib/usePageReset';
import { StatementView } from '../reports/StatementView';
import { feeLabel } from '../reports/statement';
import {
  SETTLEMENT_STATUS_LABEL,
  SETTLEMENT_STATUS_VARIANT,
  totalsFromSettlement,
  useSettlement,
  useSettlements,
  type SettlementStatus,
} from './api';

const PAGE_SIZE = 20;

/** `/settlements` (carrier.finance): statements issued by the platform (read-only). */
export const SettlementsPage: React.FC = () => {
  const [status, setStatus] = React.useState<SettlementStatus | ''>('');
  const [page, setPage] = usePageReset(status);
  const list = useSettlements({ page, pageSize: PAGE_SIZE, status: status || undefined });
  const rows = list.data?.data ?? [];

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'المالية' }, { label: 'التسويات' }]} />
      <PageHeader
        title="التسويات"
        subtitle="كشوف التسوية الدورية التي تُعدّها إدارة المنصة. المعتمدة نهائية ولا تتغيّر، ويُسجَّل مرجع الدفع عند السداد."
        className="mb-0"
      />
      <div className="flex flex-wrap items-center gap-space-sm">
        <select aria-label="الحالة" value={status} onChange={(e) => setStatus(e.target.value as SettlementStatus | '')} className={SELECT_CLASS}>
          <option value="">كل الحالات</option>
          {(Object.keys(SETTLEMENT_STATUS_LABEL) as SettlementStatus[]).filter((s) => s !== 'DRAFT').map((s) => (
            <option key={s} value={s}>{SETTLEMENT_STATUS_LABEL[s]}</option>
          ))}
        </select>
        {list.data?.meta && <span className="text-xs text-on-surface-variant">{list.data.meta.total.toLocaleString('en-US')} تسوية</span>}
      </div>

      <Panel>
        {list.isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : list.isError ? (
          <ErrorState title="تعذّر تحميل التسويات" message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={status ? 'لا توجد تسويات بهذه الحالة' : 'لا توجد تسويات بعد'}
            description="تظهر هنا كشوف التسوية بعد أن تُصدرها إدارة المنصة. لمتابعة الأرقام الآن استخدم صفحة التقارير."
            icon="account_balance"
          />
        ) : (
          <TableShell
            head={
              <>
                <Th>الفترة</Th>
                <Th>التذاكر</Th>
                <Th>المبيعات</Th>
                <Th>الصافي</Th>
                <Th>الحالة</Th>
                <Th>مرجع الدفع</Th>
              </>
            }
          >
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-surface-container hover:bg-surface-container/50">
                <Td>
                  <Link to={`/settlements/${s.id}`} className="text-secondary font-semibold" dir="ltr">
                    {periodLabel(s.periodFrom, s.periodTo)}
                  </Link>
                </Td>
                <Td className="tabular-nums">{s.ticketsCount}</Td>
                <Td className="tabular-nums whitespace-nowrap">{formatSdg(s.onlineSalesMinor + s.brokerSalesMinor + s.cashSalesMinor)}</Td>
                <Td className="tabular-nums whitespace-nowrap font-semibold">
                  {formatSdg(Math.abs(s.netPayableMinor))}
                  <div className="text-[11px] font-normal text-on-surface-variant">{s.direction === 'PLATFORM_PAYS_CARRIER' ? 'للشركة' : 'على الشركة'}</div>
                </Td>
                <Td>
                  <Badge variant={SETTLEMENT_STATUS_VARIANT[s.status]} dot>{SETTLEMENT_STATUS_LABEL[s.status]}</Badge>
                </Td>
                <Td className="font-mono text-xs" dir="ltr">{s.paymentReference ?? '—'}</Td>
              </tr>
            ))}
          </TableShell>
        )}
        <Pager meta={list.data?.meta} busy={list.isFetching} onPage={setPage} />
      </Panel>
    </div>
  );
};

/** `/settlements/:id` — stored statement with per-trip lines (read-only). */
export const SettlementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const q = useSettlement(id);
  const s = q.data;
  const crumbs = [{ label: 'المالية' }, { label: 'التسويات', path: '/settlements' }, { label: s ? periodLabel(s.periodFrom, s.periodTo) : 'تسوية' }];

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={crumbs} />
      {q.isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : q.isError || !s ? (
        <ErrorState title="تعذّر تحميل التسوية" message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <>
          <PageHeader
            title={`تسوية ${periodLabel(s.periodFrom, s.periodTo)}`}
            badge={<Badge variant={SETTLEMENT_STATUS_VARIANT[s.status]} dot>{SETTLEMENT_STATUS_LABEL[s.status]}</Badge>}
            subtitle={`رسوم المنصة: ${feeLabel(s.config)} · عمولات الوكلاء: ${s.config.commissionBearer === 'CARRIER' ? 'على الشركة' : 'على المنصة'}`}
            className="mb-0"
          />
          {s.status === 'DRAFT' && (
            <div role="status" className="rounded-lg border border-[#FDE68A] bg-[#FEF3C7] px-space-md py-2 text-sm text-[#92400E]">
              هذه مسودة قيد المراجعة لدى إدارة المنصة وقد تتغيّر أرقامها قبل الاعتماد.
            </div>
          )}
          <Panel>
            <dl className="grid gap-3 sm:grid-cols-4 text-sm">
              <div><dt className="text-xs text-on-surface-variant">أُنشئت</dt><dd>{formatDateTime(s.createdAt)}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">اعتُمدت</dt><dd>{formatDateTime(s.finalizedAt)}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">دُفعت</dt><dd>{formatDateTime(s.paidAt)}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">مرجع الدفع</dt><dd className="font-mono" dir="ltr">{s.paymentReference ?? '—'}</dd></div>
            </dl>
            {s.notes && <p className="mt-3 text-sm text-on-surface-variant">ملاحظات: {s.notes}</p>}
          </Panel>
          <StatementView totals={totalsFromSettlement(s)} lines={s.lines ?? []} />
        </>
      )}
    </div>
  );
};
