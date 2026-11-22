import { describe, expect, it } from 'vitest';
import { breakdown, feeLabel, lineNetMinor, totalsFromStatement, type CarrierStatement, type StatementTotals } from './statement';
import { totalsFromSettlement, type Settlement } from '../settlements/api';

const base: StatementTotals = {
  config: { feeType: 'NONE', feeValue: 0, commissionBearer: 'PLATFORM' },
  ticketsCount: 4,
  onlineMinor: 3_500_000,
  brokerMinor: 0,
  cashMinor: 7_000_000,
  refundsMinor: 0,
  platformDiscountMinor: 0,
  platformFeeMinor: 0,
  brokerCommissionMinor: 0,
  netPayableMinor: 3_500_000,
};

describe('statement breakdown (D-REV-02)', () => {
  it('matches the real dev statement: cash is shown but not part of the net', () => {
    const b = breakdown(base);
    expect(b.grossSalesMinor).toBe(10_500_000);
    expect(b.channels.map((c) => c.sharePercent)).toEqual([33.3, 0, 66.7]);
    expect(b.computedNetMinor).toBe(3_500_000);
    expect(b.direction).toBe('PLATFORM_PAYS_CARRIER');
    expect(b.rows.find((r) => r.key === 'cash')?.sign).toBe(0);
  });

  it('deducts refunds, fee and broker commission only when the carrier bears it', () => {
    const t: StatementTotals = {
      ...base,
      config: { feeType: 'PERCENT', feeValue: 500, commissionBearer: 'CARRIER' },
      brokerMinor: 2_000_000,
      refundsMinor: 500_000,
      platformDiscountMinor: 100_000,
      platformFeeMinor: 275_000,
      brokerCommissionMinor: 200_000,
      netPayableMinor: 3_500_000 + 2_000_000 + 100_000 - 500_000 - 275_000 - 200_000,
    };
    const b = breakdown(t);
    expect(b.computedNetMinor).toBe(t.netPayableMinor);
    expect(b.rows.map((r) => r.key)).toEqual(['online', 'broker', 'discount', 'refunds', 'fee', 'commission', 'cash']);

    const platformBears = breakdown({ ...t, config: { ...t.config, commissionBearer: 'PLATFORM' }, netPayableMinor: t.netPayableMinor + 200_000 });
    expect(platformBears.rows.find((r) => r.key === 'commission')?.sign).toBe(0);
    expect(platformBears.computedNetMinor).toBe(platformBears.netPayableMinor);
  });

  it('reports who owes whom', () => {
    expect(breakdown({ ...base, netPayableMinor: -100 }).direction).toBe('CARRIER_PAYS_PLATFORM');
    const empty = breakdown({ ...base, onlineMinor: 0, cashMinor: 0, netPayableMinor: 0 });
    expect(empty.direction).toBe('NOTHING_DUE');
    expect(empty.channels.every((c) => c.sharePercent === 0)).toBe(true);
  });

  it('labels the fee configuration', () => {
    expect(feeLabel({ feeType: 'NONE', feeValue: 0, commissionBearer: 'PLATFORM' })).toBe('بدون رسوم منصة');
    expect(feeLabel({ feeType: 'PERCENT', feeValue: 250, commissionBearer: 'PLATFORM' })).toBe('2.5% من سعر التذكرة');
    expect(feeLabel({ feeType: 'FIXED', feeValue: 50_000, commissionBearer: 'PLATFORM' })).toBe('500 ج.س لكل تذكرة');
  });

  it('computes a per-trip line net with the same rule', () => {
    const line = { tripId: 't', tripNumber: null, departureAt: '', tickets: 2, onlineMinor: 1000, brokerMinor: 500, cashMinor: 9999, refundsMinor: 100, platformDiscountMinor: 50, platformFeeMinor: 20, brokerCommissionMinor: 30 };
    expect(lineNetMinor(line, 'CARRIER')).toBe(1400);
    expect(lineNetMinor(line, 'PLATFORM')).toBe(1430);
  });

  it('normalises the live statement and stored settlements to the same totals', () => {
    const st = {
      config: base.config, ticketsCount: 4, onlineSalesAmount: 1, brokerSalesAmount: 2, cashSalesAmount: 3, refundsAmount: 4,
      platformDiscountAmount: 5, platformFeeAmount: 6, brokerCommissionAmount: 7, netPayableAmount: 8,
    } as CarrierStatement;
    const se = {
      config: base.config, ticketsCount: 4, onlineSalesMinor: 1, brokerSalesMinor: 2, cashSalesMinor: 3, refundsMinor: 4,
      platformDiscountMinor: 5, platformFeeMinor: 6, brokerCommissionMinor: 7, netPayableMinor: 8,
    } as Settlement;
    expect(totalsFromStatement(st)).toEqual(totalsFromSettlement(se));
  });
});
