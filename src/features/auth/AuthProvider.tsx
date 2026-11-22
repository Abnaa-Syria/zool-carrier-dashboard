import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, onSessionChange, refreshSession, setAccessToken } from '../../lib/api/client';
import { hasPermission } from './permissions';
import { AuthContext, type AuthState, type CarrierEmployee, type OtpChallenge } from './auth-context';

type TokensDto = { accessToken: string; employee: CarrierEmployee };

/** Restores the carrier session from the refresh cookie on load; exposes login/logout + permissions. */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<AuthState['status']>('loading');
  const [employee, setEmployee] = React.useState<CarrierEmployee | null>(null);

  React.useEffect(() => {
    const off = onSessionChange((event, payload) => {
      if (event === 'refreshed') {
        const data = payload as Partial<TokensDto> | undefined;
        if (data?.employee) setEmployee(data.employee);
        setStatus('authenticated');
      } else {
        setAccessToken(null);
        setEmployee(null);
        setStatus('anonymous');
        queryClient.clear();
      }
    });
    let cancelled = false;
    refreshSession().then((ok) => {
      if (!cancelled && !ok) setStatus('anonymous');
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [queryClient]);

  const refreshProfile = React.useCallback(async () => {
    const { data } = await api.get<CarrierEmployee>('/carrier/auth/me');
    setEmployee(data);
  }, []);

  const value = React.useMemo<AuthState>(() => {
    const isManager = employee?.role === 'MANAGER';
    return {
      status,
      employee,
      isManager,
      can: (p) => hasPermission(employee?.permissions, p),
      refreshProfile,
      requestOtp: async (phone) =>
        (await api.post<OtpChallenge>('/carrier/auth/otp/request', { phone }, { noRetry: true })).data,
      verifyOtp: async (input) => {
        const { data } = await api.post<TokensDto>('/carrier/auth/otp/verify', input, { noRetry: true });
        setAccessToken(data.accessToken);
        setEmployee(data.employee);
        setStatus('authenticated');
      },
      logout: async () => {
        try {
          await api.post('/carrier/auth/logout', {}, { noRetry: true });
        } finally {
          setAccessToken(null);
          setEmployee(null);
          setStatus('anonymous');
          queryClient.clear();
        }
      },
    };
  }, [status, employee, queryClient, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
