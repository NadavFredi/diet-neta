/**
 * SendBudgetModal Component
 * 
 * Modal for sending budget via WhatsApp with template selection
 * Reuses TemplateEditorModal functionality but simplified for budget sending
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { TemplateEditorModal } from './TemplateEditorModal';
import { sendWhatsAppMessage, replacePlaceholders } from '@/services/greenApiService';
import { generateBudgetLink } from '@/services/pdfService';
import type { Budget } from '@/store/slices/budgetSlice';
import { setSendingWhatsApp } from '@/store/slices/budgetSlice';
import { useToast } from '@/hooks/use-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { saveTemplate, fetchTemplates } from '@/store/slices/automationSlice';
import { supabase } from '@/lib/supabaseClient';

interface SendBudgetModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
  phoneNumber?: string | null;
}

const DEFAULT_BUDGET_TEMPLATE = `שלום {{name}},

תכנית הפעולה שלך מוכנה!

📋 שם תכנית הפעולה: {{budget_name}}

לצפייה בתכנית הפעולה המלאה:
{{budget_link}}

בברכה,
צוות DietNeta`;

export const SendBudgetModal: React.FC<SendBudgetModalProps> = ({
  isOpen,
  onOpenChange,
  budget,
  phoneNumber,
}) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { sendingWhatsApp } = useAppSelector((state) => state.budget);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_BUDGET_TEMPLATE);
  const [phone, setPhone] = useState(phoneNumber || '');
  const [customerName, setCustomerName] = useState('');
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  
  const isSending = budget ? (sendingWhatsApp[budget.id] || false) : false;

  // Helper function to get flow label (check custom flows, then default)
  const getFlowLabel = (flowKey: string, defaultLabel: string): string => {
    try {
      const stored = localStorage.getItem('custom_automation_flows');
      if (stored) {
        const customFlows: Array<{ key: string; label: string }> = JSON.parse(stored);
        const customFlow = customFlows.find(f => f.key === flowKey);
        if (customFlow) {
          return customFlow.label;
        }
      }
    } catch (error) {
      // Silent failure
    }
    return defaultLabel;
  };

  const budgetFlowLabel = getFlowLabel('budget', 'שליחת תכנית פעולה');

  // Load template from database first, fallback to localStorage
  useEffect(() => {
    const loadTemplate = async () => {
      const result = await dispatch(fetchTemplates());
      if (result.type === 'automation/fetchTemplates/fulfilled') {
        const dbTemplate = result.payload['budget']?.template_content;
        if (dbTemplate && dbTemplate.trim()) {
          setTemplate(dbTemplate);
          localStorage.setItem('budgetMessageTemplate', dbTemplate);
          return;
        }
      }
      
      // Fallback to localStorage
      const savedTemplate = localStorage.getItem('budgetMessageTemplate');
      if (savedTemplate && savedTemplate.trim()) {
        setTemplate(savedTemplate);
        // If template exists in localStorage but not in DB, migrate it
        const result = await dispatch(fetchTemplates());
        if (result.type === 'automation/fetchTemplates/fulfilled') {
          const dbTemplate = result.payload['budget']?.template_content;
          if (!dbTemplate || !dbTemplate.trim()) {
            // Migrate from localStorage to database
            try {
              await dispatch(saveTemplate({ 
                flowKey: 'budget', 
                templateContent: savedTemplate,
                buttons: [],
                media: null
              })).unwrap();
            } catch (error) {
              // Silent failure
            }
          }
        }
      }
    };
    
    if (isOpen) {
      loadTemplate();
    }
  }, [dispatch, isOpen]);

  // Fetch customer info if budget has assignments
  useEffect(() => {
    const fetchCustomerInfo = async () => {
      if (!budget || phone) return;

      setIsLoadingCustomer(true);
      try {
        // Try to find customer through budget assignments
        const { data: assignments } = await supabase
          .from('budget_assignments')
          .select(`
            *,
            customer:customers(full_name, phone),
            lead:leads(*, customer:customers(full_name, phone))
          `)
          .eq('budget_id', budget.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (assignments) {
          const customer = assignments.customer || assignments.lead?.customer;
          if (customer) {
            setCustomerName(customer.full_name || '');
            if (customer.phone) {
              setPhone(customer.phone);
            }
          }
        }
      } catch (error) {
        // Silent failure
      } finally {
        setIsLoadingCustomer(false);
      }
    };

    if (isOpen && budget) {
      fetchCustomerInfo();
    }
  }, [isOpen, budget, phone]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPhone(phoneNumber || '');
      if (budget) {
        dispatch(setSendingWhatsApp({ budgetId: budget.id, isSending: false }));
      }
    }
  }, [isOpen, phoneNumber, budget, dispatch]);

  const handleSend = async () => {
    if (!budget || !phone) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן מספר טלפון',
        variant: 'destructive',
      });
      return;
    }

    if (!budget) return;
    
    dispatch(setSendingWhatsApp({ budgetId: budget.id, isSending: true }));
    try {
      const budgetLink = generateBudgetLink(budget.id);
      
      // Replace placeholders
      const message = replacePlaceholders(template, {
        name: customerName || 'לקוח',
        budget_name: budget.name,
        budget_link: budgetLink,
      });

      // Send WhatsApp message
      const result = await sendWhatsAppMessage({
        phoneNumber: phone,
        message,
      });

      if (result.success) {
        toast({
          title: 'נשלח בהצלחה',
          description: 'תכנית הפעולה נשלחה ללקוח ב-WhatsApp',
        });
        onOpenChange(false);
      } else {
        toast({
          title: 'שגיאה',
          description: result.error || 'נכשל בשליחת ההודעה',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message || 'נכשל בשליחת ההודעה',
        variant: 'destructive',
      });
    } finally {
      dispatch(setSendingWhatsApp({ budgetId: budget.id, isSending: false }));
    }
  };

  const handleTemplateSave = async (newTemplate: string, buttons?: any, media?: any) => {
    try {
      // Save to database
      await dispatch(saveTemplate({ 
        flowKey: 'budget', 
        templateContent: newTemplate,
        buttons: buttons || [],
        media: media || null
      })).unwrap();
      
      // Refetch templates to ensure sync across all components
      await dispatch(fetchTemplates());
      
      // Save to local state and localStorage for backward compatibility
      setTemplate(newTemplate);
      localStorage.setItem('budgetMessageTemplate', newTemplate);
      setIsTemplateEditorOpen(false);
      toast({
        title: 'נשמר',
        description: 'תבנית ההודעה נשמרה',
      });
    } catch (error) {
      // Still save locally even if DB save fails
      setTemplate(newTemplate);
      localStorage.setItem('budgetMessageTemplate', newTemplate);
      setIsTemplateEditorOpen(false);
      toast({
        title: 'נשמר',
        description: 'תבנית ההודעה נשמרה (רק מקומי)',
      });
    }
  };

  if (!budget) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>שלח תכנית פעולה ב-WhatsApp</DialogTitle>
            <DialogDescription>
              שלח את תכנית הפעולה "{budget.name}" ללקוח באמצעות WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">מספר טלפון *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05X-XXXXXXX"
                disabled={isLoadingCustomer || isSending}
              />
            </div>

            {isLoadingCustomer && (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען פרטי לקוח...
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>תבנית הודעה</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTemplateEditorOpen(true)}
                  disabled={isSending}
                >
                  ערוך תבנית
                </Button>
              </div>
              <div className="p-3 bg-gray-50 rounded-md border text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                {template.replace(/\{\{.*?\}\}/g, (match) => {
                  if (match.includes('name')) return customerName || 'שם הלקוח';
                  if (match.includes('budget_name')) return budget.name;
                  if (match.includes('budget_link')) return generateBudgetLink(budget.id);
                  return match;
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSend}
              disabled={!phone || isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  שולח...
                </>
              ) : (
                'שלח'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={isTemplateEditorOpen}
        onOpenChange={setIsTemplateEditorOpen}
        flowKey="budget"
        flowLabel={budgetFlowLabel}
        initialTemplate={template}
        onSave={handleTemplateSave}
      />
    </>
  );
};

