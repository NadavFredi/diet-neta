/**
 * ClientHero Component
 * 
 * Top header bar displaying client information from the latest lead interaction.
 * Shows: Name, Phone, Email in primary row with expandable section for additional details.
 */

import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, Mail, ArrowRight, ChevronDown, History, MessageSquare, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InlineEditableField } from './InlineEditableField';
import { InlineEditableSelect } from './InlineEditableSelect';
import { formatDate } from '@/utils/dashboard';
import { ACTIVITY_LEVEL_OPTIONS, PREFERRED_TIME_OPTIONS } from '@/utils/dashboard';
import type { Customer } from '@/hooks/useCustomers';
import { cn } from '@/lib/utils';
import { useLeadSidebar } from '@/hooks/useLeadSidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectCustomerNotes, fetchCustomerNotes } from '@/store/slices/leadViewSlice';
import { SmartTraineeActionButton } from './SmartTraineeActionButton';
import { fetchInvitations } from '@/store/slices/invitationSlice';
import { PaymentHistoryModal } from './dialogs/PaymentHistoryModal';
import { TraineeSettingsModal } from './dialogs/TraineeSettingsModal';
import { supabase } from '@/lib/supabaseClient';
import { Settings } from 'lucide-react';
import { ClientHeroBar } from './ClientHeroBar';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';

interface LeadData {
  id: string;
  birth_date: string | null;
  height: number | null;
  weight: number | null;
  city: string | null;
  gender: string | null;
  [key: string]: any;
}

