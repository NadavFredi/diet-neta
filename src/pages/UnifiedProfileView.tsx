/**
 * UnifiedProfileView UI Component
 * 
 * Pure presentation component - all logic is in UnifiedProfileView.ts
 * 
 * Layout: Personal Details (Top) + Lead History & Details (Below)
 */

import { useNavigate } from 'react-router-dom';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAppSelector } from '@/store/hooks';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUnifiedProfileView, getStatusColor, getStatusBorderColor, getInitials } from './UnifiedProfileView';
import { useLeadStatus } from '@/hooks/useLeadStatus';

const UnifiedProfileView = () => {
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const {
    customer,
    activeLead,
    sortedLeads,
    products,
    subscriptionData,
    displayStatus,
    customerAge,
    selectedInterestId,
    totalSpent,
    lastVisit,
    membershipTier,
    totalLeads,
    activeLeadsCount,
    mostRecentLead,
    mostRecentLeadStatus,
    isLoadingCustomer,
    isLoadingLead,
    handleBack,
    handleCall,
    handleWhatsApp,
    handleEmail,
    handleInterestSelect,
    statusManagement,
    updateLead,
  } = useUnifiedProfileView();

  // Status management for most recent lead (top banner) - MUST be called before early returns
  const mostRecentLeadStatusManagement = useLeadStatus(
    mostRecentLead?.id || '',
    (mostRecentLeadStatus || 'ללא סטטוס')
  );

  if (isLoadingCustomer) {
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

  return (
    <div className="h-screen flex flex-col overflow-hidden" dir="rtl">
      <DashboardHeader userEmail={user?.email} onLogout={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden" style={{ marginTop: '88px' }}>
        <div className="flex flex-1 overflow-hidden relative">
          <DashboardSidebar />
          <main className="flex-1 flex flex-col overflow-hidden bg-gray-50" style={{ marginRight: '256px' }}>
            
            {/* ============================================
                AREA A: Personal Details from Most Recent Lead (Top)
                ============================================ */}
            <div className="w-full bg-white rounded-lg shadow-md flex-shrink-0 p-6 mb-4 mx-4 mt-4">
              <div className="flex items-start justify-between gap-6">
                
                {/* Right Side (RTL): Avatar, Name, Status */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
                    {customer?.avatar_url ? (
                      <img 
                        src={customer.avatar_url} 
                        alt={customer?.full_name || 'לקוח'}
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      getInitials(customer?.full_name || 'לקוח')
                    )}
                  </div>
                  
                  {/* Name, Status, Contact */}
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-gray-900">{customer?.full_name || 'לקוח ללא שם'}</h1>
                      {mostRecentLead ? (
                        <Popover open={mostRecentLeadStatusManagement.isOpen} onOpenChange={(open) => open ? mostRecentLeadStatusManagement.handleOpen() : mostRecentLeadStatusManagement.handleClose()}>
                          <PopoverTrigger asChild>
                            <button
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${getStatusColor(mostRecentLeadStatus)}`}
                            >
                              {mostRecentLeadStatus}
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4" align="start" dir="rtl">
                            <div className="space-y-4">
                              <h3 className="font-semibold text-gray-900 mb-3">עדכן סטטוס</h3>
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">סטטוס ראשי</label>
                                <Select
                                  value={mostRecentLeadStatusManagement.selectedCategory}
                                  onValueChange={mostRecentLeadStatusManagement.handleCategoryChange}
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
                              {mostRecentLeadStatusManagement.hasSubStatuses && mostRecentLeadStatusManagement.selectedCategoryData?.subStatuses && (
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-gray-700">סטטוס משני</label>
                                  <Select
                                    value={mostRecentLeadStatusManagement.selectedSubStatus}
                                    onValueChange={mostRecentLeadStatusManagement.handleSubStatusChange}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="בחר סטטוס משני" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                      {mostRecentLeadStatusManagement.selectedCategoryData.subStatuses.map((subStatus) => (
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
                                  onClick={mostRecentLeadStatusManagement.handleSave}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  שמור
                                </Button>
                                <Button
                                  onClick={mostRecentLeadStatusManagement.handleClose}
                                  variant="outline"
                                  className="flex-1"
                                >
                                  ביטול
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Badge className={`${getStatusColor('ללא סטטוס')} text-sm px-3 py-1.5`}>
                          ללא סטטוס
                        </Badge>
                      )}
                    </div>

                    {/* Personal Details from Most Recent Lead - Single Line Display (matching AddLeadDialog structure) */}
                    {mostRecentLead && (() => {
                      const lead = mostRecentLead as any; // Type assertion for lead data
                      
                      // Helper to get gender label
                      const getGenderLabel = (gender: string | null): string => {
                        if (!gender) return 'לא זמין';
                        switch (gender) {
                          case 'male': return 'זכר';
                          case 'female': return 'נקבה';
                          case 'other': return 'אחר';
                          default: return gender;
                        }
                      };
                      
                      // Calculate age
                      const calculateAge = (birthDate: string | null): number | null => {
                        if (!birthDate) return null;
                        try {
                          const birth = new Date(birthDate);
                          const today = new Date();
                          let age = today.getFullYear() - birth.getFullYear();
                          const monthDiff = today.getMonth() - birth.getMonth();
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                            age--;
                          }
                          return age;
                        } catch {
                          return null;
                        }
                      };
                      
                      const age = calculateAge(lead.birth_date);
                      
                      return (
                        <div className="flex flex-wrap items-center gap-4 mt-2 pt-4 border-t border-gray-200">
                          {/* Phone - matches AddLeadDialog "מספר טלפון" */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">טלפון:</span>
                            <span className="text-sm font-semibold text-gray-900 font-mono">
                              {customer?.phone || 'ללא טלפון'}
                            </span>
                          </div>
                          
                          {/* Email - matches AddLeadDialog "אימייל" */}
                          {customer?.email && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500">אימייל:</span>
                              <span className="text-sm font-semibold text-gray-900 truncate">
                                {customer.email}
                              </span>
                            </div>
                          )}
                          
                          {/* City - matches AddLeadDialog "עיר" */}
                          {lead.city && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500">עיר:</span>
                              <InlineEditableField
                                label=""
                                value={lead.city}
                                onSave={async (newValue) => {
                                  await updateLead.mutateAsync({
                                    leadId: lead.id,
                                    updates: { city: String(newValue) },
                                  });
                                }}
                                type="text"
                                className="border-0 p-0"
                                valueClassName="text-sm font-semibold text-gray-900"
                              />
                            </div>
                          )}
                          
                          {/* Birth Date - matches AddLeadDialog "תאריך לידה" */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">תאריך לידה:</span>
                            {lead.birth_date ? (
                              <InlineEditableField
                                label=""
                                value={lead.birth_date}
                                onSave={async (newValue) => {
                                  await updateLead.mutateAsync({
                                    leadId: lead.id,
                                    updates: { birth_date: String(newValue) },
                                  });
                                }}
                                type="date"
                                formatValue={(val) => formatDate(String(val))}
                                className="border-0 p-0"
                                valueClassName="text-sm font-semibold text-gray-900"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-gray-400">לא זמין</span>
                            )}
                          </div>
                          
                          {/* Age - calculated from birth date */}
                          {age !== null && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500">גיל:</span>
                              <span className="text-sm font-semibold text-gray-900">{age} שנים</span>
                            </div>
                          )}
                          
                          {/* Gender - matches AddLeadDialog "מגדר" */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">מגדר:</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {getGenderLabel(lead.gender)}
                            </span>
                          </div>
                          
                          {/* Height - matches AddLeadDialog "גובה (ס"מ)" */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">גובה:</span>
                            {lead.height ? (
                              <InlineEditableField
                                label=""
                                value={lead.height}
                                onSave={async (newValue) => {
                                  await updateLead.mutateAsync({
                                    leadId: lead.id,
                                    updates: { height: Number(newValue) },
                                  });
                                }}
                                type="number"
                                formatValue={(val) => `${val} ס"מ`}
                                className="border-0 p-0"
                                valueClassName="text-sm font-semibold text-gray-900"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-gray-400">לא זמין</span>
                            )}
                          </div>
                          
                          {/* Weight - matches AddLeadDialog "משקל (ק"ג)" */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500">משקל:</span>
                            {lead.weight ? (
                              <InlineEditableField
                                label=""
                                value={lead.weight}
                                onSave={async (newValue) => {
                                  await updateLead.mutateAsync({
                                    leadId: lead.id,
                                    updates: { weight: Number(newValue) },
                                  });
                                }}
                                type="number"
                                formatValue={(val) => `${val} ק"ג`}
                                className="border-0 p-0"
                                valueClassName="text-sm font-semibold text-gray-900"
                              />
                            ) : (
                              <span className="text-sm font-semibold text-gray-400">לא זמין</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Left Side (RTL): Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
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

            {/* ============================================
                AREA B: Lead History & Lead Details (Below)
                ============================================ */}
            <div className="flex-1 flex gap-4 px-4 pb-4 min-h-0 overflow-hidden">
              
              {/* Right Column: Lead History (Master List) */}
              <div className="w-80 flex-shrink-0 flex flex-col min-h-0">
                <Card className="flex-1 flex flex-col overflow-hidden border border-gray-200 rounded-xl shadow-sm bg-white">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <h2 className="text-base font-bold text-gray-900">היסטוריית לידים</h2>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {!sortedLeads || sortedLeads.length === 0 ? (
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

              {/* Left Column: Lead Details (Detail View) */}
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
