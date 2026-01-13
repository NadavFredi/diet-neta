/**
 * ClientHeroBar Component
 * 
 * Main bar displaying client information and actions.
 * Can be used in the header navbar to save vertical space.
 */

import React from 'react';
import { Phone, MessageCircle, Mail, ArrowRight, ChevronDown, History, MessageSquare, CreditCard, Settings } from 'lucide-react';
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
import { useAppSelector } from '@/store/hooks';
import { SmartTraineeActionButton } from './SmartTraineeActionButton';
import { fetchInvitations } from '@/store/slices/invitationSlice';
import { useAppDispatch } from '@/store/hooks';
import { useEffect } from 'react';
import type { Customer } from '@/hooks/useCustomers';

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

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap w-full">
      {/* Left Side (RTL): Back Button, Name, Phone, Email */}
      <div className="flex items-center gap-4 flex-wrap min-w-0">
        {/* Return Button */}
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="text-gray-600 hover:text-gray-900 flex-shrink-0 h-7 px-2"
        >
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
          חזור
        </Button>

        {/* Name - Page Title - Clickable to navigate to customer page */}
        {onViewCustomerProfile ? (
          <button
            onClick={onViewCustomerProfile}
            className="text-base font-bold text-gray-900 flex-shrink-0 hover:text-[#5B6FB9] transition-colors cursor-pointer"
          >
            {customer.full_name}
          </button>
        ) : (
          <h1 className="text-base font-bold text-gray-900 flex-shrink-0">{customer.full_name}</h1>
        )}

        {/* Phone - On same line - Editable */}
        {onUpdateCustomer && customer && (
          <div className="flex items-center gap-1.5 flex-shrink-0 group/phone">
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
          <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
            <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
              {customer.email}
            </span>
          </div>
        )}

        {/* Toggle Button for Additional Details */}
        {onToggleExpand && (
          <Button
            onClick={onToggleExpand}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 flex items-center gap-1 flex-shrink-0"
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
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* WhatsApp Button - External Communication */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="default"
              onClick={onWhatsApp}
              variant="outline"
              className="bg-white hover:bg-[#5B6FB9] hover:text-white text-gray-700 border border-gray-200 hover:border-[#5B6FB9] text-base font-semibold rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
              WhatsApp
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center" dir="rtl">
            <p>שלח וואטסאפ</p>
          </TooltipContent>
        </Tooltip>

        {/* Payments Button */}
        {customer && onPaymentHistoryClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="default"
                onClick={onPaymentHistoryClick}
                variant="outline"
                className="bg-white hover:bg-[#5B6FB9] hover:text-white text-gray-700 border border-gray-200 hover:border-[#5B6FB9] text-base font-semibold rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
              >
                <CreditCard className="h-5 w-5" strokeWidth={2.5} />
                תשלומים
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" dir="rtl">
              <p>צפה בהיסטוריית תשלומים</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Trainee Settings Button - Only show if user has a trainee account */}
        {customer && customer.user_id && (user?.role === 'admin' || user?.role === 'user') && onTraineeSettingsClick && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="default"
                onClick={onTraineeSettingsClick}
                variant="outline"
                className="bg-white hover:bg-[#5B6FB9] hover:text-white text-gray-700 border border-gray-200 hover:border-[#5B6FB9] text-base font-semibold rounded-lg px-4 py-2 flex items-center gap-2 transition-colors"
              >
                <Settings className="h-5 w-5" strokeWidth={2.5} />
                הגדרות מתאמן
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" dir="rtl">
              <p>הגדרות משתמש מתאמן - סיסמה ומחיקה</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Utility Group: Smart Trainee Action (Create/View), History & Notes */}
        <div className="flex items-center gap-2">
          {/* Smart Trainee Action Button - Only for admins/managers */}
          {(user?.role === 'admin' || user?.role === 'user') && customer && (
            <>
              <SmartTraineeActionButton
                customerId={customer.id}
                leadId={lead?.id || null}
                customerEmail={customer.email || null}
                customerName={customer.full_name || null}
                customerPhone={customer.phone || null}
                customerUserId={customer.user_id || null}
                customerInvitationUserId={customerInvitation?.user_id || null}
              />
              {/* Vertical Divider */}
              <div className="h-6 w-px bg-gray-200" />
            </>
          )}

          {/* History Toggle Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="default"
                onClick={toggleHistory}
                className={cn(
                  "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white text-base font-semibold rounded-lg px-4 py-2 flex items-center gap-2",
                  !isHistoryOpen && "bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200"
                )}
              >
                <History className="h-5 w-5" strokeWidth={2.5} />
                <span>היסטוריה</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" align="center" dir="rtl">
              <p>היסטוריה</p>
            </TooltipContent>
          </Tooltip>

          {/* Notes Toggle Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="default"
                onClick={toggleNotes}
                className={cn(
                  "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white text-base font-semibold rounded-lg px-4 py-2 flex items-center gap-2 relative",
                  !isNotesOpen && "bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200"
                )}
              >
                <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
                <span>הערות</span>
                {notesCount > 0 && (
                  <Badge
                    className={cn(
                      "h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-semibold rounded-full border-2",
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
            <TooltipContent side="left" align="center" dir="rtl">
              <p>הערות {notesCount > 0 && `(${notesCount})`}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
