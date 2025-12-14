import { useParams, useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useCustomer } from '@/hooks/useCustomers';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Phone, Mail, Calendar, Plus, User } from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { AddLeadDialogWithCustomer } from '@/components/dashboard/AddLeadDialogWithCustomer';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const CustomerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { data: customer, isLoading } = useCustomer(id);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/dashboard/customers');
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.location.href = `tel:${customer.phone.replace(/-/g, '')}`;
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      window.location.href = `mailto:${customer.email}`;
    }
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-50 text-gray-700 border-gray-200';
    if (status === 'פעיל') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'לא פעיל') return 'bg-gray-50 text-gray-700 border-gray-200';
    if (status === 'מתקדמת לתהליך') return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">טוען פרטי לקוח...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">לקוח לא נמצא</h2>
          <Button onClick={handleBack} variant="outline">
            חזור לרשימת לקוחות
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen grid grid-rows-[auto_1fr_auto] grid-cols-1" dir="rtl">
        {/* Header */}
        <div style={{ gridColumn: '1 / -1' }}>
          <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />
        </div>

        {/* Main content area with sidebar */}
        <div className="flex relative" style={{ marginTop: '88px', gridColumn: '1 / -1' }}>
          <DashboardSidebar />
          
          <main className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 overflow-y-auto" style={{ marginRight: '256px' }}>
            <div className="p-4">
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200/50">
                {/* Header */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={handleBack}
                        variant="ghost"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <ArrowRight className="ml-2 h-5 w-5" />
                        חזור לרשימת לקוחות
                      </Button>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">{customer.full_name}</h1>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCall}
                            className="text-gray-700 hover:bg-gray-50"
                          >
                            <Phone className="h-4 w-4 ml-2" />
                            {customer.phone}
                          </Button>
                          {customer.email && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleEmail}
                              className="text-gray-700 hover:bg-gray-50"
                            >
                              <Mail className="h-4 w-4 ml-2" />
                              {customer.email}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsAddLeadDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      צור הזדמנות חדשה
                    </Button>
                  </div>
                </div>

                {/* Customer Info Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <Card className="p-4 bg-white border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      מידע אישי
                    </h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500">טלפון</span>
                        <span className="text-base font-semibold text-gray-900 font-mono">
                          {customer.phone}
                        </span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-500">אימייל</span>
                          <span className="text-base font-semibold text-gray-900">{customer.email}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-gray-500">תאריך יצירה</span>
                        <span className="text-base font-semibold text-gray-900">
                          {formatDate(customer.created_at)}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-white border-gray-200 md:col-span-2">
                    <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      סטטיסטיקות
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-blue-600 mb-1">סה"כ לידים</p>
                        <p className="text-2xl font-bold text-blue-900">{customer.leads.length}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-green-600 mb-1">לידים פעילים</p>
                        <p className="text-2xl font-bold text-green-900">
                          {customer.leads.filter((l) => l.status_main === 'פעיל').length}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Leads History Timeline */}
                <Card className="p-4 bg-white border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    היסטוריית לידים
                  </h2>
                  {customer.leads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      אין לידים עבור לקוח זה
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">תאריך יצירה</TableHead>
                            <TableHead className="text-right">סטטוס</TableHead>
                            <TableHead className="text-right">מקור</TableHead>
                            <TableHead className="text-right">מטרת כושר</TableHead>
                            <TableHead className="text-right">פעולות</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customer.leads
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((lead) => (
                              <TableRow
                                key={lead.id}
                                className="cursor-pointer hover:bg-gray-50"
                                onClick={() => navigate(`/leads/${lead.id}`)}
                              >
                                <TableCell className="font-medium">
                                  {formatDate(lead.created_at)}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(lead.status_main || lead.status_sub)}>
                                    {lead.status_sub || lead.status_main || 'ללא סטטוס'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{lead.source || '-'}</TableCell>
                                <TableCell>{lead.fitness_goal || '-'}</TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/leads/${lead.id}`)}
                                  >
                                    צפה פרטים
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add Lead Dialog - Pre-fill with customer data */}
      <AddLeadDialogWithCustomer
        isOpen={isAddLeadDialogOpen}
        onOpenChange={setIsAddLeadDialogOpen}
        customer={customer}
      />
    </>
  );
};

export default CustomerProfile;
