import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAppSelector } from '@/store/hooks';
import { useCustomer } from '@/hooks/useCustomers';
import { useUpdateLead } from '@/hooks/useUpdateLead';
import { InlineEditableField } from '@/components/dashboard/InlineEditableField';
import { InlineEditableBadge } from '@/components/dashboard/InlineEditableBadge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkoutSummaryCard } from '@/components/dashboard/WorkoutSummaryCard';
import { NutritionSummaryCard } from '@/components/dashboard/NutritionSummaryCard';
import { DailyProtocolGrid } from '@/components/dashboard/DailyProtocolGrid';
import { CustomerHistoryTabs } from '@/components/dashboard/CustomerHistoryTabs';
import { 
  Phone, 
  MessageCircle, 
  Mail, 
  ArrowRight,
  User,
  Wallet,
  Target,
  FileText,
  Calendar,
  ShoppingBag,
  Package,
  Edit,
  TrendingUp,
  Info
} from 'lucide-react';
import { formatDate } from '@/utils/dashboard';
import { 
  FITNESS_GOAL_OPTIONS, 
  ACTIVITY_LEVEL_OPTIONS, 
  PREFERRED_TIME_OPTIONS, 
  SOURCE_OPTIONS 
} from '@/utils/dashboard';
import { STATUS_CATEGORIES } from '@/hooks/useLeadStatus';
import { useLeadStatus } from '@/hooks/useLeadStatus';
import { useDevMode } from '@/hooks/useDevMode';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Helper to get customer initials for avatar
const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Status color mapping
const getStatusColor = (status: string | null) => {
  if (!status) return 'bg-gray-50 text-gray-700 border-gray-200';
  if (status === 'פעיל') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'לא פעיל') return 'bg-gray-50 text-gray-700 border-gray-200';
  if (status === 'מתקדמת לתהליך') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'לא רלוונטי' || status === 'יקר לי' || status === 'חוסר התאמה' || 
      status === 'לא מאמינה במוצר' || status === 'פחד' || status === 'לא הזמן המתאים') {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (status === 'פולואפ' || status === 'ראשוני' || status === 'איכותי') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  // Legacy statuses
  switch (status) {
    case 'חדש':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'בטיפול':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'הושלם':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

// Get status border color for list items
const getStatusBorderColor = (status: string | null) => {
  if (!status) return 'border-r-gray-300';
  if (status === 'פעיל' || status === 'מתקדמת לתהליך') return 'border-r-emerald-500';
  if (status === 'לא רלוונטי' || status === 'יקר לי' || status === 'חוסר התאמה' || 
      status === 'לא מאמינה במוצר' || status === 'פחד' || status === 'לא הזמן המתאים') {
    return 'border-r-red-500';
  }
  if (status === 'פולואפ' || status === 'ראשוני' || status === 'איכותי' || status === 'חדש') {
    return 'border-r-blue-500';
  }
  if (status === 'בטיפול') return 'border-r-amber-500';
  if (status === 'הושלם') return 'border-r-emerald-500';
  return 'border-r-gray-300';
};

interface LeadData {
  id: string;
  created_at: string;
  status_main: string | null;
  status_sub: string | null;
  source: string | null;
  fitness_goal: string | null;
  activity_level: string | null;
  preferred_time: string | null;
  notes: string | null;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  join_date: string | null;
  subscription_data: any;
  assigned_to: string | null;
  customer_id: string;
}

const UnifiedProfileView = () => {
  const params = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { devMode } = useDevMode();
  const updateLead = useUpdateLead();

  // Determine if we're coming from /leads/:id or /dashboard/customers/:id
  const isLeadRoute = location.pathname.startsWith('/leads/');
  const isCustomerRoute = location.pathname.startsWith('/dashboard/customers/');
  const routeId = params.id;

  // State for resolved IDs
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | undefined>(undefined);
  const [selectedInterestId, setSelectedInterestId] = useState<string | undefined>(undefined);

  // If coming from /leads/:id, fetch lead to get customer_id
  const { data: leadData } = useQuery({
    queryKey: ['lead-for-customer', routeId],
    queryFn: async () => {
      if (!routeId || !isLeadRoute) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('customer_id, id')
        .eq('id', routeId)
        .single();
      if (error) throw error;
      return data as { customer_id: string; id: string };
    },
    enabled: !!routeId && isLeadRoute,
  });

  // Update resolved IDs based on route
  useEffect(() => {
    if (isLeadRoute && leadData) {
      setResolvedCustomerId(leadData.customer_id);
      setSelectedInterestId(leadData.id);
    } else if (isCustomerRoute && routeId) {
      setResolvedCustomerId(routeId);
    }
  }, [isLeadRoute, isCustomerRoute, leadData, routeId]);

  // Fetch customer with all leads
  const { data: customer, isLoading: isLoadingCustomer } = useCustomer(resolvedCustomerId);

  // Get all leads for this customer, sorted by date (most recent first)
  const sortedLeads = useMemo(() => {
    if (!customer?.leads) return [];
    return [...customer.leads].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [customer?.leads]);

  // Auto-select most recent lead if none selected
  useEffect(() => {
    if (!selectedInterestId && sortedLeads.length > 0) {
      setSelectedInterestId(sortedLeads[0].id);
    }
  }, [sortedLeads, selectedInterestId]);

  // If route has leadId, use it
  useEffect(() => {
    if (isLeadRoute && leadData?.id && leadData.id !== selectedInterestId) {
      setSelectedInterestId(leadData.id);
    }
  }, [isLeadRoute, leadData, selectedInterestId]);

  // Fetch full lead data for the selected interest
  const { data: activeLead, isLoading: isLoadingLead } = useQuery({
    queryKey: ['lead', selectedInterestId],
    queryFn: async () => {
      if (!selectedInterestId) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', selectedInterestId)
        .single();
      if (error) throw error;
      return data as LeadData;
    },
    enabled: !!selectedInterestId,
  });

  // Status management for active lead
  const statusManagement = useLeadStatus(selectedInterestId || '', activeLead?.status_sub || activeLead?.status_main || '');

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.location.href = `tel:${customer.phone.replace(/-/g, '')}`;
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const phoneNumber = customer.phone.replace(/-/g, '').replace(/^0/, '972');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      window.location.href = `mailto:${customer.email}`;
    }
  };

  const handleInterestSelect = (leadId: string) => {
    setSelectedInterestId(leadId);
    // Update URL to maintain route consistency
    if (isLeadRoute) {
      navigate(`/leads/${leadId}`, { replace: true });
    }
  };

  // Extract subscription data
  const subscriptionData = activeLead?.subscription_data || {};
  const products = useMemo(() => {
    const items = [];
    if (subscriptionData.months > 0) {
      items.push({
        id: 'subscription',
        name: `חבילת מנוי - ${subscriptionData.months} חודשים`,
        price: subscriptionData.initialPrice || 0,
        quantity: 1,
        date: activeLead?.join_date || activeLead?.created_at,
      });
    }
    if (subscriptionData.renewalPrice > 0) {
      items.push({
        id: 'renewal',
        name: 'חידוש חודשי',
        price: subscriptionData.renewalPrice,
        quantity: 1,
        date: activeLead?.join_date || activeLead?.created_at,
      });
    }
    return items;
  }, [subscriptionData, activeLead]);

  // Calculate age from birth date
  const calculateAge = (birthDate: string | null): number => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoadingCustomer || (isLeadRoute && !leadData)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">טוען פרטים...</p>
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
            חזור לדשבורד
          </Button>
        </div>
      </div>
    );
  }

  const displayStatus = activeLead?.status_sub || activeLead?.status_main || 'ללא סטטוס';
  const customerAge = activeLead?.birth_date ? calculateAge(activeLead.birth_date) : 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden" dir="rtl">
      <DashboardHeader
        userEmail={user?.email}
        onLogout={() => {}}
      />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginTop: '88px' }}>
        <div className="flex flex-1 overflow-hidden relative">
          <DashboardSidebar />
          <main className="flex-1 bg-gray-50 flex flex-col overflow-hidden" style={{ marginRight: '256px' }}>
            {/* Row 1: Personal Info - Full Width */}
            <div className="w-full bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between gap-6">
                  {/* Right Side (RTL): Client Details */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
                      {getInitials(customer.full_name)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold text-gray-900">{customer.full_name}</h1>
                        <Popover open={statusManagement.isOpen} onOpenChange={(open) => open ? statusManagement.handleOpen() : statusManagement.handleClose()}>
                          <PopoverTrigger asChild>
                            <button
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${getStatusColor(displayStatus)}`}
                            >
                              {displayStatus}
                              <Edit className="h-3 w-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4" align="start" dir="rtl">
                            <div className="space-y-4">
                              <h3 className="font-semibold text-gray-900 mb-3">עדכן סטטוס</h3>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">סטטוס ראשי</label>
                                <Select
                                  value={statusManagement.selectedCategory}
                                  onValueChange={statusManagement.handleCategoryChange}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="בחר סטטוס ראשי" />
                                  </SelectTrigger>
                                  <SelectContent dir="rtl">
                                    {STATUS_CATEGORIES.map((category) => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {statusManagement.hasSubStatuses && statusManagement.selectedCategoryData?.subStatuses && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">סטטוס משני</label>
                                  <Select
                                    value={statusManagement.selectedSubStatus}
                                    onValueChange={statusManagement.handleSubStatusChange}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="בחר סטטוס משני" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                      {statusManagement.selectedCategoryData.subStatuses.map((subStatus) => (
                                        <SelectItem key={subStatus.id} value={subStatus.id}>
                                          {subStatus.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  onClick={statusManagement.handleSave}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  שמור
                                </Button>
                                <Button
                                  onClick={statusManagement.handleClose}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  ביטול
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-mono">{customer.phone}</span>
                        {customerAge > 0 && <span>{customerAge} שנים</span>}
                        {customer.email && <span className="truncate">{customer.email}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Left Side (RTL): Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleBack}
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                      חזור
                    </Button>
                    <Button
                      onClick={handleCall}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      התקשר
                    </Button>
                    <Button
                      onClick={handleWhatsApp}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button
                      onClick={handleEmail}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      אימייל
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Two Columns - Lead History & Lead Details */}
            <div className="flex-1 flex gap-4 p-6 min-h-0 overflow-hidden">
              {/* Column 1 (Right Side - RTL): Lead History */}
              <div className="w-80 flex-shrink-0 flex flex-col min-h-0">
                <Card className="flex-1 flex flex-col overflow-hidden border border-gray-200 rounded-xl shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <h2 className="text-base font-bold text-gray-900">היסטוריית לידים</h2>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {sortedLeads.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm">אין התעניינות</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sortedLeads.map((lead) => {
                          const isActive = lead.id === selectedInterestId;
                          const leadStatus = lead.status_sub || lead.status_main || 'ללא סטטוס';
                          const statusColor = getStatusColor(leadStatus);
                          const borderColor = getStatusBorderColor(leadStatus);

                          return (
                            <div
                              key={lead.id}
                              onClick={() => handleInterestSelect(lead.id)}
                              className={`
                                p-4 rounded-lg border-2 cursor-pointer transition-all
                                ${isActive 
                                  ? 'bg-blue-50 border-blue-300 shadow-md' 
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                }
                                ${borderColor}
                                border-r-4
                              `}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                  {formatDate(lead.created_at)}
                                </span>
                                {isActive && (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                                    פעיל
                                  </Badge>
                                )}
                              </div>
                              <div className="mb-2">
                                <Badge className={`${statusColor} text-xs px-2 py-1`}>
                                  {leadStatus}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                {lead.source && (
                                  <div>
                                    <span className="font-medium">מקור: </span>
                                    <span>{lead.source}</span>
                                  </div>
                                )}
                                {lead.fitness_goal && (
                                  <div>
                                    <span className="font-medium">מטרה: </span>
                                    <span>{lead.fitness_goal}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Column 2 (Left Side - RTL): Lead Details */}
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                {isLoadingLead ? (
                  <Card className="p-8 border border-gray-200 rounded-xl shadow-sm">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-sm text-gray-600">טוען פרטי התעניינות...</p>
                    </div>
                  </Card>
                ) : !selectedInterestId || !activeLead ? (
                  <Card className="p-12 border border-gray-200 rounded-xl shadow-sm">
                    <div className="text-center text-gray-500">
                      <Info className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-base font-medium">בחר התעניינות מהיסטוריה כדי לצפות בפרטים</p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Notes Section */}
                    {activeLead.notes && (
                      <Card className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-amber-600" />
                          <h3 className="text-sm font-bold text-gray-900">הערות</h3>
                        </div>
                        <InlineEditableField
                          label=""
                          value={activeLead.notes}
                          onSave={async (newValue) => {
                            await updateLead.mutateAsync({
                              leadId: activeLead.id,
                              updates: { notes: String(newValue) },
                            });
                          }}
                          type="text"
                          className="border-0 p-0"
                          valueClassName="text-sm text-gray-700 leading-relaxed"
                        />
                      </Card>
                    )}

                    {/* Lead Data Section */}
                    <div>
                      <div className="mb-4">
                        <h2 className="text-lg font-bold text-gray-900">נתוני ליד (מכירות/CRM)</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Personal Info Card */}
                        <Card className="p-4 border border-gray-200 rounded-xl shadow-sm">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">מידע אישי</h3>
                          </div>
                          <div className="space-y-3">
                            <InlineEditableField
                              label="תאריך יצירה"
                              value={activeLead.created_at}
                              onSave={async () => {}}
                              type="text"
                              formatValue={(val) => formatDate(String(val))}
                              className="border-0 p-0"
                              disabled={true}
                            />
                            <InlineEditableField
                              label="תאריך לידה"
                              value={activeLead.birth_date || ''}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { birth_date: String(newValue) },
                                });
                              }}
                              type="date"
                              formatValue={(val) => formatDate(String(val))}
                              className="border-0 p-0"
                            />
                            {activeLead.height && (
                              <InlineEditableField
                                label="גובה"
                                value={activeLead.height}
                                onSave={async (newValue) => {
                                  await updateLead.mutateAsync({
                                    leadId: activeLead.id,
                                    updates: { height: Number(newValue) },
                                  });
                                }}
                                type="number"
                                formatValue={(val) => `${val} ס"מ`}
                                className="border-0 p-0"
                              />
                            )}
                            {activeLead.weight && (
                              <InlineEditableField
                                label="משקל"
                                value={activeLead.weight}
                                onSave={async (newValue) => {
                                  await updateLead.mutateAsync({
                                    leadId: activeLead.id,
                                    updates: { weight: Number(newValue) },
                                  });
                                }}
                                type="number"
                                formatValue={(val) => `${val} ק"ג`}
                                className="border-0 p-0"
                              />
                            )}
                          </div>
                        </Card>

                        {/* Subscription Details Card */}
                        <Card className="p-4 border border-gray-200 rounded-xl shadow-sm">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <Wallet className="h-4 w-4 text-green-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">פרטי מנוי</h3>
                          </div>
                          <div className="space-y-3">
                            <InlineEditableField
                              label="תאריך הצטרפות"
                              value={activeLead.join_date || ''}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { join_date: String(newValue) },
                                });
                              }}
                              type="date"
                              formatValue={(val) => formatDate(String(val))}
                              className="border-0 p-0"
                            />
                            <div className="flex items-center justify-between py-2 px-2 bg-blue-50 rounded-lg border border-blue-200">
                              <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" />
                                שבוע נוכחי
                              </span>
                              <span className="text-base font-bold text-blue-900">
                                {subscriptionData.currentWeekInProgram || 0}
                              </span>
                            </div>
                            <InlineEditableField
                              label="חבילה ראשונית"
                              value={subscriptionData.months || 0}
                              onSave={async (newValue) => {
                                const updatedSubscription = {
                                  ...subscriptionData,
                                  months: Number(newValue),
                                };
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { subscription_data: updatedSubscription },
                                });
                              }}
                              type="number"
                              formatValue={(val) => `${val} חודשים`}
                              className="border-0 p-0"
                            />
                            <InlineEditableField
                              label="מחיר ראשוני"
                              value={subscriptionData.initialPrice || 0}
                              onSave={async (newValue) => {
                                const updatedSubscription = {
                                  ...subscriptionData,
                                  initialPrice: Number(newValue),
                                };
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { subscription_data: updatedSubscription },
                                });
                              }}
                              type="number"
                              formatValue={(val) => `₪${Number(val).toLocaleString('he-IL')}`}
                              className="border-0 p-0"
                            />
                            <InlineEditableField
                              label="מחיר חידוש חודשי"
                              value={subscriptionData.renewalPrice || 0}
                              onSave={async (newValue) => {
                                const updatedSubscription = {
                                  ...subscriptionData,
                                  renewalPrice: Number(newValue),
                                };
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { subscription_data: updatedSubscription },
                                });
                              }}
                              type="number"
                              formatValue={(val) => `₪${Number(val).toLocaleString('he-IL')}`}
                              className="border-0 p-0"
                            />
                          </div>
                        </Card>

                        {/* Fitness Info Card */}
                        <Card className="p-4 border border-gray-200 rounded-xl shadow-sm md:col-span-2 lg:col-span-1">
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Target className="h-4 w-4 text-purple-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">מידע כושר</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <InlineEditableBadge
                              label="מטרת כושר"
                              value={activeLead.fitness_goal || ''}
                              options={FITNESS_GOAL_OPTIONS.map(goal => ({
                                value: goal,
                                label: goal,
                                className: 'bg-green-50 text-green-700 border-green-100',
                              }))}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { fitness_goal: newValue },
                                });
                              }}
                              className="border-0 p-0"
                            />
                            <InlineEditableBadge
                              label="רמת פעילות"
                              value={activeLead.activity_level || ''}
                              options={ACTIVITY_LEVEL_OPTIONS.map(level => ({
                                value: level,
                                label: level,
                                className: 'bg-orange-50 text-orange-700 border-orange-100',
                              }))}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { activity_level: newValue },
                                });
                              }}
                              className="border-0 p-0"
                            />
                            <InlineEditableBadge
                              label="זמן מועדף"
                              value={activeLead.preferred_time || ''}
                              options={PREFERRED_TIME_OPTIONS.map(time => ({
                                value: time,
                                label: time,
                                className: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                              }))}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { preferred_time: newValue },
                                });
                              }}
                              className="border-0 p-0"
                            />
                            <InlineEditableBadge
                              label="מקור"
                              value={activeLead.source || ''}
                              options={SOURCE_OPTIONS.map(source => ({
                                value: source,
                                label: source,
                                className: 'bg-purple-50 text-purple-700 border-purple-100',
                              }))}
                              onSave={async (newValue) => {
                                await updateLead.mutateAsync({
                                  leadId: activeLead.id,
                                  updates: { source: newValue },
                                });
                              }}
                              className="border-0 p-0"
                            />
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Client Data Section */}
                    {customer.id && (
                      <div className="bg-orange-50/30 border border-orange-200 rounded-xl p-4 shadow-sm">
                        <div className="mb-4">
                          <h2 className="text-lg font-bold text-gray-900">נתוני לקוח (אימון ותזונה)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <NutritionSummaryCard 
                            customerId={customer.id}
                            onViewDetails={() => navigate(`/dashboard/customers/${customer.id}`)}
                            onAddPlan={() => navigate(`/dashboard/customers/${customer.id}`)}
                          />
                          <WorkoutSummaryCard 
                            customerId={customer.id}
                            onViewDetails={() => navigate(`/dashboard/customers/${customer.id}`)}
                            onAddPlan={() => navigate(`/dashboard/customers/${customer.id}`)}
                          />
                          <DailyProtocolGrid customerId={customer.id} />
                        </div>
                        <CustomerHistoryTabs customerId={customer.id} />
                      </div>
                    )}

                    {/* Products Section */}
                    {products.length > 0 && (
                      <Card className="p-4 border border-gray-200 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                          <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                            <ShoppingBag className="h-4 w-4 text-pink-600" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900">מוצרים שנרכשו</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {products.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-pink-300 transition-all"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <Package className="h-4 w-4 text-pink-600 flex-shrink-0" />
                                <Badge className="bg-pink-100 text-pink-700 border-pink-200 text-xs px-1.5 py-0.5">
                                  {formatDate(product.date)}
                                </Badge>
                              </div>
                              <h4 className="font-semibold text-gray-900 mb-1 text-sm">{product.name}</h4>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">מחיר:</span>
                                <span className="text-base font-bold text-gray-900">
                                  ₪{product.price.toLocaleString('he-IL')}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default UnifiedProfileView;
