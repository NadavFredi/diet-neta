/**
 * LeadAutomationCard Component
 * 
 * Card for managing WhatsApp automation flows for leads/customers
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Settings, Send, Loader2, Plus, Trash2, Zap, ChevronDown, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTemplates, saveTemplate, setSendingFlow } from '@/store/slices/automationSlice';
import { sendWhatsAppMessage, replacePlaceholders } from '@/services/greenApiService';
import { TemplateEditorModal } from './TemplateEditorModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Customer } from '@/hooks/useCustomers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

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
];

// Load custom flows from localStorage
const loadCustomFlows = (): FlowConfig[] => {
  try {
    const stored = localStorage.getItem('custom_automation_flows');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    // Silent failure
  }
  return [];
};

// Save custom flows to localStorage
const saveCustomFlows = (flows: FlowConfig[]): void => {
  try {
    localStorage.setItem('custom_automation_flows', JSON.stringify(flows));
  } catch (error) {
    // Silent failure
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
    // Silent failure
  }
  return [];
};

// Save deleted default flows to localStorage
const saveDeletedDefaultFlows = (deletedKeys: string[]): void => {
  try {
    localStorage.setItem('deleted_default_automation_flows', JSON.stringify(deletedKeys));
  } catch (error) {
    // Silent failure
  }
};

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
  const [customFlows, setCustomFlows] = useState<FlowConfig[]>(loadCustomFlows());
  const [deletedDefaultFlows, setDeletedDefaultFlows] = useState<string[]>(loadDeletedDefaultFlows());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFlowLabel, setNewFlowLabel] = useState('');
  const [newFlowKey, setNewFlowKey] = useState('');
  const [deletingFlowKey, setDeletingFlowKey] = useState<string | null>(null);
  const [selectedFlowKey, setSelectedFlowKey] = useState<string | null>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);

  // Load custom flows and deleted default flows on mount
  useEffect(() => {
    setCustomFlows(loadCustomFlows());
    setDeletedDefaultFlows(loadDeletedDefaultFlows());
  }, []);

  // Combine default and custom flows, filtering out deleted default flows
  // Custom flows with keys matching default flows are label overrides, not separate flows
  const activeDefaultFlows = DEFAULT_FLOW_CONFIGS.filter(flow => !deletedDefaultFlows.includes(flow.key));
  const defaultFlowKeys = new Set(activeDefaultFlows.map(f => f.key));
  const labelOverrides = new Map(customFlows.filter(f => defaultFlowKeys.has(f.key)).map(f => [f.key, f.label]));
  const pureCustomFlows = customFlows.filter(f => !defaultFlowKeys.has(f.key));
  
  // Merge default flows with label overrides, then add pure custom flows
  const allFlows = [
    ...activeDefaultFlows.map(flow => ({
      ...flow,
      label: labelOverrides.get(flow.key) || flow.label
    })),
    ...pureCustomFlows
  ];

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
      lead_id: lead?.id || '', // Supabase row ID for URL parameters
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

      // Process buttons if they exist
      const processedButtons = template.buttons?.map(btn => ({
        id: btn.id,
        text: replacePlaceholders(btn.text, placeholders), // Replace placeholders in button text
      }));

      // Process media if it exists
      const media = template.media ? {
        type: template.media.type as 'image' | 'video' | 'gif',
        url: template.media.url,
      } : undefined;

      const result = await sendWhatsAppMessage({
        phoneNumber: customer.phone,
        message,
        buttons: processedButtons,
        media,
      });

      if (result.success) {
        toast({
          title: result.warning ? 'הצלחה (עם אזהרה)' : 'הצלחה',
          description: result.warning || 'ההודעה נשלחה בהצלחה!',
          variant: result.warning ? 'default' : 'default',
        });
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשליחת ההודעה',
        variant: 'destructive',
      });
    } finally {
      dispatch(setSendingFlow({ flowKey, isSending: false }));
    }
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
      
      // Update flow label if provided
      if (label && label.trim()) {
        const isDefaultFlow = DEFAULT_FLOW_CONFIGS.some(f => f.key === flowKey);
        const defaultFlowLabel = DEFAULT_FLOW_CONFIGS.find(f => f.key === flowKey)?.label;
        const customFlow = customFlows.find(f => f.key === flowKey);
        
        // Get current label (custom overrides default)
        const currentLabel = customFlow?.label || defaultFlowLabel || '';
        
        // Only update if label actually changed
        if (currentLabel !== label.trim()) {
          let updatedCustomFlows: FlowConfig[];
          
          if (isDefaultFlow) {
            // For default flows, add/update in custom flows to override default label
            const existingCustomIndex = customFlows.findIndex(f => f.key === flowKey);
            if (existingCustomIndex >= 0) {
              // Update existing custom flow
              updatedCustomFlows = customFlows.map((flow, idx) => 
                idx === existingCustomIndex ? { ...flow, label: label.trim() } : flow
              );
            } else {
              // Add new custom flow to override default
              updatedCustomFlows = [...customFlows, { key: flowKey, label: label.trim() }];
            }
          } else {
            // For custom flows, just update in place
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

    // Check if flow key already exists
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

    // Reset form and close dialog
    setNewFlowLabel('');
    setNewFlowKey('');
    setIsAddDialogOpen(false);

    // Open template editor for the new flow
    setEditingFlowKey(newFlow.key);
  };

  const generateFlowKey = (label: string): string => {
    // Convert Hebrew label to a valid flow key
    return label
      .trim()
      .toLowerCase()
      .replace(/[^\u0590-\u05FFa-z0-9\s]/g, '') // Remove special chars, keep Hebrew and alphanumeric
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  };

  const handleLabelChange = (value: string) => {
    setNewFlowLabel(value);
    // Always auto-generate flow key from label
    const generatedKey = generateFlowKey(value);
    setNewFlowKey(generatedKey);
  };

  const handleDeleteAutomation = (flowKey: string) => {
    // Check if it's a default flow
    const isDefaultFlow = DEFAULT_FLOW_CONFIGS.some(flow => flow.key === flowKey);
    
    if (isDefaultFlow) {
      // Mark default flow as deleted
      const updatedDeleted = [...deletedDefaultFlows, flowKey];
      setDeletedDefaultFlows(updatedDeleted);
      saveDeletedDefaultFlows(updatedDeleted);
    } else {
      // Remove from custom flows
      const updatedFlows = customFlows.filter(flow => flow.key !== flowKey);
      setCustomFlows(updatedFlows);
      saveCustomFlows(updatedFlows);
    }

    // If the deleted flow was being edited, close the editor
    if (editingFlowKey === flowKey) {
      setEditingFlowKey(null);
    }

    // If the deleted flow was selected, clear the selection
    if (selectedFlowKey === flowKey) {
      setSelectedFlowKey(null);
    }

    toast({
      title: 'הצלחה',
      description: 'האוטומציה נמחקה בהצלחה',
    });

    setDeletingFlowKey(null);
  };

  if (!customer || !lead) {
    return null;
  }

  const flowConfig = allFlows.find(f => f.key === editingFlowKey);
  const editingTemplate = editingFlowKey ? templates[editingFlowKey]?.template_content || '' : '';
  // Ensure buttons is always a valid array
  const editingButtons = editingFlowKey && templates[editingFlowKey]?.buttons 
    ? templates[editingFlowKey].buttons.filter((btn: any): btn is { id: string; text: string } => 
        btn && typeof btn === 'object' && typeof btn.id === 'string' && typeof btn.text === 'string'
      )
    : [];
  // Get media from template
  const editingMedia = editingFlowKey && templates[editingFlowKey]?.media 
    ? (() => {
        const media = templates[editingFlowKey].media!;
        const mediaUrl = media.url;
        return {
          type: media.type,
          url: mediaUrl,
          previewUrl: mediaUrl // Use the same URL for preview
        };
      })()
    : null;

  return (
    <>
      <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <Send className="h-4 w-4 text-green-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">אוטומציית WhatsApp</h3>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="h-8 px-3 text-xs flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5 ml-1.5" />
            הוסף אוטומציה
          </Button>
        </div>

        {/* Single Row with Autocomplete Search and Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Autocomplete Search */}
          <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isComboboxOpen}
                className="flex-1 justify-between h-9 px-3 text-sm"
                dir="rtl"
              >
                <span className="truncate">
                  {selectedFlowKey
                    ? allFlows.find((flow) => flow.key === selectedFlowKey)?.label
                    : 'בחר אוטומציה...'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 mr-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start" dir="rtl">
              <Command>
                <CommandInput placeholder="חפש אוטומציה..." />
                <CommandList>
                  <CommandEmpty>לא נמצאה אוטומציה</CommandEmpty>
                  <CommandGroup>
                    {allFlows.map((flow) => (
                      <CommandItem
                        key={flow.key}
                        value={`${flow.key}-${flow.label}`}
                        keywords={[flow.label, flow.key]}
                        onSelect={() => {
                          setSelectedFlowKey(flow.key);
                          setIsComboboxOpen(false);
                        }}
                      >
                        <span>{flow.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Action Buttons */}
          {selectedFlowKey && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (selectedFlowKey) {
                    handleSendFlow(selectedFlowKey);
                  }
                }}
                disabled={
                  !selectedFlowKey ||
                  sendingFlow[selectedFlowKey] ||
                  !templates[selectedFlowKey]?.template_content?.trim()
                }
                className="h-9 w-9 flex-shrink-0 border-blue-300 hover:bg-blue-50 hover:border-blue-400 text-blue-600"
                title="שלח אוטומציה"
              >
                {sendingFlow[selectedFlowKey] ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (selectedFlowKey) {
                    setEditingFlowKey(selectedFlowKey);
                  }
                }}
                className="h-9 w-9 flex-shrink-0 border-gray-300 hover:bg-gray-200 hover:border-gray-400"
                title="ערוך תבנית"
              >
                <Settings className="h-4 w-4 text-gray-600" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (selectedFlowKey) {
                    setDeletingFlowKey(selectedFlowKey);
                  }
                }}
                className="h-9 w-9 flex-shrink-0 border-red-300 hover:bg-red-50 hover:border-red-400 text-red-600"
                title="מחק אוטומציה"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
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
          initialButtons={editingButtons}
          initialMedia={editingMedia}
          onSave={(template, buttons, media, label) => handleSaveTemplate(editingFlowKey, template, buttons, media, label)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingFlowKey && (
        <AlertDialog open={!!deletingFlowKey} onOpenChange={(open) => !open && setDeletingFlowKey(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת אוטומציה</AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך למחוק את האוטומציה "{allFlows.find(f => f.key === deletingFlowKey)?.label}"?
                <br />
                פעולה זו תמחק גם את התבנית הקשורה לאוטומציה זו ולא ניתן לבטל אותה.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteAutomation(deletingFlowKey!)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                מחק
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Add Automation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>הוסף אוטומציה חדשה</DialogTitle>
            <DialogDescription>
              צור אוטומציה חדשה לשליחת הודעות WhatsApp אוטומטיות
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="flow-label">שם האוטומציה</Label>
              <Input
                id="flow-label"
                value={newFlowLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="לדוגמה: שליחת תזכורת שבועית"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground">
                מפתח האוטומציה ייווצר אוטומטית מהשם
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewFlowLabel('');
                setNewFlowKey('');
              }}
            >
              ביטול
            </Button>
            <Button onClick={handleAddAutomation}>
              הוסף אוטומציה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
