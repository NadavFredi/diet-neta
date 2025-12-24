/**
 * LeadAutomationCard Component
 * 
 * Card for managing WhatsApp automation flows for leads/customers
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Send, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTemplates, saveTemplate, setSendingFlow } from '@/store/slices/automationSlice';
import { sendWhatsAppMessage, replacePlaceholders } from '@/services/greenApiService';
import { TemplateEditorModal } from './TemplateEditorModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Customer } from '@/hooks/useCustomers';

interface LeadData {
  id: string;
  status_main?: string | null;
  status_sub?: string | null;
  fitness_goal?: string | null;
  activity_level?: string | null;
  preferred_time?: string | null;
  height?: number | null;
  weight?: number | null;
  city?: string | null;
  birth_date?: string | null;
  created_at?: string;
  [key: string]: any;
}

interface FlowConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

const FLOW_CONFIGS: FlowConfig[] = [
  {
    key: 'customer_journey_start',
    label: 'תחילת מסע לקוח וצירוף שאלון פרטים',
  },
  {
    key: 'intro_questionnaire',
    label: 'שליחת שאלון הכרות לאחר קביעת שיחה',
  },
];

interface LeadAutomationCardProps {
  customer: Customer | null;
  lead: LeadData | null;
  workoutPlanName?: string | null;
  nutritionPlanName?: string | null;
}

export const LeadAutomationCard: React.FC<LeadAutomationCardProps> = ({
  customer,
  lead,
  workoutPlanName,
  nutritionPlanName,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const templates = useAppSelector((state) => state.automation.templates);
  const sendingFlow = useAppSelector((state) => state.automation.sendingFlow);
  const [editingFlowKey, setEditingFlowKey] = useState<string | null>(null);

  // Fetch templates on mount
  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  // Calculate age from birth_date
  const calculateAge = (birthDate: string | null | undefined): number | null => {
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

  // Calculate BMI
  const calculateBMI = (height: number | null | undefined, weight: number | null | undefined): number | null => {
    if (!height || !weight || height === 0) return null;
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  };

  // Build placeholders object from customer and lead data
  const buildPlaceholders = (): Record<string, string | number> => {
    const age = calculateAge(lead?.birth_date);
    const bmi = calculateBMI(lead?.height, lead?.weight);
    const status = lead?.status_sub || lead?.status_main || '';
    
    const getGenderLabel = (gender: string | null | undefined): string => {
      if (!gender) return '';
      switch (gender) {
        case 'male': return 'זכר';
        case 'female': return 'נקבה';
        case 'other': return 'אחר';
        default: return gender;
      }
    };

    const formatDate = (date: string | null | undefined): string => {
      if (!date) return '';
      try {
        return new Date(date).toLocaleDateString('he-IL');
      } catch {
        return date;
      }
    };

    return {
      name: customer?.full_name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      city: lead?.city || '',
      gender: getGenderLabel(lead?.gender),
      status: status,
      created_date: formatDate(lead?.created_at),
      fitness_goal: lead?.fitness_goal || '',
      activity_level: lead?.activity_level || '',
      preferred_time: lead?.preferred_time || '',
      height: lead?.height || '',
      weight: lead?.weight || '',
      bmi: bmi || '',
      age: age || '',
      workout_plan_name: workoutPlanName || '',
      nutrition_plan_name: nutritionPlanName || '',
    };
  };

  const handleSendFlow = async (flowKey: string) => {
    if (!customer?.phone) {
      toast({
        title: 'שגיאה',
        description: 'מספר טלפון לא זמין ללקוח',
        variant: 'destructive',
      });
      return;
    }

    const template = templates[flowKey];
    if (!template || !template.template_content.trim()) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצאה תבנית להודעה זו. אנא הגדר תבנית תחילה.',
        variant: 'destructive',
      });
      setEditingFlowKey(flowKey);
      return;
    }

    dispatch(setSendingFlow({ flowKey, isSending: true }));

    try {
      const placeholders = buildPlaceholders();
      const message = replacePlaceholders(template.template_content, placeholders);

      const result = await sendWhatsAppMessage({
        phoneNumber: customer.phone,
        message,
      });

      if (result.success) {
        toast({
          title: 'הצלחה',
          description: 'ההודעה נשלחה בהצלחה!',
        });
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('[LeadAutomationCard] Error sending flow:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשליחת ההודעה',
        variant: 'destructive',
      });
    } finally {
      dispatch(setSendingFlow({ flowKey, isSending: false }));
    }
  };

  const handleSaveTemplate = async (flowKey: string, templateContent: string) => {
    try {
      await dispatch(saveTemplate({ flowKey, templateContent })).unwrap();
      toast({
        title: 'הצלחה',
        description: 'התבנית נשמרה בהצלחה',
      });
    } catch (error: any) {
      console.error('[LeadAutomationCard] Error saving template:', error);
      toast({
        title: 'שגיאה',
        description: error || 'נכשל בשמירת התבנית',
        variant: 'destructive',
      });
      throw error;
    }
  };

  if (!customer || !lead) {
    return null;
  }

  const flowConfig = FLOW_CONFIGS.find(f => f.key === editingFlowKey);
  const editingTemplate = editingFlowKey ? templates[editingFlowKey]?.template_content || '' : '';

  return (
    <>
      <Card className="p-4 border border-slate-100 rounded-lg shadow-sm bg-white flex flex-col" style={{ flex: '1 1 100%', minWidth: '100%', maxWidth: '100%' }}>
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Send className="h-4 w-4 text-green-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">אוטומציית WhatsApp</h3>
        </div>

        <div className="space-y-3">
          {FLOW_CONFIGS.map((flow) => {
            const isSending = sendingFlow[flow.key] || false;
            const hasTemplate = templates[flow.key]?.template_content?.trim() || false;

            return (
              <div
                key={flow.key}
                className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Button
                  onClick={() => handleSendFlow(flow.key)}
                  disabled={isSending || !hasTemplate}
                  className={cn(
                    "flex-1 justify-start",
                    "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white",
                    "text-sm font-semibold rounded-lg px-4 py-2 h-auto"
                  )}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 ml-2" />
                      {flow.label}
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditingFlowKey(flow.key)}
                  className="h-10 w-10 flex-shrink-0 border-gray-300 hover:bg-gray-200"
                  title="ערוך תבנית"
                >
                  <Settings className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Template Editor Modal */}
      {editingFlowKey && flowConfig && (
        <TemplateEditorModal
          isOpen={!!editingFlowKey}
          onOpenChange={(open) => !open && setEditingFlowKey(null)}
          flowKey={editingFlowKey}
          flowLabel={flowConfig.label}
          initialTemplate={editingTemplate}
          onSave={(template) => handleSaveTemplate(editingFlowKey, template)}
        />
      )}
    </>
  );
};
