import * as React from 'react';
import type { CarrierPermission, StaffFlags } from './permissions';

/** GET /carrier/auth/me and `employee` of POST /carrier/auth/otp/verify (backend `toEmployeeDto`). */
export type CarrierEmployee = {
  id: string;
  displayName: string;
  phone: string | null;
  role: 'MANAGER' | 'STAFF';
  status: 'ACTIVE' | 'SUSPENDED';
  flags: StaffFlags;
  permissions: CarrierPermission[];
  company: { id: string; name: string; legalName: string; logoUrl: string | null; status: string };
  lastLoginAt: string | null;
  createdAt: string;
};

export type OtpChallenge = { challengeId: string; expiresAt: string; cooldownSeconds: number; devOtp?: string };

export type AuthState = {
  status: 'loading' | 'authenticated' | 'anonymous';
  employee: CarrierEmployee | null;
  requestOtp: (phone: string) => Promise<OtpChallenge>;
  verifyOtp: (input: { phone: string; code: string; challengeId: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads GET /carrier/auth/me (e.g. after a manager changes this employee's permissions). */
  refreshProfile: () => Promise<void>;
  /** Permission check over `employee.permissions` (managers already hold all four). */
  can: (permission: string) => boolean;
  isManager: boolean;
};

export const AuthContext = React.createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
