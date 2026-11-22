import * as React from 'react';
import { Breadcrumbs } from '../../app/shell/Breadcrumbs';
import { ConfirmDialog, Panel, TableShell, Td, Th } from '../../components/shared/common';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { errorMessage } from '../../lib/api/errors';
import { formatDateTime } from '../../lib/dates';
import { cn } from '../../lib/utils';
import { useAuth, type CarrierEmployee } from '../auth/auth-context';
import { CARRIER_PERMISSIONS, PERMISSION_FLAG, PERMISSION_LABEL, permissionsFor, type StaffFlags } from '../auth/permissions';
import { changedFlags, useCreateStaff, useStaff, useUpdateStaff, type StaffPatch } from './api';

const NO_FLAGS: StaffFlags = { canManageFleet: false, canManageSchedule: false, canViewFinance: false, canManageStaff: false };

/** `/staff` (carrier.staff): company employees, roles and permission toggles. */
export const StaffPage: React.FC = () => {
  const { employee: me, refreshProfile } = useAuth();
  const staff = useStaff();
  const update = useUpdateStaff();
  const [editing, setEditing] = React.useState<CarrierEmployee | 'new' | null>(null);
  const [toggling, setToggling] = React.useState<CarrierEmployee | null>(null);
  const rows = staff.data ?? [];
  const suspending = toggling?.status === 'ACTIVE';

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-md">
      <Breadcrumbs items={[{ label: 'الشركة' }, { label: 'الموظفون' }]} />
      <PageHeader
        title="الموظفون"
        subtitle="حسابات موظفي الشركة في هذه اللوحة. المدير يملك كل الصلاحيات؛ الموظف يملك ما تمنحه له فقط. أي تغيير في الدور أو الصلاحيات أو الحالة يُنهي جلسات الموظف فورًا."
        className="mb-0"
        actions={<Button icon="person_add" onClick={() => setEditing('new')}>إضافة موظف</Button>}
      />

      <Panel>
        {staff.isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : staff.isError ? (
          <ErrorState title="تعذّر تحميل الموظفين" message={errorMessage(staff.error)} onRetry={() => staff.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا يوجد موظفون" icon="group" />
        ) : (
          <TableShell
            head={
              <>
                <Th>الموظف</Th>
                <Th>الهاتف</Th>
                <Th>الدور</Th>
                <Th>الصلاحيات</Th>
                <Th>آخر دخول</Th>
                <Th>الحالة</Th>
                <Th className="text-left">إجراءات</Th>
              </>
            }
          >
            {rows.map((e) => {
              const self = e.id === me?.id;
              return (
                <tr key={e.id} className="border-t border-surface-container align-top">
                  <Td className="font-semibold">
                    {e.displayName}
                    {self && <span className="text-xs font-normal text-on-surface-variant"> (أنت)</span>}
                  </Td>
                  <Td className="font-mono text-xs" dir="ltr">{e.phone ?? '—'}</Td>
                  <Td>
                    <Badge variant={e.role === 'MANAGER' ? 'secondary' : 'neutral'}>{e.role === 'MANAGER' ? 'مدير' : 'موظف'}</Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {e.permissions.length === 0 ? (
                        <span className="text-xs text-on-surface-variant">عرض فقط</span>
                      ) : (
                        e.permissions.map((p) => (
                          <Badge key={p} size="sm" variant="info">{PERMISSION_LABEL[p]?.title ?? p}</Badge>
                        ))
                      )}
                    </div>
                  </Td>
                  <Td className="text-xs text-on-surface-variant">{formatDateTime(e.lastLoginAt)}</Td>
                  <Td>
                    <Badge variant={e.status === 'ACTIVE' ? 'success' : 'error'} dot>{e.status === 'ACTIVE' ? 'نشط' : 'موقوف'}</Badge>
                  </Td>
                  <Td className="text-left whitespace-nowrap">
                    <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(e)}>تعديل</Button>
                    {!self && (
                      <Button size="sm" variant="ghost" icon={e.status === 'ACTIVE' ? 'block' : 'check_circle'} onClick={() => setToggling(e)}>
                        {e.status === 'ACTIVE' ? 'إيقاف' : 'إعادة التفعيل'}
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </TableShell>
        )}
      </Panel>

      {editing && (
        <StaffModal
          employee={editing === 'new' ? null : editing}
          isSelf={editing !== 'new' && editing.id === me?.id}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            if (saved.id === me?.id) void refreshProfile();
          }}
        />
      )}

      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(o) => {
          if (!o) {
            setToggling(null);
            update.reset();
          }
        }}
        title={suspending ? `إيقاف ${toggling?.displayName ?? ''}؟` : `إعادة تفعيل ${toggling?.displayName ?? ''}؟`}
        confirmText={suspending ? 'إيقاف وإنهاء الجلسات' : 'إعادة التفعيل'}
        danger={suspending}
        pending={update.isPending}
        error={update.error}
        onConfirm={() =>
          toggling && update.mutate({ id: toggling.id, patch: { status: suspending ? 'SUSPENDED' : 'ACTIVE' } }, { onSuccess: () => setToggling(null) })
        }
      >
        {suspending
          ? 'سيتم تسجيل خروج الموظف فورًا ولن يتمكن من الدخول حتى يُعاد تفعيله. يجب أن يبقى للشركة مدير نشط واحد على الأقل.'
          : 'سيتمكن الموظف من تسجيل الدخول مجددًا برقم هاتفه.'}
      </ConfirmDialog>
    </div>
  );
};

const StaffModal: React.FC<{ employee: CarrierEmployee | null; isSelf: boolean; onClose: () => void; onSaved: (e: CarrierEmployee) => void }> = ({
  employee,
  isSelf,
  onClose,
  onSaved,
}) => {
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const mutation = employee ? update : create;
  const [displayName, setDisplayName] = React.useState(employee?.displayName ?? '');
  const [phone, setPhone] = React.useState('');
  const [role, setRole] = React.useState<'MANAGER' | 'STAFF'>(employee?.role ?? 'STAFF');
  const [flags, setFlags] = React.useState<StaffFlags>(employee?.flags ?? NO_FLAGS);

  const nameError = displayName.trim().length < 2 ? 'الاسم مطلوب (حرفان على الأقل)' : null;
  const phoneError = !employee && (phone.trim().length < 6 || phone.trim().length > 32) ? 'رقم الهاتف مطلوب (مثل ‎+249912345678)' : null;
  const effective = permissionsFor({ ...flags, role });

  const patch: StaffPatch = {};
  if (employee) {
    if (displayName.trim() !== employee.displayName) patch.displayName = displayName.trim();
    if (role !== employee.role) patch.role = role;
    const diff = changedFlags(employee.flags, flags);
    if (Object.keys(diff).length > 0) patch.flags = diff;
  }
  const dirty = !employee || Object.keys(patch).length > 0;
  const valid = !nameError && !phoneError;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !dirty) return;
    const done = {
      onSuccess: (saved: CarrierEmployee) => {
        onSaved(saved);
        onClose();
      },
    };
    if (employee) update.mutate({ id: employee.id, patch }, done);
    else create.mutate({ displayName: displayName.trim(), phone: phone.trim(), role, ...(role === 'STAFF' ? { flags } : {}) }, done);
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent>
        <form onSubmit={submit} className="grid gap-4">
          <ModalHeader>
            <ModalTitle>{employee ? `تعديل ${employee.displayName}` : 'إضافة موظف'}</ModalTitle>
            <ModalDescription>
              {employee ? 'رقم الهاتف ثابت. تغيير الدور أو الصلاحيات يُنهي جلسات الموظف ليُطبَّق فورًا.' : 'يسجّل الموظف الدخول برقم هاتفه ورمز تحقق.'}
            </ModalDescription>
          </ModalHeader>

          <Input label="الاسم" value={displayName} onChange={(e) => setDisplayName(e.target.value)} error={displayName ? nameError ?? undefined : undefined} maxLength={160} />
          {!employee && (
            <Input label="رقم الهاتف" dir="ltr" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={phone ? phoneError ?? undefined : undefined} maxLength={32} placeholder="+249912345678" />
          )}

          <fieldset className="grid gap-2">
            <legend className="text-xs font-semibold mb-1">الدور</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['STAFF', 'MANAGER'] as const).map((r) => (
                <label
                  key={r}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer',
                    role === r ? 'border-secondary bg-secondary/5' : 'border-outline-variant/50',
                    isSelf && r === 'STAFF' && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <input type="radio" name="role" checked={role === r} disabled={isSelf && r === 'STAFF'} onChange={() => setRole(r)} className="mt-1" />
                  <span>
                    <span className="font-semibold block">{r === 'MANAGER' ? 'مدير' : 'موظف'}</span>
                    <span className="text-xs text-on-surface-variant">{r === 'MANAGER' ? 'كل الصلاحيات تلقائيًا' : 'الصلاحيات المحددة أدناه'}</span>
                  </span>
                </label>
              ))}
            </div>
            {isSelf && <p className="text-xs text-on-surface-variant">لا يمكنك خفض دورك بنفسك.</p>}
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-xs font-semibold mb-1">الصلاحيات</legend>
            <p className="text-xs text-on-surface-variant">كل الموظفين يرون الرئيسية والرحلات والحجوزات وكشوف الركاب والتتبع والوكلاء.</p>
            {CARRIER_PERMISSIONS.map((p) => {
              const flag = PERMISSION_FLAG[p];
              const checked = role === 'MANAGER' || flags[flag];
              return (
                <label key={p} className={cn('flex items-start gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-sm', role === 'MANAGER' ? 'opacity-70' : 'cursor-pointer')}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked}
                    disabled={role === 'MANAGER'}
                    onChange={(e) => setFlags((f) => ({ ...f, [flag]: e.target.checked }))}
                  />
                  <span>
                    <span className="font-semibold block">{PERMISSION_LABEL[p].title}</span>
                    <span className="text-xs text-on-surface-variant">{PERMISSION_LABEL[p].description}</span>
                  </span>
                </label>
              );
            })}
            <p className="text-xs text-on-surface-variant">الصلاحيات الفعلية: {effective.length === 0 ? 'عرض فقط' : effective.map((p) => PERMISSION_LABEL[p].title).join('، ')}</p>
          </fieldset>

          {mutation.isError && <p className="text-xs text-error">{errorMessage(mutation.error)}</p>}
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={!valid || !dirty} isLoading={mutation.isPending}>{employee ? 'حفظ' : 'إضافة'}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
