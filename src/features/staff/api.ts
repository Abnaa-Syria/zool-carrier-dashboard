import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/client';
import type { CarrierEmployee } from '../auth/auth-context';
import type { StaffFlags } from '../auth/permissions';

export type CreateStaffInput = { displayName: string; phone: string; role?: 'MANAGER' | 'STAFF'; flags?: Partial<StaffFlags> };
export type StaffPatch = Partial<{ displayName: string; role: 'MANAGER' | 'STAFF'; status: 'ACTIVE' | 'SUSPENDED'; flags: Partial<StaffFlags> }>;

const key = ['carrier-staff'] as const;

export function useStaff() {
  return useQuery({ queryKey: key, queryFn: ({ signal }) => api.get<CarrierEmployee[]>('/carrier/staff', undefined, signal).then((r) => r.data) });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => api.post<CarrierEmployee>('/carrier/staff', input).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Role / flag / status changes revoke that employee's sessions server-side. */
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; patch: StaffPatch }) => api.patch<CarrierEmployee>(`/carrier/staff/${v.id}`, v.patch).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Only the flags that differ from the current ones (pure; unit-tested). */
export function changedFlags(current: StaffFlags, next: StaffFlags): Partial<StaffFlags> {
  const out: Partial<StaffFlags> = {};
  for (const k of Object.keys(next) as Array<keyof StaffFlags>) if (current[k] !== next[k]) out[k] = next[k];
  return out;
}
