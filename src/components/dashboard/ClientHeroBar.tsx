/**
 * ClientHeroBar Component
 * 
 * Main bar displaying client information and actions.
 * Can be used in the header navbar to save vertical space.
 */

import React from 'react';
import { Phone, MessageCircle, Mail, ArrowRight, ChevronDown, History, MessageSquare, CreditCard, Settings } from 'lucide-react';

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
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={onWhatsApp}
              variant="outline"
              className="h-9 w-9 bg-white hover:bg-[#25D366] hover:text-white text-[#25D366] border border-gray-200 hover:border-[#25D366] rounded-lg transition-colors"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" dir="rtl">
            <p>שלח וואטסאפ</p>
          </TooltipContent>
        </Tooltip>

        {/* Payments Button */}
        {customer && onPaymentHistoryClick && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={onPaymentHistoryClick}
                variant="outline"
                className="h-9 w-9 bg-white hover:bg-[#5B6FB9] hover:text-white text-gray-700 border border-gray-200 hover:border-[#5B6FB9] rounded-lg transition-colors"
              >
                <CreditCard className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" dir="rtl">
              <p>צפה בהיסטוריית תשלומים</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Trainee Settings Button - Only show if user has a trainee account */}
        {customer && customer.user_id && (user?.role === 'admin' || user?.role === 'user') && onTraineeSettingsClick && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={onTraineeSettingsClick}
                variant="outline"
                className="h-9 w-9 bg-white hover:bg-[#5B6FB9] hover:text-white text-gray-700 border border-gray-200 hover:border-[#5B6FB9] rounded-lg transition-colors"
              >
                <Settings className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" dir="rtl">
              <p>הגדרות משתמש מתאמן - סיסמה ומחיקה</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Utility Group: Smart Trainee Action (Create/View), History & Notes */}
        <div className="flex items-center gap-2 flex-shrink-0">
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
              <div className="h-6 w-[1.5px] bg-gray-400" />
            </>
          )}

          {/* History Toggle Button */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={toggleHistory}
                className={cn(
                  "h-9 w-9 rounded-lg transition-colors",
                  isHistoryOpen 
                    ? "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white" 
                    : "bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200"
                )}
              >
                <History className="h-5 w-5" strokeWidth={2.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" dir="rtl">
              <p>היסטוריה</p>
            </TooltipContent>
          </Tooltip>

          {/* Notes Toggle Button */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={toggleNotes}
                className={cn(
                  "h-9 w-9 rounded-lg transition-colors relative",
                  isNotesOpen 
                    ? "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white" 
                    : "bg-transparent text-gray-700 hover:bg-[#5B6FB9] hover:text-white border border-gray-200"
                )}
              >
                <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
                {notesCount > 0 && (
                  <Badge
                    className={cn(
                      "absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-semibold rounded-full border-2",
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
    </div>
  );
};
