/**
 * ClientHero Component
 * 
 * Top header bar displaying client information from the latest lead interaction.
 * Shows: Name, Phone, Email in primary row with expandable section for additional details.
 */

import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, Mail, ArrowRight, ChevronDown, History, MessageSquare } from 'lucide-react';
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
}) => {
  const dispatch = useAppDispatch();
  const [isExpanded, setIsExpanded] = useState(false);
  const { isHistoryOpen, isNotesOpen, toggleHistory, toggleNotes } = useLeadSidebar();
  
  // Get notes count for the customer
  const notes = useAppSelector(selectCustomerNotes(customer?.id));
  const notesCount = notes?.length || 0;

  // Fetch notes when customer changes
  useEffect(() => {
    if (customer?.id) {
      dispatch(fetchCustomerNotes(customer.id));
    }
  }, [customer?.id, dispatch]);

  if (!customer) return null;

  const lead = mostRecentLead as any;

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
      {/* Primary Row - Always Visible */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left Side (RTL): Name, Contact Info, and Toggle */}
          <div className="flex-1 flex items-center gap-4 flex-wrap min-w-0">
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

            {/* Name - Page Title Section */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <h1 className="text-base font-bold text-gray-900">{customer.full_name}</h1>
              
              {/* Vertical Separator - Clear division like WhatsApp */}
              <div className="h-6 w-px bg-gray-300" />
            </div>

            {/* Primary Contact Info - Phone & Email */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Phone - Customer Level */}
              {onUpdateCustomer && customer && customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900 font-mono">
                    {customer.phone}
                  </span>
                </div>
              )}

              {/* Email - Customer Level */}
              {onUpdateCustomer && customer && customer.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">
                    {customer.email}
                  </span>
                </div>
              )}
            </div>

            {/* Toggle Button */}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
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
          </div>

          {/* Right Side (RTL): Action Bar - WhatsApp + Divider + Utility Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* WhatsApp Button - External Communication */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onWhatsApp}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 h-8 px-3 text-xs"
                >
                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                  WhatsApp
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" align="center" dir="rtl">
                <p>שלח וואטסאפ</p>
              </TooltipContent>
            </Tooltip>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Utility Group: History & Notes Toggle Buttons */}
            <div className="flex items-center gap-1">
              {/* History Toggle Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isHistoryOpen ? "default" : "ghost"}
                    size="icon"
                    onClick={toggleHistory}
                    className={cn(
                      "h-8 w-8 rounded-md transition-all duration-200",
                      isHistoryOpen
                        ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm hover:from-purple-700 hover:to-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <History className="h-4 w-4" strokeWidth={2} />
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
                    variant={isNotesOpen ? "default" : "ghost"}
                    size="icon"
                    onClick={toggleNotes}
                    className={cn(
                      "h-8 w-8 rounded-md transition-all duration-200 relative",
                      isNotesOpen
                        ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-sm hover:from-purple-700 hover:to-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" strokeWidth={2} />
                    {notesCount > 0 && (
                      <Badge
                        className={cn(
                          "absolute -top-1 -right-1 h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] font-semibold rounded-full border-2",
                          isNotesOpen
                            ? "bg-white text-purple-600 border-purple-600"
                            : "bg-purple-600 text-white border-white"
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
      </div>

      {/* Expandable Secondary Info Section */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 pb-3 pt-0 border-t border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-3">
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
    </div>
  );
};