interface ClientHeroProps {
  customer: Customer | null;
  mostRecentLead: LeadData | null;
  status: string;
  onBack: () => void;
  onWhatsApp: () => void;
  onUpdateLead?: (updates: any) => Promise<void>;
  onUpdateCustomer?: (updates: any) => Promise<void>;
  getStatusColor: (status: string) => string;
  onViewCustomerProfile?: () => void;
  hideMainBar?: boolean;
  isPaymentHistoryOpen?: boolean;
  onPaymentHistoryClose?: () => void;
  isTraineeSettingsOpen?: boolean;
  onTraineeSettingsClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ClientHero: React.FC<ClientHeroProps> = ({
  customer,
  mostRecentLead,
  status,
  onBack,
  onWhatsApp,
  onUpdateLead,
  onUpdateCustomer,
  getStatusColor,
  onViewCustomerProfile,
  hideMainBar = false,
  isPaymentHistoryOpen: externalIsPaymentHistoryOpen,
  onPaymentHistoryClose: externalOnPaymentHistoryClose,
  isTraineeSettingsOpen: externalIsTraineeSettingsOpen,
  onTraineeSettingsClose: externalOnTraineeSettingsClose,
  isExpanded: externalIsExpanded,
  onToggleExpand: externalOnToggleExpand,
}) => {
  const dispatch = useAppDispatch();
  const sidebarWidth = useSidebarWidth();
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [internalIsPaymentHistoryOpen, setInternalIsPaymentHistoryOpen] = useState(false);
  const [internalIsTraineeSettingsOpen, setInternalIsTraineeSettingsOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : internalIsExpanded;
  const isPaymentHistoryOpen = externalIsPaymentHistoryOpen !== undefined ? externalIsPaymentHistoryOpen : internalIsPaymentHistoryOpen;
  const isTraineeSettingsOpen = externalIsTraineeSettingsOpen !== undefined ? externalIsTraineeSettingsOpen : internalIsTraineeSettingsOpen;

  const handleToggleExpand = externalOnToggleExpand || (() => setInternalIsExpanded(!internalIsExpanded));
  const handlePaymentHistoryClose = externalOnPaymentHistoryClose || (() => setInternalIsPaymentHistoryOpen(false));
  const handleTraineeSettingsClose = externalOnTraineeSettingsClose || (() => setInternalIsTraineeSettingsOpen(false));
  const { isHistoryOpen, isNotesOpen, toggleHistory, toggleNotes } = useLeadSidebar();

  // Get notes count for the customer
  const notes = useAppSelector(selectCustomerNotes(customer?.id));
  const notesCount = notes?.length || 0;

  const { user } = useAppSelector((state) => state.auth);
  const { invitations } = useAppSelector((state) => state.invitation);

  // Fetch notes when customer changes
  useEffect(() => {
    if (customer?.id) {
      dispatch(fetchCustomerNotes(customer.id));
    }
  }, [customer?.id, dispatch]);

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

  const age = lead?.birth_date ? calculateAge(lead.birth_date) : null;

  if (!customer) return null;

  return (
    <div className="w-full bg-white border-b border-slate-100 flex-shrink-0" dir="rtl">
      {/* Primary Row - Only show if not hidden */}
      {!hideMainBar && (
        <div className="px-4 py-3">
          <ClientHeroBar
            customer={customer}
            mostRecentLead={mostRecentLead}
            onBack={onBack}
            onWhatsApp={onWhatsApp}
            onUpdateCustomer={onUpdateCustomer}
            onViewCustomerProfile={onViewCustomerProfile}
            onPaymentHistoryClick={() => {
              if (externalOnPaymentHistoryClose) {
                // When using external state, the handler is passed from PageLayout to ClientHeroBar in the header
                // This ClientHeroBar instance (when hideMainBar is false) should use internal state
                setInternalIsPaymentHistoryOpen(true);
              } else {
                setInternalIsPaymentHistoryOpen(true);
              }
            }}
            onTraineeSettingsClick={() => {
              if (externalOnTraineeSettingsClose) {
                // When using external state, the handler is passed from PageLayout to ClientHeroBar in the header
                // This ClientHeroBar instance (when hideMainBar is false) should use internal state
                setInternalIsTraineeSettingsOpen(true);
              } else {
                setInternalIsTraineeSettingsOpen(true);
              }
            }}
            onToggleExpand={handleToggleExpand}
            isExpanded={isExpanded}
            notesCount={notesCount}
          />
        </div>
      )}

      {/* Expandable Secondary Info Section */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          hideMainBar && isExpanded && "fixed top-[60px] left-0 z-30 bg-[#5B6FB9]/5 border-b border-slate-100 shadow-sm",
          !hideMainBar && isExpanded && "bg-[#5B6FB9]/5",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
        style={hideMainBar && isExpanded ? {
          right: `${sidebarWidth.width}px`,
        } : undefined}
      >
        <div className="pr-4 pl-8 pb-2 pt-2 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-0 pr-10">
            {/* City - Lead Level */}
            {onUpdateLead && lead && (
              <InlineEditableField
                label="עיר"
                value={lead.city || ''}
                onSave={async (newValue) => {
                  if (lead.id) {
                    await onUpdateLead({ city: String(newValue) });
                  }
                }}
                type="text"
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-gray-900"
              />
            )}

            {/* Birth Date - Lead Level */}
            {onUpdateLead && lead && (
              <InlineEditableField
                label="תאריך לידה"
                value={lead.birth_date || ''}
                onSave={async (newValue) => {
                  if (lead.id) {
                    await onUpdateLead({ birth_date: String(newValue) });
                  }
                }}
                type="date"
                formatValue={(val) => formatDate(String(val))}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-gray-900"
              />
            )}

            {/* Age - Calculated, Read Only */}
            {age !== null && (
              <div className="flex items-center gap-2 py-0.5">
                <span className="text-xs text-gray-500 font-medium flex-shrink-0">גיל:</span>
                <span className="text-sm font-semibold text-slate-900">{age} שנים</span>
              </div>
            )}

            {/* Gender - Lead Level */}
            {onUpdateLead && lead && (
              <InlineEditableSelect
                label="מגדר"
                value={lead.gender || ''}
                options={['male', 'female', 'other']}
                onSave={async (newValue) => {
                  if (lead.id) {
                    await onUpdateLead({ gender: newValue });
                  }
                }}
                formatValue={(val) => getGenderLabel(val)}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-gray-900"
                badgeClassName="bg-gray-50 text-gray-700 border-gray-200"
              />
            )}

            {/* Height - Lead Level */}
            {onUpdateLead && lead && (
              <InlineEditableField
                label="גובה"
                value={lead.height || 0}
                onSave={async (newValue) => {
                  if (lead.id) {
                    await onUpdateLead({ height: Number(newValue) });
                  }
                }}
                type="number"
                formatValue={(val) => `${val} ס"מ`}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-gray-900"
              />
            )}

            {/* Weight - Lead Level */}
            {onUpdateLead && lead && (
              <InlineEditableField
                label="משקל"
                value={lead.weight || 0}
                onSave={async (newValue) => {
                  if (lead.id) {
                    await onUpdateLead({ weight: Number(newValue) });
                  }
                }}
                type="number"
                formatValue={(val) => `${val} ק"ג`}
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-gray-900"
              />
            )}
          </div>
        </div>
      </div>

      {/* Payment History Modal */}
      {customer && (
        <PaymentHistoryModal
          isOpen={isPaymentHistoryOpen}
          onClose={handlePaymentHistoryClose}
          customerId={customer.id}
          customerName={customer.full_name}
          leadId={lead?.id || null}
        />
      )}

      {/* Trainee Settings Modal */}
      {customer && customer.user_id && (
        <TraineeSettingsModal
          isOpen={isTraineeSettingsOpen}
          onClose={handleTraineeSettingsClose}
          traineeUserId={customer.user_id}
          traineeEmail={customer.email}
          traineeName={customer.full_name}
          customerPhone={customer.phone}
          customerId={customer.id}
        />
      )}
    </div>
  );
};
