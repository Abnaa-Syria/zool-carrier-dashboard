import * as React from 'react';
import { Breadcrumbs } from '../../app/shell/Breadcrumbs';
import { Panel, SELECT_CLASS, TableShell, Td, Th } from '../../components/shared/common';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { errorMessage } from '../../lib/api/errors';
import { formatSdg } from '../../lib/money';
import { presetRange, RANGE_PRESETS, validateRange, type DateRange, type RangePresetKey } from '../../lib/range';
import { cn } from '../../lib/utils';
import { useCashByDriver, useStatement } from './api';
import { StatementView } from './StatementView';
import { totalsFromStatement } from './statement';

/** `/reports` (carrier.finance): live statement for a date range + cash collected by driver. */
export const ReportsPage: React.FC = () => {
  const [preset, setPreset] = React.useState<RangePresetKey>('month');
  const [range, setRange] = React.useState<DateRange>(() => presetRange('month'));
  const rangeError = validateRange(range);
  const statement = useStatement(range, !rangeError);
  const cash = useCashByDriver(range, !rangeError);

  const pick = (key: RangePresetKey) => {
    setPreset(key);
    if (key !== 'custom') setRange(presetRange(key));
  };

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'المالية' }, { label: 'التقارير' }]} />
      <PageHeader
        title="التقارير المالية"
        subtitle="كشف حساب مباشر للرحلات التي غادرت في الفترة (غير الملغاة)، بتوقيت السودان. التسوية الرسمية تُصدرها إدارة المنصة."
        className="mb-0"
      />

      <div className="flex flex-wrap items-end gap-space-sm">
        <div className="flex flex-wrap gap-1">
          {RANGE_PRESETS.map((p) => (
            <Button key={p.key} size="sm" variant={preset === p.key ? 'primary' : 'outline'} onClick={() => pick(p.key)}>
              {p.label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-on-surface-variant">
          من
          <input
            type="date"
            value={range.from}
            onChange={(e) => {
              setPreset('custom');
              setRange((r) => ({ ...r, from: e.target.value }));
            }}
            className={SELECT_CLASS}
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-on-surface-variant">
          إلى
          <input
            type="date"
            value={range.to}
            onChange={(e) => {
              setPreset('custom');
              setRange((r) => ({ ...r, to: e.target.value }));
            }}
            className={SELECT_CLASS}
          />
        </label>
        {rangeError && <span className="text-xs text-error">{rangeError}</span>}
      </div>

      {rangeError ? null : statement.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : statement.isError ? (
        <ErrorState title="تعذّر تحميل كشف الحساب" message={errorMessage(statement.error)} onRetry={() => statement.refetch()} />
      ) : statement.data ? (
        <StatementView totals={totalsFromStatement(statement.data)} lines={statement.data.lines} />
      ) : null}

      <Panel>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h2 className="font-bold">النقد المحصّل حسب السائق</h2>
          {cash.data && <span className="text-sm font-semibold tabular-nums">الإجمالي {formatSdg(cash.data.totalMinor)}</span>}
        </div>
        <p className="text-xs text-on-surface-variant mb-2">تذاكر «الدفع نقدًا للسائق» التي حُصّلت عند الصعود خلال الفترة — للمطابقة مع ما سلّمه كل سائق.</p>
        {rangeError ? null : cash.isLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : cash.isError ? (
          <ErrorState title="تعذّر تحميل النقد حسب السائق" message={errorMessage(cash.error)} onRetry={() => cash.refetch()} />
        ) : !cash.data || cash.data.rows.length === 0 ? (
          <EmptyState title="لا يوجد نقد محصّل في هذه الفترة" icon="payments" />
        ) : (
          <TableShell
            head={
              <>
                <Th>السائق</Th>
                <Th>الرمز</Th>
                <Th>التذاكر</Th>
                <Th>المبلغ المحصّل</Th>
              </>
            }
          >
            {cash.data.rows.map((r) => (
              <tr key={r.driver.id} className="border-t border-surface-container">
                <Td className="font-medium">{r.driver.displayName ?? '—'}</Td>
                <Td className="font-mono text-xs" dir="ltr">{r.driver.driverCode ?? '—'}</Td>
                <Td className="tabular-nums">{r.tickets}</Td>
                <Td className={cn('tabular-nums font-semibold')}>{formatSdg(r.collectedMinor)}</Td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </div>
  );
};
