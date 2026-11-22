/**
 * D-REV-02 carrier statement: types for GET /carrier/reports/statement and /carrier/settlements/:id,
 * plus the pure breakdown the UI renders (unit-tested).
 *
 * Backend rule (carrier-settlements.service `computeCarrierStatement`):
 *   net = online + broker + platformDiscount − refunds − platformFee − (broker commission if the carrier bears it)
 * Cash collected by drivers is already held by the company: shown, never paid out.
 */
import { formatBasisPoints, formatSdg } from '../../lib/money';

export type FeeType = 'NONE' | 'PERCENT' | 'FIXED';
export type CommissionBearer = 'CARRIER' | 'PLATFORM';
export type FeeConfig = { feeType: FeeType; feeValue: number; commissionBearer: CommissionBearer };

/** Per-trip line (same shape in the live statement and a stored settlement). */
export type StatementLine = {
  tripId: string;
  tripNumber: string | null;
  departureAt: string;
  tickets: number;
  onlineMinor: number;
  brokerMinor: number;
  cashMinor: number;
  refundsMinor: number;
  platformDiscountMinor: number;
  platformFeeMinor: number;
  brokerCommissionMinor: number;
};

/** GET /carrier/reports/statement?from&to (live, not stored). Amount fields are minor units. */
export type CarrierStatement = {
  periodFrom: string;
  periodTo: string;
  config: FeeConfig;
  ticketsCount: number;
  onlineSalesAmount: number;
  brokerSalesAmount: number;
  cashSalesAmount: number;
  refundsAmount: number;
  platformDiscountAmount: number;
  platformFeeAmount: number;
  brokerCommissionAmount: number;
  netPayableAmount: number;
  lines: StatementLine[];
  currency: 'SDG';
};

/** Normalised totals so the statement and stored settlements render through one component. */
export type StatementTotals = {
  config: FeeConfig;
  ticketsCount: number;
  onlineMinor: number;
  brokerMinor: number;
  cashMinor: number;
  refundsMinor: number;
  platformDiscountMinor: number;
  platformFeeMinor: number;
  brokerCommissionMinor: number;
  netPayableMinor: number;
};

export function totalsFromStatement(s: CarrierStatement): StatementTotals {
  return {
    config: s.config,
    ticketsCount: s.ticketsCount,
    onlineMinor: s.onlineSalesAmount,
    brokerMinor: s.brokerSalesAmount,
    cashMinor: s.cashSalesAmount,
    refundsMinor: s.refundsAmount,
    platformDiscountMinor: s.platformDiscountAmount,
    platformFeeMinor: s.platformFeeAmount,
    brokerCommissionMinor: s.brokerCommissionAmount,
    netPayableMinor: s.netPayableAmount,
  };
}

export type BreakdownRow = {
  key: string;
  label: string;
  amountMinor: number;
  /** +1 adds to the net, −1 deducts, 0 shown for information only. */
  sign: 1 | -1 | 0;
  hint?: string;
};

export type StatementBreakdown = {
  /** Sales by channel (online / broker / cash) and their total. */
  channels: Array<{ key: 'online' | 'broker' | 'cash'; label: string; amountMinor: number; sharePercent: number }>;
  grossSalesMinor: number;
  /** Rows that build the net, in order. */
  rows: BreakdownRow[];
  /** Net computed from the rows; equals the API's net when the data is consistent. */
  computedNetMinor: number;
  netPayableMinor: number;
  direction: 'PLATFORM_PAYS_CARRIER' | 'CARRIER_PAYS_PLATFORM' | 'NOTHING_DUE';
};

export function feeLabel(cfg: FeeConfig): string {
  if (cfg.feeType === 'PERCENT') return `${formatBasisPoints(cfg.feeValue)} من سعر التذكرة`;
  if (cfg.feeType === 'FIXED') return `${formatSdg(cfg.feeValue)} لكل تذكرة`;
  return 'بدون رسوم منصة';
}

export function breakdown(t: StatementTotals): StatementBreakdown {
  const grossSalesMinor = t.onlineMinor + t.brokerMinor + t.cashMinor;
  const share = (n: number) => (grossSalesMinor > 0 ? Math.round((n / grossSalesMinor) * 1000) / 10 : 0);
  const carrierBears = t.config.commissionBearer === 'CARRIER';

  const rows: BreakdownRow[] = [
    { key: 'online', label: 'مبيعات إلكترونية (تحتفظ بها المنصة)', amountMinor: t.onlineMinor, sign: 1 },
    { key: 'broker', label: 'مبيعات الوكلاء (محافظ الوكلاء)', amountMinor: t.brokerMinor, sign: 1 },
  ];
  if (t.platformDiscountMinor > 0) {
    rows.push({ key: 'discount', label: 'خصومات تتحملها المنصة', amountMinor: t.platformDiscountMinor, sign: 1, hint: 'قسائم المنصة تُدفع للشركة' });
  }
  rows.push(
    { key: 'refunds', label: 'المبالغ المستردة', amountMinor: t.refundsMinor, sign: -1 },
    { key: 'fee', label: 'رسوم المنصة', amountMinor: t.platformFeeMinor, sign: -1, hint: feeLabel(t.config) },
    {
      key: 'commission',
      label: 'عمولات الوكلاء',
      amountMinor: t.brokerCommissionMinor,
      sign: carrierBears ? -1 : 0,
      hint: carrierBears ? 'تتحملها الشركة' : 'تتحملها المنصة — لا تُخصم من الشركة',
    },
    { key: 'cash', label: 'نقد حصّله السائقون', amountMinor: t.cashMinor, sign: 0, hint: 'لدى الشركة بالفعل — لا يدخل في الصافي' },
  );

  const computedNetMinor = rows.reduce((n, r) => n + r.sign * r.amountMinor, 0);
  const net = t.netPayableMinor;
  return {
    channels: [
      { key: 'online', label: 'إلكتروني', amountMinor: t.onlineMinor, sharePercent: share(t.onlineMinor) },
      { key: 'broker', label: 'وكلاء', amountMinor: t.brokerMinor, sharePercent: share(t.brokerMinor) },
      { key: 'cash', label: 'نقدًا للسائق', amountMinor: t.cashMinor, sharePercent: share(t.cashMinor) },
    ],
    grossSalesMinor,
    rows,
    computedNetMinor,
    netPayableMinor: net,
    direction: net > 0 ? 'PLATFORM_PAYS_CARRIER' : net < 0 ? 'CARRIER_PAYS_PLATFORM' : 'NOTHING_DUE',
  };
}

export const DIRECTION_LABEL: Record<StatementBreakdown['direction'], string> = {
  PLATFORM_PAYS_CARRIER: 'مستحق للشركة من المنصة',
  CARRIER_PAYS_PLATFORM: 'مستحق على الشركة للمنصة',
  NOTHING_DUE: 'لا يوجد مبلغ مستحق',
};

/** Line total in the same rule as the net (for the per-trip table). */
export function lineNetMinor(l: StatementLine, bearer: CommissionBearer): number {
  return l.onlineMinor + l.brokerMinor + l.platformDiscountMinor - l.refundsMinor - l.platformFeeMinor - (bearer === 'CARRIER' ? l.brokerCommissionMinor : 0);
}

/** GET /carrier/reports/cash-by-driver row. */
export type CashByDriverRow = {
  driver: { id: string; displayName?: string; driverCode?: string };
  tickets: number;
  collectedMinor: number;
};
