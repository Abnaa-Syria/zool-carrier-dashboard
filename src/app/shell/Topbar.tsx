import * as React from 'react';
import { cn } from '../../lib/utils';
import { formatLongDate } from '../../lib/dates';
import { useAuth } from '../../features/auth/auth-context';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../components/ui/DropdownMenu';

export interface TopbarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  onOpenMobileSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ isSidebarCollapsed, onToggleSidebarCollapse, onOpenMobileSidebar }) => {
  const { employee, logout } = useAuth();
  const [today] = React.useState(() => formatLongDate(new Date()));
  const initials = (employee?.displayName ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('');

  return (
    <header
      className={cn(
        'fixed top-0 left-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 px-space-md lg:px-space-lg flex items-center justify-between gap-space-md transition-all duration-300',
        isSidebarCollapsed ? 'lg:right-20 right-0' : 'lg:right-72 right-0',
      )}
    >
      {/* Right side: menu toggles + company */}
      <div className="flex items-center gap-space-sm flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="فتح القائمة الرئيسية"
          className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            aria-label="توسيع القائمة الجانبية"
            title="توسيع القائمة الجانبية"
            className="hidden lg:flex p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          {employee?.company.logoUrl ? (
            <img src={employee.company.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <span className="material-symbols-outlined text-secondary text-[24px]">apartment</span>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-on-surface truncate">{employee?.company.name}</span>
            <span className="text-[11px] text-on-surface-variant truncate">لوحة شركة النقل</span>
          </div>
        </div>
      </div>

      {/* Left side: date + account */}
      <div className="flex items-center gap-space-sm">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-xs font-semibold shadow-xs border border-outline-variant/30">
          <span className="material-symbols-outlined text-secondary text-[16px]">calendar_today</span>
          <span>اليوم: {today}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="قائمة حساب الموظف"
              className="flex items-center gap-space-xs p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-transform active:scale-95"
            >
              <div className="w-8 h-8 rounded-full bg-secondary-container text-secondary font-bold flex items-center justify-center text-xs ring-2 ring-surface-container-high shadow-xs">
                {initials}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 text-right">
            <div className="px-2 py-1.5 border-b border-outline-variant/30 mb-1">
              <span className="text-xs font-bold block text-on-surface">{employee?.displayName}</span>
              <span className="text-[11px] text-on-surface-variant block">
                {employee ? `${employee.role === 'MANAGER' ? 'مدير الشركة' : 'موظف'} — ${employee.company.name}` : '—'}
              </span>
              {employee?.phone && (
                <span className="text-[10px] text-outline block mt-0.5 font-mono" dir="ltr">
                  {employee.phone}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => void logout()}>
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
