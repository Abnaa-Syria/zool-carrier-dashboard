import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { FeeConfig, StatementLine, StatementTotals } from '../reports/statement';

export type SettlementStatus = 'DRAFT' | 'FINALIZED' | 'PAID' | 'CANCELLED';

/** GET /carrier/settlements row and /carrier/settlements/:id (with `lines`) — backend `toSettlementDto`. */
export type Settlement = {
  id: string;
  company: { id: string; name: string };
  /** Half-open UTC period [periodFrom, periodTo) covering whole Sudan days. */
  periodFrom: string;
  periodTo: string;
  status: SettlementStatus;
  config: FeeConfig;
  ticketsCount: number;
  onlineSalesMinor: number;
  brokerSalesMinor: number;
  cashSalesMinor: number;
  refundsMinor: number;
  platformDiscountMinor: number;
  platformFeeMinor: number;
  brokerCommissionMinor: number;
  netPayableMinor: number;
  direction: 'PLATFORM_PAYS_CARRIER' | 'CARRIER_PAYS_PLATFORM';
  paymentReference: string | null;
  notes: string | null;
  finalizedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  currency: 'SDG';
  lines?: StatementLine[];
};

export function totalsFromSettlement(s: Settlement): StatementTotals {
  return {
    config: s.config,
    ticketsCount: s.ticketsCount,
    onlineMinor: s.onlineSalesMinor,
    brokerMinor: s.brokerSalesMinor,
    cashMinor: s.cashSalesMinor,
    refundsMinor: s.refundsMinor,
    platformDiscountMinor: s.platformDiscountMinor,
    platformFeeMinor: s.platformFeeMinor,
    brokerCommissionMinor: s.brokerCommissionMinor,
    netPayableMinor: s.netPayableMinor,
  };
}

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  DRAFT: 'مسودة (قيد المراجعة)',
  FINALIZED: 'معتمدة — بانتظار الدفع',
  PAID: 'مدفوعة',
  CANCELLED: 'ملغاة',
};

export const SETTLEMENT_STATUS_VARIANT: Record<SettlementStatus, 'neutral' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'neutral',
  FINALIZED: 'warning',
  PAID: 'success',
  CANCELLED: 'error',
};

export function useSettlements(filters: { page: number; pageSize: number; status?: SettlementStatus }) {
  return useQuery({
    queryKey: ['carrier-settlements', filters],
    queryFn: ({ signal }) => api.get<Settlement[]>('/carrier/settlements', filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSettlement(id: string | undefined) {
  return useQuery({
    queryKey: ['carrier-settlement', id ?? ''],
    queryFn: ({ signal }) => api.get<Settlement>(`/carrier/settlements/${id}`, undefined, signal).then((r) => r.data),
    enabled: Boolean(id),
  });
}
