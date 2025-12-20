/**
 * ClientHero Component
 * 
 * Top header bar displaying client information from the latest lead interaction.
 * Shows: Name, Phone, Email, Age, Height, Weight in a single horizontal line.
 */

import React from 'react';
import { Phone, MessageCircle, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InlineEditableField } from './InlineEditableField';
import { InlineEditableSelect } from './InlineEditableSelect';
import { formatDate } from '@/utils/dashboard';
import { ACTIVITY_LEVEL_OPTIONS, PREFERRED_TIME_OPTIONS } from '@/utils/dashboard';
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

interface ClientHeroProps {
  customer: Customer | null;
  mostRecentLead: LeadData | null;
  status: string;
  onBack: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onUpdateLead?: (updates: any) => Promise<void>;
  onUpdateCustomer?: (updates: any) => Promise<void>;
  getInitials: (name: string) => string;
  getStatusColor: (status: string) => string;
}

export const ClientHero: React.FC<ClientHeroProps> = ({
  customer,
  mostRecentLead,
  status,
  onBack,
  onCall,
  onWhatsApp,
  onEmail,
  onUpdateLead,
  onUpdateCustomer,
  getStatusColor,
}) => {
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
    <div className="w-full bg-white border-b border-gray-200 flex-shrink-0 px-6 py-4" dir="rtl">
      <div className="flex items-center justify-between gap-6">
        {/* Left Side (RTL): Personal Info Line */}
        <div className="flex-1 flex items-center gap-6 flex-wrap">
          {/* Return Button */}
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-900 flex-shrink-0"
          >
            <ArrowRight className="h-4 w-4 ml-1" />
            חזור
          </Button>

          {/* Name */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">{customer.full_name}</h1>
          </div>

          {/* Personal Info Line - All Editable */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Phone - Customer Level */}
            {onUpdateCustomer && customer && (
              <InlineEditableField
                label="טלפון"
                value={customer.phone || ''}
                onSave={async (newValue) => {
                  await onUpdateCustomer({ phone: String(newValue) });
                }}
                type="tel"
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-gray-900 font-mono"
              />
            )}

            {/* Email - Customer Level */}
            {onUpdateCustomer && customer && customer.email && (
              <InlineEditableField
                label="אימייל"
                value={customer.email}
                onSave={async (newValue) => {
                  await onUpdateCustomer({ email: String(newValue) });
                }}
                type="email"
                className="border-0 p-0"
                valueClassName="text-sm font-semibold text-gray-900 truncate max-w-[200px]"
              />
            )}

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
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">גיל:</span>
                <span className="text-sm font-semibold text-gray-900">{age} שנים</span>
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

        {/* Right Side (RTL): Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={onCall}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Phone className="h-4 w-4" />
            התקשר
          </Button>
          <Button
            onClick={onWhatsApp}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button
            onClick={onEmail}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Mail className="h-4 w-4" />
            אימייל
          </Button>
        </div>
      </div>
    </div>
  );
};


