import * as React from 'react';
import { Button } from '../ui/Button';

/** Previous/next pager for API `meta` ({ page, totalPages, total }). Hidden when there is a single page. */
export const SimplePager: React.FC<{
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}> = ({ page, totalPages, total, onPageChange, disabled }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-space-sm text-xs text-on-surface-variant pt-space-sm">
      <span>
        صفحة {page} من {totalPages}
        {total !== undefined && ` · ${total.toLocaleString('en-US')} سجل`}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" icon="chevron_right" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          السابق
        </Button>
        <Button size="sm" variant="outline" icon="chevron_left" iconPosition="end" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
          التالي
        </Button>
      </div>
    </div>
  );
};
