/**
 * PaymentsManagement UI Component
 * 
 * Displays all payments received from Stripe with customer and lead information.
 * Pure presentation component - all logic is in PaymentsManagement.ts
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SaveViewModal } from '@/components/dashboard/SaveViewModal';
import { EditViewModal } from '@/components/dashboard/EditViewModal';
import { TableActionHeader } from '@/components/dashboard/TableActionHeader';
import { usePaymentsManagement } from './PaymentsManagement';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Package, User, FileText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPaymentFilterFields } from '@/hooks/useTableFilters';
import type { AllPaymentRecord } from '@/hooks/useAllPayments';
import { selectActiveFilters } from '@/store/slices/tableStateSlice';
import { useAppSelector } from '@/store/hooks';

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

const PaymentsManagement = () => {
  const sidebarWidth = useSidebarWidth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const {
    payments,
    isLoadingPayments,
    error,
    user,
    handleLogout,
    isSaveViewModalOpen,
    setIsSaveViewModalOpen,
    handleSaveViewClick,
    getCurrentFilterConfig,
    savedView,
    defaultView,
  } = usePaymentsManagement();
  
  // Generate filter fields with all renderable columns
  const paymentFilterFields = useMemo(() => {
    return getPaymentFilterFields(payments || [], undefined);
  }, [payments]);

  const activeFilters = useAppSelector((state) => selectActiveFilters(state, 'payments'));

  const [isEditViewModalOpen, setIsEditViewModalOpen] = useState(false);
  const [viewToEdit, setViewToEdit] = useState<any>(null);

  // Auto-navigate to default view if no view_id is present
  useEffect(() => {
    if (!viewId && defaultView) {
      navigate(`/dashboard/payments?view_id=${defaultView.id}`, { replace: true });
    }
  }, [viewId, defaultView, navigate]);

  const handleEditViewClick = useCallback((view: any) => {
    setViewToEdit(view);
    setIsEditViewModalOpen(true);
  }, []);

  // Determine the title to show
  const pageTitle = viewId && savedView?.view_name 
    ? savedView.view_name 
    : 'כל התשלומים';

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

  const handleRowClick = (payment: AllPaymentRecord) => {
    // Navigate to customer profile if customer_id exists
    if (payment.customer_id) {
      navigate(`/dashboard/customers/${payment.customer_id}`);
    }
  };

  return (
    <>
      <DashboardHeader
        userEmail={user?.email}
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar onSaveViewClick={handleSaveViewClick} onEditViewClick={handleEditViewClick} />}
      />

      <div className="min-h-screen" dir="rtl" style={{ paddingTop: '60px' }}>
        <main
          className="bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto transition-all duration-300 ease-in-out"
          style={{
            marginRight: `${sidebarWidth.width}px`,
            minHeight: 'calc(100vh - 60px)',
          }}
        >
          <div className="p-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <TableActionHeader
                resourceKey="payments"
                title={pageTitle}
                dataCount={payments.length}
                singularLabel="תשלום"
                pluralLabel="תשלומים"
                filterFields={useMemo(() => getPaymentFilterFields(payments || [], undefined), [payments])}
                searchPlaceholder="חיפוש לפי מוצר, לקוח או תאריך..."
                enableColumnVisibility={false}
                enableFilters={true}
                enableGroupBy={false}
                enableSearch={true}
              />

              {/* Table Content */}
              <div className="bg-white">
                {isLoadingPayments ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9] mb-2"></div>
                    <p className="text-gray-600">טוען תשלומים...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-600 mb-2">שגיאה בטעינת התשלומים</p>
                    <p className="text-sm text-gray-500">{error.message}</p>
                  </div>
                ) : payments && payments.length > 0 ? (
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="font-semibold text-slate-700">מוצר</TableHead>
                        <TableHead className="font-semibold text-slate-700">מחיר</TableHead>
                        <TableHead className="font-semibold text-slate-700">לקוח</TableHead>
                        <TableHead className="font-semibold text-slate-700">ליד</TableHead>
                        <TableHead className="font-semibold text-slate-700">סטטוס תשלום</TableHead>
                        <TableHead className="font-semibold text-slate-700">תאריך</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => {
                        const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                        
                        return (
                          <TableRow
                            key={payment.id}
                            onClick={() => handleRowClick(payment)}
                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-slate-900">
                                  {payment.product_name || 'ללא שם מוצר'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-bold text-slate-900">
                                {formatCurrency(payment.amount, payment.currency)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {payment.customer_name ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                  <span className="text-sm text-slate-900">
                                    {payment.customer_name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {payment.lead_name ? (
                                <span className="text-sm text-slate-900">{payment.lead_name}</span>
                              ) : payment.lead_id ? (
                                <span className="text-sm text-slate-500">ליד #{payment.lead_id.slice(0, 8)}</span>
                              ) : (
                                <span className="text-sm text-slate-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  'text-xs font-semibold px-2.5 py-1 border',
                                  statusConfig.className
                                )}
                              >
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <span className="text-sm text-slate-600">
                                  {formatDate(payment.date)}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">אין תשלומים זמינים</p>
                    <p className="text-sm">לא נמצאו תשלומים במערכת</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Save View Modal */}
      <SaveViewModal
        isOpen={isSaveViewModalOpen}
        onOpenChange={setIsSaveViewModalOpen}
        resourceKey="payments"
        filterConfig={getCurrentFilterConfig(activeFilters)}
      />

      {/* Edit View Modal */}
      <EditViewModal
        isOpen={isEditViewModalOpen}
        onOpenChange={setIsEditViewModalOpen}
        view={viewToEdit}
        currentFilterConfig={getCurrentFilterConfig(activeFilters)}
        filterFields={getPaymentFilterFields(payments)}
        onSuccess={() => {
          setIsEditViewModalOpen(false);
          setViewToEdit(null);
        }}
      />
    </>
  );
};

export default PaymentsManagement;
