/**
 * WhatsApp Automations Page
 * Centralized page for managing all WhatsApp automation templates
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { Settings, Send, Plus, Trash2, Zap, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTemplates, saveTemplate } from '@/store/slices/automationSlice';
import { TemplateEditorModal } from '@/components/dashboard/TemplateEditorModal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAuth } from '@/hooks/useAuth';

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

export const WhatsAppAutomationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const templates = useAppSelector((state) => state.automation.templates);
  const isLoading = useAppSelector((state) => state.automation.isLoading);
  const [editingFlowKey, setEditingFlowKey] = useState<string | null>(null);
  const [customFlows, setCustomFlows] = useState<FlowConfig[]>(loadCustomFlows());
  const [deletedDefaultFlows, setDeletedDefaultFlows] = useState<string[]>(loadDeletedDefaultFlows());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFlowLabel, setNewFlowLabel] = useState('');
  const [newFlowKey, setNewFlowKey] = useState('');
  const [deletingFlowKey, setDeletingFlowKey] = useState<string | null>(null);
  const sidebarWidth = useSidebarWidth();
  const { user } = useAppSelector((state) => state.auth);
  const { handleLogout } = useAuth();

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
    const overridingKeys = new Set(overridingCustomFlows.map(f => f.key));
    
    // Use custom override if exists, otherwise use default
    const mergedFlows = activeDefaultFlows.map(defaultFlow => {
      const customOverride = overridingCustomFlows.find(cf => cf.key === defaultFlow.key);
      return customOverride || defaultFlow;
    });
    
    // Combine: merged defaults/customs + pure custom flows
    return [...mergedFlows, ...pureCustomFlows];
  }, [customFlows, deletedDefaultFlows]);

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

  if (isLoading) {
    return (
      <div className="bg-gray-50 flex flex-col min-h-screen" dir="rtl">
        <DashboardHeader
          userEmail={user?.email}
          onLogout={handleLogout}
          sidebarContent={<DashboardSidebar />}
        />
        <div className="flex-1 flex items-center justify-center" style={{ marginRight: `${sidebarWidth.width}px` }}>
          <div className="text-center">
            <Loader2 className="inline-block animate-spin h-8 w-8 text-[#5B6FB9] mb-2" />
            <p className="text-sm text-gray-600">טוען אוטומציות...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex flex-col min-h-screen" dir="rtl">
      <DashboardHeader
        userEmail={user?.email}
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar />}
      />
      
      <div 
        className="flex-1 overflow-y-auto"
        style={{ marginRight: `${sidebarWidth.width}px` }}
      >
        <div className="p-4 pt-24 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Send className="h-4 w-4 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">אוטומציית WhatsApp</h1>
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
            >
              <Plus className="h-4 w-4 ml-1.5" />
              הוסף אוטומציה
            </Button>
          </div>

          {/* Automation List */}
          <Card className="p-6 border border-slate-100 rounded-xl shadow-md bg-white">
            <div className="space-y-2.5">
              {allFlows.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p className="mb-2">אין אוטומציות</p>
                  <p className="text-sm">לחץ על "הוסף אוטומציה" כדי להתחיל</p>
                </div>
              ) : (
                allFlows.map((flow) => {
                  const hasTemplate = templates[flow.key]?.template_content?.trim() || false;
                  const isAutoTrigger = flow.key === 'intro_questionnaire';

                  return (
                    <div
                      key={flow.key}
                      className="flex items-center gap-2"
                    >
                      {isAutoTrigger ? (
                        <div
                          className={cn(
                            "flex-1 justify-start min-h-9 h-auto",
                            "bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200",
                            "hover:from-purple-100 hover:to-blue-100 hover:border-purple-300",
                            "text-xs font-semibold rounded-lg px-3 py-1.5",
                            "flex items-center gap-2 cursor-default"
                          )}
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal',
                            lineHeight: '1.5'
                          }}
                        >
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                            <span className="text-xs text-purple-600 font-bold">אוטומטי</span>
                          </div>
                          <span className="text-right leading-tight text-gray-900">{flow.label}</span>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "flex-1 justify-start min-h-9 h-auto",
                            "bg-[#5B6FB9] text-white",
                            "text-xs font-semibold rounded-lg px-3 py-1.5",
                            "flex items-center gap-2 cursor-default"
                          )}
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal',
                            lineHeight: '1.5'
                          }}
                        >
                          <Send className="h-3.5 w-3.5 ml-1.5 flex-shrink-0" />
                          <span className="text-right leading-tight">{flow.label}</span>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingFlowKey(flow.key)}
                        className="h-9 w-9 flex-shrink-0 border-gray-300 hover:bg-gray-200 hover:border-gray-400"
                        title="ערוך תבנית"
                      >
                        <Settings className="h-3.5 w-3.5 text-gray-600" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDeletingFlowKey(flow.key)}
                        className="h-9 w-9 flex-shrink-0 border-red-300 hover:bg-red-50 hover:border-red-400 text-red-600"
                        title="מחק אוטומציה"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

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
    </div>
  );
};
