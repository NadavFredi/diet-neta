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
  const totalTemplates = flowTemplatesData?.totalCount || 0;

  const automations: WhatsAppAutomation[] = useMemo(() => {
    return templatesList.map((template) => ({
      key: template.flow_key,
      label: template.flow_key,
      hasTemplate: !!template.template_content?.trim(),
      isAutoTrigger: false,
    }));
  }, [templatesList]);

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

      if (label && label.trim()) {
        setEditingFlowLabel(label.trim());
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
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      toast({
        title: 'שגיאה',
        description: 'משתמש לא מחובר',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('whatsapp_flow_templates')
      .delete()
      .eq('user_id', userId)
      .eq('flow_key', flowKey);

    if (error) {
      toast({
        title: 'שגיאה',
        description: error.message || 'נכשל במחיקת האוטומציה',
        variant: 'destructive',
      });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['whatsapp-flow-templates'] });

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
