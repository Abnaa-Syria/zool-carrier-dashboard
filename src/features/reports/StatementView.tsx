import * as React from 'react';
import { Link } from 'react-router-dom';
import { TableShell, Td, Th } from '../../components/shared/common';
import { formatDateTime } from '../../lib/dates';
import { formatPercent, formatSdg } from '../../lib/money';
import { cn } from '../../lib/utils';
import { breakdown, DIRECTION_LABEL, lineNetMinor, type StatementLine, type StatementTotals } from './statement';

/** Validated categorical order (dataviz validator: CVD ΔE ≥ 15, contrast ≥ 3:1). */
const CHANNEL_COLOR: Record<'online' | 'broker' | 'cash', string> = { online: '#1f8a5b', broker: '#2f6fb3', cash: '#c27c0e' };

const card = 'bg-surface-container-lowest border border-surface-container-high rounded-xl p-space-md';

/** Statement breakdown (live report or stored settlement): channels, net computation, per-trip lines. */
export const StatementView: React.FC<{ totals: StatementTotals; lines: StatementLine[] }> = ({ totals, lines }) => {
  const b = breakdown(totals);
  const [hover, setHover] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="grid gap-space-md lg:grid-cols-3">
        <section className={cn(card, 'lg:col-span-2 flex flex-col gap-3')}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold">المبيعات حسب القناة</h2>
            <span className="text-xs text-on-surface-variant">{totals.ticketsCount.toLocaleString('en-US')} تذكرة</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">{formatSdg(b.grossSalesMinor)}</div>
          {b.grossSalesMinor > 0 ? (
            <div className="flex h-4 w-full gap-[2px]" role="img" aria-label="توزيع المبيعات حسب القناة">
              {b.channels
                .filter((c) => c.amountMinor > 0)
                .map((c) => (
                  <div
                    key={c.key}
                    title={`${c.label}: ${formatSdg(c.amountMinor)} (${formatPercent(c.sharePercent)})`}
                    onMouseEnter={() => setHover(c.key)}
                    onMouseLeave={() => setHover(null)}
                    className={cn('h-full rounded transition-opacity', hover && hover !== c.key && 'opacity-40')}
                    style={{ width: `${c.sharePercent}%`, minWidth: 4, backgroundColor: CHANNEL_COLOR[c.key] }}
                  />
                ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">لا توجد مبيعات في هذه الفترة.</p>
          )}
          <ul className="grid gap-2 sm:grid-cols-3">
            {b.channels.map((c) => (
              <li
                key={c.key}
                onMouseEnter={() => setHover(c.key)}
                onMouseLeave={() => setHover(null)}
                className="rounded-lg border border-surface-container-high px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHANNEL_COLOR[c.key] }} />
                  {c.label}
                </div>
                <div className="font-semibold tabular-nums">{formatSdg(c.amountMinor)}</div>
                <div className="text-[11px] text-on-surface-variant tabular-nums">{formatPercent(c.sharePercent)}</div>
              </li>
            ))}
          </ul>
        </section>

        <section
          className={cn(
            'rounded-xl p-space-md flex flex-col justify-between gap-2',
            b.direction === 'CARRIER_PAYS_PLATFORM' ? 'bg-error-container/50 text-on-surface' : 'bg-secondary text-on-secondary',
          )}
        >
          <div className="text-sm opacity-90">صافي التسوية</div>
          <div className="text-3xl font-bold tabular-nums" dir="ltr">{formatSdg(Math.abs(b.netPayableMinor))}</div>
          <div className="text-sm font-semibold">{DIRECTION_LABEL[b.direction]}</div>
          <p className="text-xs opacity-80">النقد الذي حصّله السائقون لدى الشركة بالفعل ولا يدخل في الصافي.</p>
        </section>
      </div>

      <section className={card}>
        <h2 className="font-bold mb-2">حساب الصافي</h2>
        <dl className="divide-y divide-surface-container text-sm">
          {b.rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 py-2">
              <dt>
                <div className={cn(r.sign === 0 && 'text-on-surface-variant')}>{r.label}</div>
                {r.hint && <div className="text-[11px] text-on-surface-variant">{r.hint}</div>}
              </dt>
              <dd className={cn('tabular-nums font-medium whitespace-nowrap', r.sign === 0 && 'text-on-surface-variant')} dir="ltr">
                {r.sign === 1 ? '+ ' : r.sign === -1 ? '− ' : ''}
                {formatSdg(r.amountMinor)}
                {r.sign === 0 && <span className="text-[11px]"> (للعلم)</span>}
              </dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2 font-bold">
            <dt>الصافي</dt>
            <dd className="tabular-nums" dir="ltr">{formatSdg(b.netPayableMinor)}</dd>
          </div>
        </dl>
      </section>

      <section className={card}>
        <h2 className="font-bold mb-2">التفاصيل حسب الرحلة ({lines.length})</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-on-surface-variant">لا توجد رحلات بمبيعات في هذه الفترة.</p>
        ) : (
          <TableShell
            head={
              <>
                <Th>الرحلة</Th>
                <Th>المغادرة</Th>
                <Th>التذاكر</Th>
                <Th>إلكتروني</Th>
                <Th>وكلاء</Th>
                <Th>نقدًا</Th>
                <Th>مسترد</Th>
                <Th>رسوم المنصة</Th>
                <Th>عمولة الوكلاء</Th>
                <Th>الصافي</Th>
              </>
            }
          >
            {lines.map((l) => (
              <tr key={l.tripId} className="border-t border-surface-container tabular-nums">
                <Td>
                  <Link to={`/trips/${l.tripId}`} className="font-mono text-xs text-secondary" dir="ltr">
                    {l.tripNumber ?? l.tripId.slice(-8).toUpperCase()}
                  </Link>
                </Td>
                <Td className="text-xs text-on-surface-variant whitespace-nowrap">{formatDateTime(l.departureAt)}</Td>
                <Td>{l.tickets}</Td>
                <Td className="whitespace-nowrap">{formatSdg(l.onlineMinor)}</Td>
                <Td className="whitespace-nowrap">{formatSdg(l.brokerMinor)}</Td>
                <Td className="whitespace-nowrap text-on-surface-variant">{formatSdg(l.cashMinor)}</Td>
                <Td className="whitespace-nowrap">{formatSdg(l.refundsMinor)}</Td>
                <Td className="whitespace-nowrap">{formatSdg(l.platformFeeMinor)}</Td>
                <Td className="whitespace-nowrap">{formatSdg(l.brokerCommissionMinor)}</Td>
                <Td className="whitespace-nowrap font-semibold">{formatSdg(lineNetMinor(l, totals.config.commissionBearer))}</Td>
              </tr>
            ))}
          </TableShell>
        )}
      </section>
    </div>
  );
};
