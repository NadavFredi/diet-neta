/**
 * WhatsAppAutomationsPage Logic
 *
 * Handles all business logic, data fetching, and state management
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTemplates, saveTemplate } from '@/store/slices/automationSlice';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { WhatsAppAutomation } from '@/components/dashboard/columns/whatsappAutomationColumns';
import { supabase } from '@/lib/supabaseClient';
import { useWhatsAppFlowTemplates } from '@/hooks/useWhatsAppFlowTemplates';
import {
  selectSearchQuery,
  selectCurrentPage,
  selectPageSize,
  selectSortBy,
  selectSortOrder,
  setSearchQuery,
  setCurrentPage,
  setPageSize,
  setSortBy,
  setSortOrder,
} from '@/store/slices/tableStateSlice';
import { 
  getActiveFlows, 
  saveCustomFlows, 
  loadCustomFlows,
  loadDeletedDefaultFlows,
  saveDeletedDefaultFlows,
  DEFAULT_FLOW_CONFIGS
} from '@/utils/whatsappAutomationFlows';

export const useWhatsAppAutomationsPage = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const templates = useAppSelector((state) => state.automation.templates);
  const isLoading = useAppSelector((state) => state.automation.isLoading);
  const { handleLogout } = useAuth();

  const [editingFlowKey, setEditingFlowKey] = useState<string | null>(null);
  const [editingFlowLabel, setEditingFlowLabel] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newFlowLabel, setNewFlowLabel] = useState('');
  const [newFlowKey, setNewFlowKey] = useState('');
  const [deletingFlowKey, setDeletingFlowKey] = useState<string | null>(null);
  
  // Local state for immediate updates
  const [customFlows, setCustomFlows] = useState(loadCustomFlows());
  const [deletedDefaultFlows, setDeletedDefaultFlows] = useState(loadDeletedDefaultFlows());

  const searchQuery = useAppSelector((state) => selectSearchQuery(state, 'whatsapp_automations'));
  const currentPage = useAppSelector((state) => selectCurrentPage(state, 'whatsapp_automations'));
  const pageSize = useAppSelector((state) => selectPageSize(state, 'whatsapp_automations'));
  const sortBy = useAppSelector((state) => selectSortBy(state, 'whatsapp_automations'));
  const sortOrder = useAppSelector((state) => selectSortOrder(state, 'whatsapp_automations'));

  const { data: flowTemplatesData, isLoading: isLoadingTemplates } = useWhatsAppFlowTemplates({
    search: searchQuery || undefined,
    page: currentPage,
    pageSize,
    sortBy,
    sortOrder,
  });

  const templatesList = flowTemplatesData?.data || [];
  // Use templatesList count if pagination is handled by backend, but here we are merging lists so it's tricky.
  // Actually, we should probably do client-side merging and then paginate? 
  // Or just display all for now since the list is small?
  // The useWhatsAppFlowTemplates hook seems to support server-side pagination.
  // BUT the default flows might NOT be in the DB yet.
  
  // For the purpose of "ensuring all automations exist", we should merge the active flows (defaults + customs)
  // with the DB results.
  
  const automations: WhatsAppAutomation[] = useMemo(() => {
    // 1. Get all active flows (defaults + customs)
    // We recreate the logic from getActiveFlows locally using the state to ensure reactivity
    const activeDefaultFlows = DEFAULT_FLOW_CONFIGS.filter(flow => !deletedDefaultFlows.includes(flow.key));
    const defaultFlowKeys = new Set(activeDefaultFlows.map(f => f.key));
    const labelOverrides = new Map(customFlows.filter(f => defaultFlowKeys.has(f.key)).map(f => [f.key, f.label]));
    const pureCustomFlows = customFlows.filter(f => !defaultFlowKeys.has(f.key));
    
    const activeFlows = [
      ...activeDefaultFlows.map(flow => ({
        ...flow,
        label: labelOverrides.get(flow.key) || flow.label
      })),
      ...pureCustomFlows
    ];

    // 2. Map to WhatsAppAutomation format
    const mergedAutomations = activeFlows.map(flow => {
      // Find matching template from DB results if available (for hasTemplate check)
      // Note: templatesList might only contain a subset if paginated.
      // Ideally, we should check the full 'templates' map from Redux which is loaded via fetchTemplates()
      const template = templates[flow.key];
      
      return {
        key: flow.key,
        label: flow.label,
        hasTemplate: !!template?.template_content?.trim(),
        isAutoTrigger: false, // This info is not available in flow config yet
      };
    });

    // 3. Filter by search query if client-side filtering needed (since we added defaults that might not be in DB)
    if (searchQuery) {
      return mergedAutomations.filter(a => 
        a.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.key.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return mergedAutomations;
  }, [templatesList, templates, customFlows, deletedDefaultFlows, searchQuery]);

  const totalTemplates = automations.length;

  // Fetch templates on mount and migrate from localStorage if needed
  useEffect(() => {
    const migrateAndFetch = async () => {
      const result = await dispatch(fetchTemplates());
      if (result.type === 'automation/fetchTemplates/fulfilled') {
        const dbTemplates = result.payload;

        const localStorageTemplates: Record<string, string> = {
          'payment_request': localStorage.getItem('paymentMessageTemplate') || '',
          'budget': localStorage.getItem('budgetMessageTemplate') || '',
          'trainee_user_credentials': localStorage.getItem('traineeUserMessageTemplate') || '',
          'weekly_review': localStorage.getItem('weeklyReviewMessageTemplate') || '',
        };

        let hasMigrations = false;
        for (const [flowKey, templateContent] of Object.entries(localStorageTemplates)) {
          if (templateContent && templateContent.trim()) {
            const dbTemplate = dbTemplates[flowKey]?.template_content;
            if (!dbTemplate || !dbTemplate.trim()) {
              try {
                await dispatch(saveTemplate({
                  flowKey,
                  templateContent,
                  buttons: [],
                  media: null,
                })).unwrap();
                hasMigrations = true;
              } catch {
                // Silent failure
              }
            }
          }
        }

        if (hasMigrations) {
          await dispatch(fetchTemplates());
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
    setNewFlowKey(generateFlowKey(value));
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

      const localStorageMap: Record<string, string> = {
        'payment_request': 'paymentMessageTemplate',
        'budget': 'budgetMessageTemplate',
        'trainee_user_credentials': 'traineeUserMessageTemplate',
        'weekly_review': 'weeklyReviewMessageTemplate',
      };

      const localStorageKey = localStorageMap[flowKey];
      if (localStorageKey) {
        localStorage.setItem(localStorageKey, templateContent);
      }

      // Handle label update using the shared logic
      if (label && label.trim()) {
        const isDefaultFlow = DEFAULT_FLOW_CONFIGS.some(f => f.key === flowKey);
        const defaultFlowLabel = DEFAULT_FLOW_CONFIGS.find(f => f.key === flowKey)?.label;
        const customFlow = customFlows.find(f => f.key === flowKey);
        
        const currentLabel = customFlow?.label || defaultFlowLabel || '';
        
        if (currentLabel !== label.trim()) {
          let updatedCustomFlows;
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
          setEditingFlowLabel(label.trim());
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['whatsapp-flow-templates'] });

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

    if (automations.some(flow => flow.key === newFlowKey.trim())) {
      toast({
        title: 'שגיאה',
        description: 'מפתח אוטומציה זה כבר קיים',
        variant: 'destructive',
      });
      return;
    }

    // Add to custom flows
    const newFlow = { key: newFlowKey.trim(), label: newFlowLabel.trim() };
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

    setEditingFlowKey(newFlowKey.trim());
    setEditingFlowLabel(newFlowLabel.trim());
  };

  const handleDeleteAutomation = async (flowKey: string) => {
    // Check if it's a default flow
    const isDefaultFlow = DEFAULT_FLOW_CONFIGS.some(flow => flow.key === flowKey);
    
    if (isDefaultFlow) {
      // Mark default flow as deleted in localStorage
      const updatedDeleted = [...deletedDefaultFlows, flowKey];
      setDeletedDefaultFlows(updatedDeleted);
      saveDeletedDefaultFlows(updatedDeleted);
    } else {
      // Remove from custom flows in localStorage
      const updatedFlows = customFlows.filter(flow => flow.key !== flowKey);
      setCustomFlows(updatedFlows);
      saveCustomFlows(updatedFlows);
    }

    // Also remove the template from DB if it exists
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (userId) {
       await supabase
        .from('whatsapp_flow_templates')
        .delete()
        .eq('user_id', userId)
        .eq('flow_key', flowKey);
       
       await queryClient.invalidateQueries({ queryKey: ['whatsapp-flow-templates'] });
    }

    if (editingFlowKey === flowKey) {
      setEditingFlowKey(null);
      setEditingFlowLabel(null);
    }

    toast({
      title: 'הצלחה',
      description: 'האוטומציה נמחקה בהצלחה',
    });

    setDeletingFlowKey(null);
  };

  const handleEdit = (automation: WhatsAppAutomation) => {
    setEditingFlowKey(automation.key);
    setEditingFlowLabel(automation.label || automation.key);
  };

  const handleDelete = (automation: WhatsAppAutomation) => {
    setDeletingFlowKey(automation.key);
  };

  const flowConfig = editingFlowKey
    ? { key: editingFlowKey, label: editingFlowLabel || editingFlowKey }
    : null;

  const getTemplateForFlow = (flowKey: string): string => {
    if (templates[flowKey]?.template_content) {
      return templates[flowKey].template_content;
    }

    const localStorageMap: Record<string, string> = {
      'payment_request': 'paymentMessageTemplate',
      'budget': 'budgetMessageTemplate',
      'trainee_user_credentials': 'traineeUserMessageTemplate',
      'weekly_review': 'weeklyReviewMessageTemplate',
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
          previewUrl: mediaUrl,
        };
      })()
    : null;

  const handleSortChange = useCallback((columnId: string, order: 'ASC' | 'DESC') => {
    dispatch(setSortBy({ resourceKey: 'whatsapp_automations', sortBy: columnId }));
    dispatch(setSortOrder({ resourceKey: 'whatsapp_automations', sortOrder: order }));
  }, [dispatch]);

  const handlePageChange = useCallback((page: number) => {
    dispatch(setCurrentPage({ resourceKey: 'whatsapp_automations', page }));
  }, [dispatch]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    dispatch(setPageSize({ resourceKey: 'whatsapp_automations', pageSize: newPageSize }));
  }, [dispatch]);

  const handleSearchChange = useCallback((value: string) => {
    dispatch(setSearchQuery({ resourceKey: 'whatsapp_automations', query: value }));
  }, [dispatch]);

  return {
    // Data
    automations,
    isLoading: isLoading || isLoadingTemplates,
    templates,
    totalTemplates,

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
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    searchQuery,

    // Handlers
    handleLogout,
    handleSaveTemplate,
    handleAddAutomation,
    handleDeleteAutomation,
    handleEdit,
    handleDelete,
    handleLabelChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
    handleSearchChange,
    setEditingFlowKey,
    setDeletingFlowKey,
    setIsAddDialogOpen,
    setNewFlowLabel,
    setNewFlowKey,
  };
};
