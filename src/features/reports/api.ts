import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { DateRange } from '../../lib/range';
import type { CarrierStatement, CashByDriverRow } from './statement';

/** Live statement for Sudan days [from, to] (carrier.finance). */
export function useStatement(range: DateRange, enabled: boolean) {
  return useQuery({
    queryKey: ['carrier-reports', 'statement', range],
    queryFn: ({ signal }) => api.get<CarrierStatement>('/carrier/reports/statement', range, signal).then((r) => r.data),
    enabled,
  });
}

/** Cash collected by each driver (boarding of CASH_ON_BOARD tickets) in the period. */
export function useCashByDriver(range: DateRange, enabled: boolean) {
  return useQuery({
    queryKey: ['carrier-reports', 'cash-by-driver', range],
    queryFn: ({ signal }) =>
      api.get<CashByDriverRow[]>('/carrier/reports/cash-by-driver', range, signal).then((r) => ({
        rows: r.data,
        totalMinor: typeof r.meta?.totalMinor === 'number' ? r.meta.totalMinor : r.data.reduce((n, d) => n + d.collectedMinor, 0),
      })),
    enabled,
  });
}
