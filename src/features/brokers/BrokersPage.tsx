import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumbs } from '../../app/shell/Breadcrumbs';
import { Panel, TableShell, Td, Th } from '../../components/shared/common';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { api } from '../../lib/api/client';
import { errorMessage } from '../../lib/api/errors';
import { formatPercent } from '../../lib/money';

/** GET /carrier/brokers row: a broker office assigned to sell this company's trips. */
export type BrokerAssignment = {
  office: { id: string; code: string; name: string; status: 'ACTIVE' | 'SUSPENDED' | string };
  commissionPercent: number;
};

/** `/brokers` — broker offices selling this company and their commission (assigned by the platform). */
export const BrokersPage: React.FC = () => {
  const brokers = useQuery({
    queryKey: ['carrier-brokers'],
    queryFn: ({ signal }) => api.get<BrokerAssignment[]>('/carrier/brokers', undefined, signal).then((r) => r.data),
  });
  const rows = brokers.data ?? [];

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'الشركة' }, { label: 'الوكلاء' }]} />
      <PageHeader
        title="الوكلاء"
        subtitle="مكاتب الوكلاء المعتمدة لبيع تذاكر الشركة ونسبة عمولة كل مكتب. تُدار الإسنادات والنِّسب من إدارة المنصة."
        className="mb-0"
      />
      <Panel>
        {brokers.isLoading ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : brokers.isError ? (
          <ErrorState title="تعذّر تحميل الوكلاء" message={errorMessage(brokers.error)} onRetry={() => brokers.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا توجد مكاتب وكلاء بعد" description="تواصل مع إدارة المنصة لإسناد مكاتب وكلاء لبيع رحلاتك." icon="storefront" />
        ) : (
          <TableShell
            head={
              <>
                <Th>المكتب</Th>
                <Th>الرمز</Th>
                <Th>العمولة</Th>
                <Th>الحالة</Th>
              </>
            }
          >
            {rows.map((r) => (
              <tr key={r.office.id} className="border-t border-surface-container">
                <Td className="font-semibold">{r.office.name}</Td>
                <Td className="font-mono text-xs" dir="ltr">{r.office.code}</Td>
                <Td className="tabular-nums">{formatPercent(r.commissionPercent)}</Td>
                <Td>
                  <Badge variant={r.office.status === 'ACTIVE' ? 'success' : 'error'} dot>
                    {r.office.status === 'ACTIVE' ? 'نشط' : 'موقوف'}
                  </Badge>
                </Td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </div>
  );
};
