import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../../app/shell/Breadcrumbs';
import { ConfirmDialog, DetailField, Panel, SectionTitle, TableShell, Td, Th } from '../../../components/shared/common';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ErrorState } from '../../../components/ui/EmptyState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Skeleton } from '../../../components/ui/Skeleton';
import { errorMessage } from '../../../lib/api/errors';
import { formatDateTime } from '../../../lib/dates';
import { useAuth } from '../../auth/auth-context';
import { routeTimeline, stationLabel, useRoute, useUpdateRoute } from '../api';
import { RelatedTripsPanel } from '../components/RelatedTripsPanel';
import { RouteFormModal } from '../components/RouteFormModal';
import { formatDuration } from '../time';

const KIND_LABEL = { origin: 'الانطلاق', stop: 'توقف', destination: 'الوصول' } as const;

/** `/routes/:id` — endpoints, stops with offsets, duration, status, actions and the route's trips. */
export const RouteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();
  const canManage = can('carrier.schedule');
  const route = useRoute(id);
  const update = useUpdateRoute();
  const [editing, setEditing] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const r = route.data;
  const title = r ? `${r.originStation.city.nameAr} ← ${r.destinationStation.city.nameAr}` : 'مسار';
  const crumbs = [{ label: 'التشغيل' }, { label: 'المسارات', path: '/routes' }, { label: r?.code ?? title }];

  if (route.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (route.isError || !r) {
    return (
      <div className="flex flex-col gap-space-md">
        <Breadcrumbs items={crumbs} />
        <ErrorState title="تعذّر تحميل المسار" message={errorMessage(route.error)} onRetry={() => route.refetch()} />
      </div>
    );
  }

  const points = routeTimeline(r);

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={crumbs} />
      <PageHeader
        title={title}
        subtitle={r.code ? `رمز المسار ${r.code}` : undefined}
        className="mb-0"
        badge={<Badge variant={r.isActive ? 'success' : 'neutral'} dot>{r.isActive ? 'نشط' : 'غير نشط'}</Badge>}
        actions={
          canManage ? (
            <>
              <Button variant="outline" icon="edit" onClick={() => setEditing(true)}>تعديل</Button>
              <Button variant={r.isActive ? 'danger' : 'primary'} icon={r.isActive ? 'pause_circle' : 'play_circle'} onClick={() => setToggling(true)}>
                {r.isActive ? 'تعطيل المسار' : 'تفعيل المسار'}
              </Button>
            </>
          ) : null
        }
      />

      <Panel>
        <dl className="grid gap-space-md sm:grid-cols-4">
          <DetailField label="الانطلاق">{stationLabel(r.originStation)}</DetailField>
          <DetailField label="الوصول">{stationLabel(r.destinationStation)}</DetailField>
          <DetailField label="مدة الرحلة">{formatDuration(r.durationMinutes)}</DetailField>
          <DetailField label="التوقفات">{r.stops.length === 0 ? 'مباشر' : `${r.stops.length} توقف`}</DetailField>
          <DetailField label="أُنشئ">{formatDateTime(r.createdAt)}</DetailField>
        </dl>
      </Panel>

      <Panel>
        <SectionTitle title="المحطات والتوقيت من لحظة المغادرة" />
        <TableShell
          head={
            <>
              <Th>#</Th>
              <Th>المحطة</Th>
              <Th>النوع</Th>
              <Th>الوصول بعد</Th>
              <Th>مدة التوقف</Th>
              <Th>المغادرة بعد</Th>
            </>
          }
        >
          {points.map((p, i) => (
            <tr key={p.key} className="border-t border-surface-container">
              <Td className="tabular-nums text-on-surface-variant">{i + 1}</Td>
              <Td className="font-medium">{stationLabel(p.station)}</Td>
              <Td>
                <Badge size="sm" variant={p.kind === 'stop' ? 'neutral' : 'secondary'}>{KIND_LABEL[p.kind]}</Badge>
              </Td>
              <Td className="tabular-nums">{p.kind === 'origin' ? '—' : formatDuration(p.arriveOffset)}</Td>
              <Td className="tabular-nums">{p.kind === 'stop' ? formatDuration(p.dwellMinutes) : '—'}</Td>
              <Td className="tabular-nums">{p.departOffset === null ? '—' : p.kind === 'origin' ? 'عند الانطلاق' : formatDuration(p.departOffset)}</Td>
            </tr>
          ))}
        </TableShell>
        <p className="mt-2 text-xs text-on-surface-variant">تعديل التوقفات أو المدة يُطبَّق على الرحلات التي تُجدول بعد التعديل فقط.</p>
      </Panel>

      <RelatedTripsPanel scope={{ routeId: r.id }} title="رحلات المسار" emptyText="لم تُجدول رحلات على هذا المسار بعد." />

      {editing && <RouteFormModal route={r} onClose={() => setEditing(false)} />}
      <ConfirmDialog
        open={toggling}
        onOpenChange={(o) => {
          setToggling(o);
          if (!o) update.reset();
        }}
        title={r.isActive ? `تعطيل المسار ${r.code ?? title}؟` : `تفعيل المسار ${r.code ?? title}؟`}
        confirmText={r.isActive ? 'تعطيل' : 'تفعيل'}
        danger={r.isActive}
        pending={update.isPending}
        error={update.error}
        onConfirm={() => update.mutate({ id: r.id, patch: { isActive: !r.isActive } }, { onSuccess: () => setToggling(false) })}
      >
        {r.isActive
          ? 'هذا بديل الحذف: لن يظهر المسار في جدولة رحلات جديدة، والرحلات المجدولة عليه تبقى كما هي (ألغِها من صفحة كل رحلة إن لزم). يمكن إعادة تفعيله لاحقًا.'
          : 'سيعود المسار متاحًا لجدولة رحلات جديدة.'}
      </ConfirmDialog>
    </div>
  );
};
