import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../../app/shell/Breadcrumbs';
import { ConfirmDialog, DetailField, Panel, SectionTitle } from '../../components/shared/common';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { errorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../lib/dates';
import { cn } from '../../lib/utils';
import { useAuth, type CarrierEmployee } from '../auth/auth-context';
import { CARRIER_PERMISSIONS, PERMISSION_FLAG, PERMISSION_LABEL, permissionsFor, type StaffFlags } from '../auth/permissions';
import { accessPatch, useStaff, useUpdateStaff } from './api';
import { StaffModal } from './StaffPage';

/** `/staff/:id` (carrier.staff) — profile, role, permission toggles and status. */
export const StaffDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { employee: me, refreshProfile } = useAuth();
  const staff = useStaff();
  const update = useUpdateStaff();
  const [editing, setEditing] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const e = staff.data?.find((x) => x.id === id);
  const crumbs = [{ label: 'الشركة' }, { label: 'الموظفون', path: '/staff' }, { label: e?.displayName ?? 'موظف' }];

  if (staff.isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (staff.isError || !e) {
    return (
      <div className="flex flex-col gap-space-md">
        <Breadcrumbs items={crumbs} />
        {staff.isError ? (
          <ErrorState title="تعذّر تحميل الموظف" message={errorMessage(staff.error)} onRetry={() => staff.refetch()} />
        ) : (
          <EmptyState title="الموظف غير موجود" description="لا يوجد موظف بهذا المعرّف في الشركة." icon="group" />
        )}
      </div>
    );
  }

  const self = e.id === me?.id;
  const suspending = e.status === 'ACTIVE';
  const onSaved = (saved: CarrierEmployee) => {
    if (saved.id === me?.id) void refreshProfile();
  };

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={crumbs} />
      <PageHeader
        title={`${e.displayName}${self ? ' (أنت)' : ''}`}
        subtitle={e.role === 'MANAGER' ? 'مدير — كل الصلاحيات' : 'موظف — الصلاحيات الممنوحة فقط'}
        className="mb-0"
        badge={<Badge variant={e.status === 'ACTIVE' ? 'success' : 'error'} dot>{e.status === 'ACTIVE' ? 'نشط' : 'موقوف'}</Badge>}
        actions={
          <>
            <Button variant="outline" icon="edit" onClick={() => setEditing(true)}>تعديل</Button>
            {!self && (
              <Button variant={suspending ? 'danger' : 'primary'} icon={suspending ? 'block' : 'check_circle'} onClick={() => setToggling(true)}>
                {suspending ? 'إيقاف الموظف' : 'إعادة التفعيل'}
              </Button>
            )}
          </>
        }
      />

      <Panel>
        <SectionTitle title="الملف الشخصي" />
        <dl className="grid gap-space-md sm:grid-cols-4">
          <DetailField label="الاسم">{e.displayName}</DetailField>
          <DetailField label="الهاتف"><span dir="ltr" className="font-mono">{e.phone ?? '—'}</span></DetailField>
          <DetailField label="الدور">{e.role === 'MANAGER' ? 'مدير' : 'موظف'}</DetailField>
          <DetailField label="الحالة">{e.status === 'ACTIVE' ? 'نشط' : 'موقوف'}</DetailField>
          <DetailField label="آخر دخول">{formatDateTime(e.lastLoginAt)}</DetailField>
          <DetailField label="أُضيف">{formatDateTime(e.createdAt)}</DetailField>
        </dl>
      </Panel>

      {/* keyed so the toggles reseed after a save */}
      <AccessPanel key={`${e.role}|${JSON.stringify(e.flags)}`} employee={e} isSelf={self} onSaved={onSaved} />

      {editing && <StaffModal employee={e} isSelf={self} onClose={() => setEditing(false)} onSaved={onSaved} />}
      <ConfirmDialog
        open={toggling}
        onOpenChange={(o) => {
          setToggling(o);
          if (!o) update.reset();
        }}
        title={suspending ? `إيقاف ${e.displayName}؟` : `إعادة تفعيل ${e.displayName}؟`}
        confirmText={suspending ? 'إيقاف وإنهاء الجلسات' : 'إعادة التفعيل'}
        danger={suspending}
        pending={update.isPending}
        error={update.error}
        onConfirm={() => update.mutate({ id: e.id, patch: { status: suspending ? 'SUSPENDED' : 'ACTIVE' } }, { onSuccess: () => setToggling(false) })}
      >
        {suspending
          ? 'هذا بديل الحذف: يُسجَّل خروج الموظف فورًا ولا يستطيع الدخول حتى يُعاد تفعيله، ويبقى سجله محفوظًا. يجب أن يبقى للشركة مدير نشط واحد على الأقل.'
          : 'سيتمكن الموظف من تسجيل الدخول مجددًا برقم هاتفه.'}
      </ConfirmDialog>
    </div>
  );
};

