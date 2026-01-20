/**
 * ClientHeroBar Component
 * 
 * Main bar displaying client information and actions.
 * Can be used in the header navbar to save vertical space.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Phone, MessageCircle, Mail, ArrowRight, ChevronDown, History, MessageSquare, CreditCard, Settings, MoreVertical, Trash2, Plus, UserCheck, UserX } from 'lucide-react';

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InlineEditableField } from './InlineEditableField';
import { cn } from '@/lib/utils';
import { useLeadSidebar } from '@/hooks/useLeadSidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMeetings } from '@/hooks/useMeetings';
import { MeetingsDataTable } from './MeetingsDataTable';
import { useAppSelector } from '@/store/hooks';
import { SmartTraineeActionButton } from './SmartTraineeActionButton';
import { fetchInvitations } from '@/store/slices/invitationSlice';
import { useAppDispatch } from '@/store/hooks';
import type { Customer } from '@/hooks/useCustomers';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AddLeadDialogWithCustomer } from './AddLeadDialogWithCustomer';

interface LeadData {
  id: string;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  city: string | null;
  gender: string | null;
  [key: string]: any;
}

interface ClientHeroBarProps {
  customer: Customer | null;
  mostRecentLead: LeadData | null;
  onBack: () => void;
  onWhatsApp: () => void;
  onUpdateCustomer?: (updates: any) => Promise<void>;
  onViewCustomerProfile?: () => void;
  onPaymentHistoryClick?: () => void;
  onTraineeSettingsClick?: () => void;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  notesCount?: number;
}

export const ClientHeroBar: React.FC<ClientHeroBarProps> = ({
  customer,
  mostRecentLead,
  onBack,
  onWhatsApp,
  onUpdateCustomer,
  onViewCustomerProfile,
  onPaymentHistoryClick,
  onTraineeSettingsClick,
  onToggleExpand,
  isExpanded = false,
  notesCount = 0,
}) => {
  const dispatch = useAppDispatch();
  const { isHistoryOpen, isNotesOpen, toggleHistory, toggleNotes } = useLeadSidebar();
  const { user } = useAppSelector((state) => state.auth);
  const { invitations } = useAppSelector((state) => state.invitation);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: allMeetings = [], isLoading: isLoadingMeetings } = useMeetings();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'lead' | 'customer' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  const [traineeProfileId, setTraineeProfileId] = useState<string | null>(null);
  const [traineeIsActive, setTraineeIsActive] = useState<boolean | null>(null);
  const [isUpdatingTraineeStatus, setIsUpdatingTraineeStatus] = useState(false);
  const [isMeetingsModalOpen, setIsMeetingsModalOpen] = useState(false);

  // Fetch invitations for this customer
  useEffect(() => {
    if (customer?.id && (user?.role === 'admin' || user?.role === 'user')) {
      dispatch(fetchInvitations({ customerId: customer.id }));
    }
  }, [customer?.id, user?.role, dispatch]);

  if (!customer) return null;

  const lead = mostRecentLead as any;

  // Get invitation for this customer
  const customerInvitation = invitations.find(
    (inv) => inv.customer_id === customer?.id && inv.lead_id === lead?.id
  ) || invitations.find((inv) => inv.customer_id === customer?.id);

  useEffect(() => {
    let isMounted = true;

    const fetchTraineeStatus = async () => {
      const traineeUserId = customer?.user_id || customerInvitation?.user_id;
      const traineeEmail = customer?.email;

      if (!traineeUserId && !traineeEmail) {
        if (isMounted) {
          setTraineeProfileId(null);
          setTraineeIsActive(null);
        }
        return;
      }

      let query = supabase
        .from('profiles')
        .select('id, role, is_active, email');

      if (traineeUserId) {
        query = query.eq('id', traineeUserId);
      } else if (traineeEmail) {
        query = query.eq('email', traineeEmail);
      }

      const { data, error } = await query.maybeSingle();
      if (!isMounted) return;

      if (error || !data || data.role !== 'trainee') {
        setTraineeProfileId(null);
        setTraineeIsActive(null);
        return;
      }

      setTraineeProfileId(data.id);
      setTraineeIsActive(data.is_active ?? true);
    };

    fetchTraineeStatus();

    return () => {
      isMounted = false;
    };
  }, [customer?.user_id, customer?.email, customerInvitation?.user_id]);

  const handleUpdateTraineeStatus = async (nextActive: boolean) => {
    if (!traineeProfileId) return;

    setIsUpdatingTraineeStatus(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: nextActive })
        .eq('id', traineeProfileId);

      if (error) {
        throw error;
      }

      setTraineeIsActive(nextActive);
      toast({
        title: 'עודכן',
        description: nextActive ? 'משתמש המתאמן הופעל.' : 'משתמש המתאמן הושבת.',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון סטטוס מתאמן',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingTraineeStatus(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
    setDeleteType(null);
  };

  const handleDeleteLeadOnly = async () => {
    if (!lead?.id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'הליד נמחק בהצלחה',
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });

      setIsDeleteDialogOpen(false);
      // Navigate back after deletion
      onBack();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הליד',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer?.id) return;

    setIsDeleting(true);
    try {
      // Delete customer (leads will be cascade deleted due to ON DELETE CASCADE)
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'הלקוח וכל הלידים שלו נמחקו בהצלחה',
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });

      setIsDeleteDialogOpen(false);
      // Navigate back after deletion
      onBack();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקת הלקוח',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter meetings by lead_id or customer_id
  const leadMeetings = useMemo(() => {
    if (!lead?.id && !customer?.id) return [];
    
    return allMeetings.filter((meeting) => {
      // Match by lead_id first, then fallback to customer_id
      if (lead?.id && meeting.lead_id === lead.id) return true;
      if (customer?.id && meeting.customer_id === customer.id) return true;
      return false;
    });
  }, [allMeetings, lead?.id, customer?.id]);

  return (
    <div className="flex items-center justify-between gap-1 sm:gap-2 lg:gap-4 flex-wrap w-full">
      {/* Left Side (RTL): Back Button, Name, Phone, Email */}
      <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-wrap min-w-0 flex-1">
        {/* Return Button */}
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900 flex-shrink-0 h-8 w-8 sm:h-7 sm:w-auto sm:px-2 p-0"
        >
          <ArrowRight className="h-4 w-4 sm:h-3.5 sm:w-3.5 sm:ml-1" />
          <span className="hidden sm:inline">חזור</span>
        </Button>

        {/* Name - Page Title - Clickable to navigate to customer page */}
        {onViewCustomerProfile ? (
          <button
            onClick={onViewCustomerProfile}
            className="text-sm sm:text-base font-bold text-gray-900 flex-shrink-0 hover:text-[#5B6FB9] transition-colors cursor-pointer truncate max-w-[100px] sm:max-w-[150px] lg:max-w-none"
          >
            {customer.full_name}
          </button>
        ) : (
          <h1 className="text-sm sm:text-base font-bold text-gray-900 flex-shrink-0 truncate max-w-[100px] sm:max-w-[150px] lg:max-w-none">{customer.full_name}</h1>
        )}

        {/* Phone - On same line - Editable - Hidden on very small screens */}
        {onUpdateCustomer && customer && (
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 group/phone">
            <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <div className="relative">
              {customer.phone ? (
                <InlineEditableField
                  label=""
                  value={customer.phone}
                  onSave={async (newValue) => {
                    if (customer.id) {
                      await onUpdateCustomer({ phone: String(newValue) });
                    }
                  }}
                  type="tel"
                  className="border-0 p-0 m-0 [&>span:first-child]:hidden"
                  valueClassName="text-sm font-semibold text-gray-900 font-mono cursor-pointer hover:text-blue-600 transition-colors"
                />
              ) : (
                <InlineEditableField
                  label=""
                  value=""
                  onSave={async (newValue) => {
                    if (customer.id) {
                      await onUpdateCustomer({ phone: String(newValue) });
                    }
                  }}
                  type="tel"
                  className="border-0 p-0 m-0 [&>span:first-child]:hidden"
                  valueClassName="text-sm font-semibold text-gray-500 font-mono cursor-pointer hover:text-blue-600 transition-colors italic"
                  formatValue={(val) => {
                    const str = String(val);
                    return str || 'לחץ להוספת טלפון';
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Email - On same line (optional, can be hidden on smaller screens) */}
        {onUpdateCustomer && customer && customer.email && (
          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
            <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
              {customer.email}
            </span>
          </div>
        )}

        {/* Toggle Button for Additional Details - Hidden on mobile */}
        {onToggleExpand && (
          <Button
            onClick={onToggleExpand}
            variant="ghost"
            size="sm"
            className="hidden md:flex h-7 px-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 items-center gap-1 flex-shrink-0"
          >
            <span className="text-xs">פרטים נוספים</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-300",
                isExpanded && "transform rotate-180"
              )}
            />
          </Button>
        )}
      </div>

      {/* Right Side (RTL): Action Bar - WhatsApp + Divider + Utility Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* WhatsApp Button - External Communication */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={onWhatsApp}
              variant="outline"
              className="h-8 w-8 bg-white hover:bg-[#25D366] hover:text-white text-[#25D366] border border-gray-200 hover:border-[#25D366] rounded-lg transition-colors flex-shrink-0"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" dir="rtl">
            <p>שלח וואטסאפ</p>
          </TooltipContent>
        </Tooltip>

        {/* Trainee Settings Button - Hidden on mobile */}
        {customer && customer.user_id && (user?.role === 'admin' || user?.role === 'user') && onTraineeSettingsClick && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={onTraineeSettingsClick}
                variant="outline"
                className="hidden md:flex h-8 w-8 bg-white hover:bg-[#5B6FB9] hover:text-white text-gray-700 border border-gray-200 hover:border-[#5B6FB9] rounded-lg transition-colors flex-shrink-0"
              >
                <Settings className="h-4 w-4" strokeWidth={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" dir="rtl">
              <p>הגדרות משתמש מתאמן - סיסמה ומחיקה</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Utility Group: Smart Trainee Action (Create/View), History & Notes */}
        <div className="flex items-center gap-1 flex-shrink-0 pl-1 sm:pl-2 lg:pl-4">
          {/* Smart Trainee Action Button - Hidden on mobile */}
          {(user?.role === 'admin' || user?.role === 'user') && customer && (
            <div className="hidden md:block">
              <SmartTraineeActionButton
                customerId={customer.id}
                leadId={lead?.id || null}
                customerEmail={customer.email || null}
                customerName={customer.full_name || null}
                customerPhone={customer.phone || null}
                customerUserId={customer.user_id || null}
                customerInvitationUserId={customerInvitation?.user_id || null}
              />
            </div>
          )}

          {/* Actions Menu (3 dots) */}
          <DropdownMenu>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors flex-shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" strokeWidth={2.5} />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center" dir="rtl">
                <p>פעולות נוספות</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                onClick={() => setIsAddLeadDialogOpen(true)}
                className="cursor-pointer flex items-center gap-2 flex-row-reverse"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span>צור ליד חדש ללקוח</span>
              </DropdownMenuItem>
              {/* Mobile-only: Payment History */}
              {customer && onPaymentHistoryClick && (
                <DropdownMenuItem
                  onClick={onPaymentHistoryClick}
                  className="cursor-pointer flex items-center gap-2 flex-row-reverse sm:hidden"
                >
                  <CreditCard className="h-4 w-4 flex-shrink-0" />
                  <span>היסטוריית תשלומים</span>
                </DropdownMenuItem>
              )}
              {traineeProfileId && traineeIsActive !== null && (
                <>
                  <DropdownMenuSeparator />
                  {traineeIsActive ? (
                    <DropdownMenuItem
                      onClick={() => handleUpdateTraineeStatus(false)}
                      disabled={isUpdatingTraineeStatus}
                      className="cursor-pointer text-amber-700 focus:text-amber-700 focus:bg-amber-50 flex items-center gap-2 flex-row-reverse"
                    >
                      <UserX className="h-4 w-4 flex-shrink-0" />
                      <span>השבת משתמש מתאמן</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => handleUpdateTraineeStatus(true)}
                      disabled={isUpdatingTraineeStatus}
                      className="cursor-pointer text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50 flex items-center gap-2 flex-row-reverse"
                    >
                      <UserCheck className="h-4 w-4 flex-shrink-0" />
                      <span>הפעל משתמש מתאמן</span>
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 flex items-center gap-2 flex-row-reverse"
              >
                <Trash2 className="h-4 w-4 flex-shrink-0" />
                <span>מחק</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Vertical Divider - Hidden on mobile */}
          <div className="h-6 w-[1.5px] bg-gray-400 hidden lg:block" />
          
          {/* History Toggle Button - Hidden on mobile */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={toggleHistory}
                className={cn(
                  "hidden lg:flex h-8 w-8 rounded-lg transition-colors flex-shrink-0",
                  isHistoryOpen
                    ? "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
                    : "bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200"
                )}
              >
                <History className="h-4 w-4" strokeWidth={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" dir="rtl">
              <p>היסטוריה</p>
            </TooltipContent>
          </Tooltip>

          {/* Notes Toggle Button - Hidden on mobile */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={toggleNotes}
                className={cn(
                  "hidden lg:flex h-8 w-8 rounded-lg transition-colors relative flex-shrink-0",
                  isNotesOpen
                    ? "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
                    : "bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200"
                )}
              >
                <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
                {notesCount > 0 && (
                  <Badge
                    className={cn(
                      "absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-semibold rounded-full border-2",
                      isNotesOpen
                        ? "bg-white text-[#5B6FB9] border-[#5B6FB9]"
                        : "bg-[#5B6FB9] text-white border-white"
                    )}
                  >
                    {notesCount > 99 ? '99+' : notesCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" dir="rtl">
              <p>הערות {notesCount > 0 && `(${notesCount})`}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקה</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>מה תרצה למחוק?</p>
              <div className="flex flex-col gap-2 mt-4">
                <Button
                  variant={deleteType === 'lead' ? 'default' : 'outline'}
                  onClick={() => setDeleteType('lead')}
                  className="justify-start"
                  disabled={isDeleting || !lead?.id}
                >
                  מחק רק את הליד הזה
                </Button>
                <Button
                  variant={deleteType === 'customer' ? 'default' : 'outline'}
                  onClick={() => setDeleteType('customer')}
                  className="justify-start"
                  disabled={isDeleting}
                >
                  מחק את הלקוח (כולל כל הלידים)
                </Button>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteType === 'lead') {
                  handleDeleteLeadOnly();
                } else if (deleteType === 'customer') {
                  handleDeleteCustomer();
                }
              }}
              disabled={isDeleting || !deleteType}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Lead Dialog */}
      <AddLeadDialogWithCustomer
        isOpen={isAddLeadDialogOpen}
        onOpenChange={setIsAddLeadDialogOpen}
        customer={customer}
      />

      {/* Meetings Modal */}
      <Dialog open={isMeetingsModalOpen} onOpenChange={setIsMeetingsModalOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle>כל הפגישות - {customer.full_name}</DialogTitle>
            <DialogDescription>
              {leadMeetings.length > 0 
                ? `נמצאו ${leadMeetings.length} פגישות` 
                : 'לא נמצאו פגישות ללקוח זה'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {isLoadingMeetings ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">טוען פגישות...</p>
              </div>
            ) : leadMeetings.length > 0 ? (
              <MeetingsDataTable meetings={leadMeetings} />
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p className="text-lg font-medium mb-2">לא נמצאו פגישות</p>
                <p className="text-sm">פגישות מתווספות אוטומטית מטופס Fillout</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
