/**
 * WhatsAppAutomationsPage Logic
 * 
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTemplates, saveTemplate } from '@/store/slices/automationSlice';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { WhatsAppAutomation } from '@/components/dashboard/columns/whatsappAutomationColumns';

interface FlowConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

const DEFAULT_FLOW_CONFIGS: FlowConfig[] = [
  {
    key: 'customer_journey_start',
    label: 'תחילת מסע לקוח ותיאום פגישה',
  },
  {
    key: 'intro_questionnaire',
    label: 'אוטומטי שליחת שאלון הכרות לאחר קביעת שיחה',
  },
  {
    key: 'budget',
    label: 'שליחת תקציב',
  },
  {
    key: 'payment_request',
    label: 'בקשת תשלום',
  },
  {
    key: 'trainee_user_credentials',
    label: 'שליחת פרטי משתמש חניך',
  },
  {
    key: 'weekly_review',
    label: 'סיכום שבועי ויעדים',
  },
];

// Load custom flows from localStorage
const loadCustomFlows = (): FlowConfig[] => {
  try {
    const stored = localStorage.getItem('custom_automation_flows');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[WhatsAppAutomationsPage] Error loading custom flows:', error);
  }
  return [];
};

// Save custom flows to localStorage
const saveCustomFlows = (flows: FlowConfig[]): void => {
  try {
    localStorage.setItem('custom_automation_flows', JSON.stringify(flows));
  } catch (error) {
    console.error('[WhatsAppAutomationsPage] Error saving custom flows:', error);
  }
};

// Load deleted default flows from localStorage
const loadDeletedDefaultFlows = (): string[] => {
  try {
    const stored = localStorage.getItem('deleted_default_automation_flows');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[WhatsAppAutomationsPage] Error loading deleted default flows:', error);
  }
  return [];
};

// Save deleted default flows to localStorage
const saveDeletedDefaultFlows = (deletedKeys: string[]): void => {
  try {
    localStorage.setItem('deleted_default_automation_flows', JSON.stringify(deletedKeys));
  } catch (error) {
    console.error('[WhatsAppAutomationsPage] Error saving deleted default flows:', error);
  }
};

export const useWhatsAppAutomationsPage = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const templates = useAppSelector((state) => state.automation.templates);
  const isLoading = useAppSelector((state) => state.automation.isLoading);
  const { handleLogout } = useAuth();

  const [editingFlowKey, setEditingFlowKey] = useState<string | null>(null);
  const [customFlows, setCustomFlows] = useState<FlowConfig[]>(loadCustomFlows());
  const [deletedDefaultFlows, setDeletedDefaultFlows] = useState<string[]>(loadDeletedDefaultFlows());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFlowLabel, setNewFlowLabel] = useState('');
  const [newFlowKey, setNewFlowKey] = useState('');
  const [deletingFlowKey, setDeletingFlowKey] = useState<string | null>(null);

  // Load custom flows and deleted default flows on mount
  useEffect(() => {
    setCustomFlows(loadCustomFlows());
    setDeletedDefaultFlows(loadDeletedDefaultFlows());
  }, []);

  // Combine default and custom flows, filtering out deleted default flows
  // Custom flows override default flows with the same key
  const allFlows = useMemo(() => {
    const activeDefaultFlows = DEFAULT_FLOW_CONFIGS.filter(flow => !deletedDefaultFlows.includes(flow.key));
    const defaultFlowKeys = new Set(activeDefaultFlows.map(f => f.key));
    
    // Get custom flows that are NOT overriding default flows
    const pureCustomFlows = customFlows.filter(flow => !defaultFlowKeys.has(flow.key));
    
    // Get custom flows that override defaults (these will replace the defaults)
    const overridingCustomFlows = customFlows.filter(flow => defaultFlowKeys.has(flow.key));
    
    // Use custom override if exists, otherwise use default
    const mergedFlows = activeDefaultFlows.map(defaultFlow => {
      const customOverride = overridingCustomFlows.find(cf => cf.key === defaultFlow.key);
      return customOverride || defaultFlow;
    });
    
    // Combine: merged defaults/customs + pure custom flows
    return [...mergedFlows, ...pureCustomFlows];
  }, [customFlows, deletedDefaultFlows]);

  // Convert flows to WhatsAppAutomation format for table
  const automations: WhatsAppAutomation[] = useMemo(() => {
    return allFlows.map(flow => ({
      key: flow.key,
      label: flow.label,
      hasTemplate: !!(templates[flow.key]?.template_content?.trim()),
      isAutoTrigger: flow.key === 'intro_questionnaire',
    }));
  }, [allFlows, templates]);

  // Fetch templates on mount and migrate from localStorage if needed
  useEffect(() => {
    const migrateAndFetch = async () => {
      // First fetch from database
      const result = await dispatch(fetchTemplates());
      if (result.type === 'automation/fetchTemplates/fulfilled') {
        const dbTemplates = result.payload;
        
        // Check and migrate localStorage templates to database if they don't exist in DB
        const localStorageTemplates: Record<string, string> = {
          'payment_request': localStorage.getItem('paymentMessageTemplate') || '',
          'budget': localStorage.getItem('budgetMessageTemplate') || '',
          'trainee_user_credentials': localStorage.getItem('traineeUserMessageTemplate') || '',
        };

        for (const [flowKey, templateContent] of Object.entries(localStorageTemplates)) {
          if (templateContent && !dbTemplates[flowKey]?.template_content) {
            // Template exists in localStorage but not in database - migrate it
            try {
              await dispatch(saveTemplate({ 
                flowKey, 
                templateContent,
                buttons: [],
                media: null
              })).unwrap();
              console.log(`[WhatsAppAutomationsPage] Migrated template from localStorage: ${flowKey}`);
            } catch (error) {
              console.error(`[WhatsAppAutomationsPage] Error migrating template ${flowKey}:`, error);
            }
          }
        }
      }
    };

    migrateAndFetch();
  }, [dispatch]);

  const generateFlowKey = (label: string): string => {
    return label
      .trim()
      .toLowerCase()
      .replace(/[^\u0590-\u05FFa-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleLabelChange = (value: string) => {
    setNewFlowLabel(value);
    const generatedKey = generateFlowKey(value);
    setNewFlowKey(generatedKey);
  };

  const handleSaveTemplate = async (
    flowKey: string, 
    templateContent: string, 
    buttons?: Array<{ id: string; text: string }>,
    media?: { type: 'image' | 'video' | 'gif'; file?: File; url?: string; previewUrl?: string } | null,
    label?: string
  ) => {
    try {
      await dispatch(saveTemplate({ flowKey, templateContent, buttons, media })).unwrap();
      
      // Also update localStorage for backward compatibility with specific flows
      const localStorageMap: Record<string, string> = {
        'payment_request': 'paymentMessageTemplate',
        'budget': 'budgetMessageTemplate',
        'trainee_user_credentials': 'traineeUserMessageTemplate',
      };
      
      const localStorageKey = localStorageMap[flowKey];
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, templateContent);
      }
      
      // Update flow label if provided
      if (label && label.trim()) {
        const isDefaultFlow = DEFAULT_FLOW_CONFIGS.some(f => f.key === flowKey);
        const defaultFlowLabel = DEFAULT_FLOW_CONFIGS.find(f => f.key === flowKey)?.label;
        const customFlow = customFlows.find(f => f.key === flowKey);
        
        const currentLabel = customFlow?.label || defaultFlowLabel || '';
        
        if (currentLabel !== label.trim()) {
          let updatedCustomFlows: FlowConfig[];
          
          if (isDefaultFlow) {
            const existingCustomIndex = customFlows.findIndex(f => f.key === flowKey);
            if (existingCustomIndex >= 0) {
              updatedCustomFlows = customFlows.map((flow, idx) => 
                idx === existingCustomIndex ? { ...flow, label: label.trim() } : flow
              );
            } else {
              updatedCustomFlows = [...customFlows, { key: flowKey, label: label.trim() }];
            }
          } else {
            updatedCustomFlows = customFlows.map(flow => 
              flow.key === flowKey ? { ...flow, label: label.trim() } : flow
            );
          }
          
          setCustomFlows(updatedCustomFlows);
          saveCustomFlows(updatedCustomFlows);
        }
      }
      
      toast({
        title: 'הצלחה',
        description: 'התבנית נשמרה בהצלחה',
      });
    } catch (error: any) {
      console.error('[WhatsAppAutomationsPage] Error saving template:', error);
      toast({
        title: 'שגיאה',
        description: error || 'נכשל בשמירת התבנית',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleAddAutomation = () => {
    if (!newFlowLabel.trim() || !newFlowKey.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא מלא את כל השדות',
        variant: 'destructive',
      });
      return;
    }

    if (allFlows.some(flow => flow.key === newFlowKey.trim())) {
      toast({
        title: 'שגיאה',
        description: 'מפתח אוטומציה זה כבר קיים',
        variant: 'destructive',
      });
      return;
    }

    const newFlow: FlowConfig = {
      key: newFlowKey.trim(),
      label: newFlowLabel.trim(),
    };

    const updatedFlows = [...customFlows, newFlow];
    setCustomFlows(updatedFlows);
    saveCustomFlows(updatedFlows);

    toast({
      title: 'הצלחה',
      description: 'האוטומציה נוספה בהצלחה',
    });

    setNewFlowLabel('');
    setNewFlowKey('');
    setIsAddDialogOpen(false);

    setEditingFlowKey(newFlow.key);
  };

  const handleDeleteAutomation = (flowKey: string) => {
    const isDefaultFlow = DEFAULT_FLOW_CONFIGS.some(flow => flow.key === flowKey);
    
    if (isDefaultFlow) {
      const updatedDeleted = [...deletedDefaultFlows, flowKey];
      setDeletedDefaultFlows(updatedDeleted);
      saveDeletedDefaultFlows(updatedDeleted);
    } else {
      const updatedFlows = customFlows.filter(flow => flow.key !== flowKey);
      setCustomFlows(updatedFlows);
      saveCustomFlows(updatedFlows);
    }

    if (editingFlowKey === flowKey) {
      setEditingFlowKey(null);
    }

    toast({
      title: 'הצלחה',
      description: 'האוטומציה נמחקה בהצלחה',
    });

    setDeletingFlowKey(null);
  };

  const handleEdit = (automation: WhatsAppAutomation) => {
    setEditingFlowKey(automation.key);
  };

  const handleDelete = (automation: WhatsAppAutomation) => {
    setDeletingFlowKey(automation.key);
  };

  const flowConfig = editingFlowKey ? allFlows.find(f => f.key === editingFlowKey) : null;
  
  // Get template from database first, fallback to localStorage for backward compatibility
  const getTemplateForFlow = (flowKey: string): string => {
    // Check database first
    if (templates[flowKey]?.template_content) {
      return templates[flowKey].template_content;
    }
    
    // Fallback to localStorage for specific flows
    const localStorageMap: Record<string, string> = {
      'payment_request': 'paymentMessageTemplate',
      'budget': 'budgetMessageTemplate',
      'trainee_user_credentials': 'traineeUserMessageTemplate',
    };
    
    const localStorageKey = localStorageMap[flowKey];
    if (localStorageKey) {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        return stored;
      }
    }
    
    return '';
  };
  
  const editingTemplate = editingFlowKey ? getTemplateForFlow(editingFlowKey) : '';
  const editingButtons = editingFlowKey && templates[editingFlowKey]?.buttons 
    ? templates[editingFlowKey].buttons.filter((btn: any): btn is { id: string; text: string } => 
        btn && typeof btn === 'object' && typeof btn.id === 'string' && typeof btn.text === 'string'
      )
    : [];
  const editingMedia = editingFlowKey && templates[editingFlowKey]?.media 
    ? (() => {
        const media = templates[editingFlowKey].media!;
        const mediaUrl = media.url;
        return {
          type: media.type,
          url: mediaUrl,
          previewUrl: mediaUrl
        };
      })()
    : null;

  return {
    // Data
    automations,
    isLoading,
    allFlows,
    templates,
    
    // State
    editingFlowKey,
    deletingFlowKey,
    isAddDialogOpen,
    newFlowLabel,
    newFlowKey,
    flowConfig,
    editingTemplate,
    editingButtons,
    editingMedia,
    
    // Handlers
    handleLogout,
    handleSaveTemplate,
    handleAddAutomation,
    handleDeleteAutomation,
    handleEdit,
    handleDelete,
    handleLabelChange,
    setEditingFlowKey,
    setDeletingFlowKey,
    setIsAddDialogOpen,
    setNewFlowLabel,
    setNewFlowKey,
  };
};