/** Role + permission toggles saved with one PATCH (only what changed). */
const AccessPanel: React.FC<{ employee: CarrierEmployee; isSelf: boolean; onSaved: (e: CarrierEmployee) => void }> = ({ employee, isSelf, onSaved }) => {
  const update = useUpdateStaff();
  const [role, setRole] = React.useState(employee.role);
  const [flags, setFlags] = React.useState<StaffFlags>(employee.flags);
  const patch = accessPatch(employee, role, flags);
  const dirty = Object.keys(patch).length > 0;
  const effective = permissionsFor({ ...flags, role });

  return (
    <Panel>
      <SectionTitle title="الدور والصلاحيات">
        <div className="flex gap-2">
          {dirty && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRole(employee.role);
                setFlags(employee.flags);
                update.reset();
              }}
            >
              تراجع
            </Button>
          )}
          <Button size="sm" icon="save" disabled={!dirty} isLoading={update.isPending} onClick={() => update.mutate({ id: employee.id, patch }, { onSuccess: onSaved })}>
            حفظ الصلاحيات
          </Button>
        </div>
      </SectionTitle>
      <p className="text-xs text-on-surface-variant mb-3">
        كل الموظفين يرون الرئيسية والرحلات والحجوزات وكشوف الركاب والتتبع والوكلاء. أي تغيير هنا يُنهي جلسات الموظف ليُطبَّق فورًا.
      </p>

      <div className="grid gap-2 sm:grid-cols-2 mb-3">
        {(['STAFF', 'MANAGER'] as const).map((r) => (
          <label
            key={r}
            className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer',
              role === r ? 'border-secondary bg-secondary/5' : 'border-outline-variant/50',
              isSelf && r === 'STAFF' && 'opacity-50 cursor-not-allowed',
            )}
          >
            <input type="radio" name="detail-role" checked={role === r} disabled={isSelf && r === 'STAFF'} onChange={() => setRole(r)} className="mt-1" />
            <span>
              <span className="font-semibold block">{r === 'MANAGER' ? 'مدير' : 'موظف'}</span>
              <span className="text-xs text-on-surface-variant">{r === 'MANAGER' ? 'كل الصلاحيات تلقائيًا' : 'الصلاحيات المحددة أدناه'}</span>
            </span>
          </label>
        ))}
      </div>
      {isSelf && <p className="text-xs text-on-surface-variant mb-2">لا يمكنك خفض دورك بنفسك.</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {CARRIER_PERMISSIONS.map((p) => {
          const flag = PERMISSION_FLAG[p];
          const checked = role === 'MANAGER' || flags[flag];
          return (
            <label
              key={p}
              className={cn('flex items-start gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-sm', role === 'MANAGER' ? 'opacity-70' : 'cursor-pointer')}
            >
              <input
                type="checkbox"
                role="switch"
                aria-checked={checked}
                className="mt-1"
                checked={checked}
                disabled={role === 'MANAGER'}
                onChange={(ev) => setFlags((f) => ({ ...f, [flag]: ev.target.checked }))}
              />
              <span>
                <span className="font-semibold block">{PERMISSION_LABEL[p].title}</span>
                <span className="text-xs text-on-surface-variant">{PERMISSION_LABEL[p].description}</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-on-surface-variant">
        الصلاحيات الفعلية: {effective.length === 0 ? 'عرض فقط' : effective.map((p) => PERMISSION_LABEL[p].title).join('، ')}
      </p>
      {update.isError && <p className="mt-2 text-xs text-error">{errorMessage(update.error)}</p>}
    </Panel>
  );
};
