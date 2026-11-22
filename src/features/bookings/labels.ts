export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'PENDING_PAYMENT' | 'CHANGED' | 'EXPIRED';
export type BookingChannel = 'DIRECT' | 'BROKER';
export type PaymentMethod = 'ONLINE' | 'WALLET' | 'CASH_ON_BOARD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'UNPAID_CASH' | 'PAID_CASH' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMED: 'مؤكد',
  CANCELLED: 'ملغى',
  PENDING_PAYMENT: 'بانتظار الدفع',
  CHANGED: 'مُعدّل',
  EXPIRED: 'منتهي',
};

export const BOOKING_STATUS_VARIANT: Record<BookingStatus, 'success' | 'error' | 'warning' | 'info' | 'neutral'> = {
  CONFIRMED: 'success',
  CANCELLED: 'error',
  PENDING_PAYMENT: 'warning',
  CHANGED: 'info',
  EXPIRED: 'neutral',
};

/** Keyed by string so manifest rows (typed loosely) can use them too. */
export const CHANNEL_LABEL: Record<string, string> = { DIRECT: 'تطبيق العميل', BROKER: 'وكيل' };

export const PAYMENT_METHOD_LABEL: Record<string, string> = { ONLINE: 'دفع إلكتروني', WALLET: 'محفظة الوكيل', CASH_ON_BOARD: 'نقدًا للسائق' };

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'معلّق',
  PAID: 'مدفوع',
  UNPAID_CASH: 'نقدًا — لم يُحصَّل',
  PAID_CASH: 'نقدًا — حُصِّل',
  REFUNDED: 'مُسترد',
  PARTIALLY_REFUNDED: 'مُسترد جزئيًا',
};
