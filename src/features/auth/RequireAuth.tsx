import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';

/** Gate for the whole portal shell: shows a loader while the session is restored. */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface-variant" dir="rtl">
        <span className="material-symbols-outlined animate-spin text-secondary me-2">progress_activity</span>
        جارٍ التحقق من الجلسة…
      </div>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
};

/** Hides children unless the employee holds the permission (UI only — the API enforces it too). */
export const Can: React.FC<{ permission: string; children: React.ReactNode; fallback?: React.ReactNode }> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
};

/** Route guard: pages the employee lacks the permission for show a notice instead (the API refuses them too). */
export const RequirePermission: React.FC<{ permission: string; children: React.ReactNode }> = ({ permission, children }) => {
  const { can } = useAuth();
  if (can(permission)) return <>{children}</>;
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center" role="alert">
      <span className="material-symbols-outlined text-[40px] text-outline">lock</span>
      <h1 className="text-lg font-bold">ليست لديك صلاحية لهذه الصفحة</h1>
      <p className="text-sm text-on-surface-variant">اطلب من مدير الشركة منحك الصلاحية المطلوبة.</p>
    </div>
  );
};
