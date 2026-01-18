/**
 * Hook for managing check-in field configurations
 * Allows admins to customize which fields are visible in client check-in forms
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

export interface CheckInFieldConfig {
  visible: boolean;
  label: string;
  unit: string;
  section: 'body' | 'activity' | 'nutrition' | 'wellness';
  id?: string; // For dynamic fields
  order?: number; // Order within the section for drag-and-drop
}

export interface CheckInSectionConfig {
  visible: boolean;
  label: string;
}

export interface CheckInFieldConfiguration {
  sections: {
    body: CheckInSectionConfig;
    activity: CheckInSectionConfig;
    nutrition: CheckInSectionConfig;
    wellness: CheckInSectionConfig;
  };
  fields: Record<string, CheckInFieldConfig>; // Changed to Record to support dynamic fields
}

// Default configuration (all fields visible with default labels)
export const DEFAULT_CHECK_IN_CONFIG: CheckInFieldConfiguration = {
  sections: {
    body: { visible: true, label: 'מדדי גוף' },
    activity: { visible: true, label: 'פעילות' },
    nutrition: { visible: true, label: 'תזונה' },
    wellness: { visible: true, label: 'בריאות' },
  },
  fields: {
    weight: { visible: true, label: 'משקל', unit: 'ק״ג', section: 'body', order: 0 },
    bellyCircumference: { visible: true, label: 'היקף בטן', unit: 'ס״מ', section: 'body', order: 1 },
    waistCircumference: { visible: true, label: 'היקף מותן', unit: 'ס״מ', section: 'body', order: 2 },
    thighCircumference: { visible: true, label: 'היקף ירכיים', unit: 'ס״מ', section: 'body', order: 3 },
    armCircumference: { visible: true, label: 'היקף יד', unit: 'ס״מ', section: 'body', order: 4 },
    neckCircumference: { visible: true, label: 'היקף צוואר', unit: 'ס״מ', section: 'body', order: 5 },
    stepsActual: { visible: true, label: 'מס\' צעדים יומי', unit: 'צעדים', section: 'activity', order: 0 },
    exercisesCount: { visible: true, label: 'כמה תרגילים עשית', unit: 'תרגילים', section: 'activity', order: 1 },
    cardioAmount: { visible: true, label: 'כמה אירובי עשית', unit: 'דקות', section: 'activity', order: 2 },
    intervalsCount: { visible: true, label: 'כמה אינטרוולים', unit: 'אינטרוולים', section: 'activity', order: 3 },
    caloriesDaily: { visible: true, label: 'קלוריות יומי', unit: 'קק״ל', section: 'nutrition', order: 0 },
    proteinDaily: { visible: true, label: 'חלבון יומי', unit: 'גרם', section: 'nutrition', order: 1 },
    fiberDaily: { visible: true, label: 'סיבים יומי', unit: 'גרם', section: 'nutrition', order: 2 },
    waterAmount: { visible: true, label: 'כמה מים שתית', unit: 'ליטר', section: 'nutrition', order: 3 },
    stressLevel: { visible: true, label: 'רמת הלחץ היומי', unit: '1-10', section: 'wellness', order: 0 },
    hungerLevel: { visible: true, label: 'רמת הרעב שלך', unit: '1-10', section: 'wellness', order: 1 },
    energyLevel: { visible: true, label: 'רמת האנרגיה שלך', unit: '1-10', section: 'wellness', order: 2 },
    sleepHours: { visible: true, label: 'כמה שעות ישנת', unit: 'שעות', section: 'wellness', order: 3 },
  },
};

export const useCheckInFieldConfigurations = (customerId?: string | null) => {
  const [configuration, setConfiguration] = useState<CheckInFieldConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAppSelector((state) => state.auth);

  const fetchConfiguration = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to fetch customer-specific config first, then global
      let configData: CheckInFieldConfiguration | null = null;

      if (customerId) {
        const { data: customerConfig, error: customerError } = await supabase
          .from('check_in_field_configurations')
          .select('configuration')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (customerError && customerError.code !== 'PGRST116') {
          throw customerError;
        }

        if (customerConfig?.configuration) {
          configData = customerConfig.configuration as CheckInFieldConfiguration;
        }
      }

      // If no customer-specific config, fetch global/default
      if (!configData) {
        const { data: globalConfig, error: globalError } = await supabase
          .from('check_in_field_configurations')
          .select('configuration')
          .is('customer_id', null)
          .maybeSingle();

        if (globalError && globalError.code !== 'PGRST116') {
          throw globalError;
        }

        if (globalConfig?.configuration) {
          configData = globalConfig.configuration as CheckInFieldConfiguration;
        }
      }

      // Merge with defaults to ensure all fields are present
      if (configData) {
        // Merge fields, preserving order from configData or falling back to defaults
        const mergedFields: Record<string, CheckInFieldConfig> = {};
        
        // Start with default fields to ensure all are present
        Object.entries(DEFAULT_CHECK_IN_CONFIG.fields).forEach(([key, defaultField]) => {
          const configField = configData.fields?.[key];
          mergedFields[key] = {
            ...defaultField,
            ...(configField || {}),
            // Ensure order is set (use config order if exists, otherwise default order)
            order: configField?.order !== undefined ? configField.order : defaultField.order ?? 999,
          };
        });
        
        // Add any custom fields from configData that aren't in defaults
        if (configData.fields) {
          Object.entries(configData.fields).forEach(([key, field]) => {
            if (!mergedFields[key]) {
              mergedFields[key] = {
                ...field,
                order: field.order ?? 999,
              };
            }
          });
        }
        
        const mergedConfig: CheckInFieldConfiguration = {
          sections: {
            ...DEFAULT_CHECK_IN_CONFIG.sections,
            ...configData.sections,
          },
          fields: mergedFields,
        };
        setConfiguration(mergedConfig);
      } else {
        setConfiguration(DEFAULT_CHECK_IN_CONFIG);
      }
    } catch (err) {
      console.error('Error fetching check-in field configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch configuration');
      setConfiguration(DEFAULT_CHECK_IN_CONFIG); // Fallback to defaults
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  const saveConfiguration = useCallback(async (
    config: CheckInFieldConfiguration,
    isGlobal: boolean = false
  ) => {
    try {
      setError(null);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('User not authenticated');
      }

      const configToSave = isGlobal ? null : customerId;
      
      // Upsert configuration
      const { error: saveError } = await supabase
        .from('check_in_field_configurations')
        .upsert({
          customer_id: configToSave,
          configuration: config,
          created_by: authUser.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'customer_id',
        });

      if (saveError) throw saveError;

      setConfiguration(config);
      return true;
    } catch (err) {
      console.error('Error saving check-in field configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
      throw err;
    }
  }, [customerId]);

  useEffect(() => {
    fetchConfiguration();
  }, [fetchConfiguration]);

  return {
    configuration: configuration || DEFAULT_CHECK_IN_CONFIG,
    isLoading,
    error,
    fetchConfiguration,
    saveConfiguration,
  };
};

