/**
 * PaymentHistoryModal Component
 * 
 * Professional payment history view with high-density information display.
 * Displays payment records for a specific customer/lead.
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText, Calendar, CreditCard, Package } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PaymentRecord {
  id: string;
  date: string;
  product_name: string;
  amount: number;
  status: 'paid' | 'pending' | 'refunded' | 'failed';
  receipt_url?: string | null;
  currency?: string;
  transaction_id?: string;
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  leadId?: string | null;
}

// Status configuration - maps internal status to Hebrew display
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: {
    label: 'שולם',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  pending: {
    label: 'ממתין',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  refunded: {
    label: 'הוחזר',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  failed: {
    label: 'נכשל',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName,
  leadId,
}) => {
  const { data: payments, isLoading, error } = usePaymentHistory(customerId, leadId);

  // Calculate total
  const totalAmount = payments?.reduce((sum, payment) => {
    if (payment.status === 'paid') {
      return sum + (payment.amount || 0);
    }
    return sum;
  }, 0) || 0;

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy | HH:mm', { locale: he });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ILS') => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader className="flex-shrink-0 pb-4 border-b border-slate-200">
          <DialogTitle className="text-xl font-bold text-slate-900">
            היסטוריית תשלומים - {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9] mb-4"></div>
                <p className="text-sm text-gray-600">טוען תשלומים...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-2">שגיאה בטעינת התשלומים</p>
              <p className="text-sm text-gray-500">{error.message}</p>
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-1">אין תשלומים זמינים</p>
              <p className="text-sm text-gray-500">לא נמצאו תשלומים עבור לקוח זה</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Payment Records */}
              {payments.map((payment) => {
                const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                
                return (
                  <Card
                    key={payment.id}
                    className="bg-white border border-slate-200 shadow-sm rounded-xl hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Date & Time */}
                        <div className="md:col-span-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 font-medium mb-0.5">תאריך ושעה</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatDate(payment.date)}
                            </p>
                          </div>
                        </div>

                        {/* Product Name */}
                        <div className="md:col-span-4 flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 font-medium mb-0.5">מוצר</p>
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {payment.product_name || 'ללא שם מוצר'}
                            </p>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="md:col-span-2 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500 font-medium mb-0.5">סכום</p>
                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(payment.amount, payment.currency)}
                            </p>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500 font-medium mb-1.5">סטטוס</p>
                          <Badge
                            className={cn(
                              'text-xs font-semibold px-2.5 py-1 border',
                              statusConfig.className
                            )}
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex items-end justify-end">
                          {payment.receipt_url ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (payment.receipt_url) {
                                      window.open(payment.receipt_url, '_blank');
                                    }
                                  }}
                                  className="h-8 w-8 p-0 text-gray-600 hover:text-[#5B6FB9] hover:bg-[#5B6FB9]/10"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" dir="rtl">
                                <p>הורד קבלה</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="h-8 w-8" /> // Spacer for alignment
                          )}
                        </div>
                      </div>

                      {/* Transaction ID (if available) */}
                      {payment.transaction_id && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">מספר עסקה:</span> {payment.transaction_id}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        {payments && payments.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 font-medium">
                  סה"כ תשלומים: {payments.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">סה"כ שולם:</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

