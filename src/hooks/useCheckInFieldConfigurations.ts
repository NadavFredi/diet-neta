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
    weight: { visible: true, label: 'משקל', unit: 'ק״ג', section: 'body' },
    bellyCircumference: { visible: true, label: 'היקף בטן', unit: 'ס״מ', section: 'body' },
    waistCircumference: { visible: true, label: 'היקף מותן', unit: 'ס״מ', section: 'body' },
    thighCircumference: { visible: true, label: 'היקף ירכיים', unit: 'ס״מ', section: 'body' },
    armCircumference: { visible: true, label: 'היקף יד', unit: 'ס״מ', section: 'body' },
    neckCircumference: { visible: true, label: 'היקף צוואר', unit: 'ס״מ', section: 'body' },
    stepsActual: { visible: true, label: 'מס\' צעדים יומי', unit: 'צעדים', section: 'activity' },
    exercisesCount: { visible: true, label: 'כמה תרגילים עשית', unit: 'תרגילים', section: 'activity' },
    cardioAmount: { visible: true, label: 'כמה אירובי עשית', unit: 'דקות', section: 'activity' },
    intervalsCount: { visible: true, label: 'כמה אינטרוולים', unit: 'אינטרוולים', section: 'activity' },
    caloriesDaily: { visible: true, label: 'קלוריות יומי', unit: 'קק״ל', section: 'nutrition' },
    proteinDaily: { visible: true, label: 'חלבון יומי', unit: 'גרם', section: 'nutrition' },
    fiberDaily: { visible: true, label: 'סיבים יומי', unit: 'גרם', section: 'nutrition' },
    waterAmount: { visible: true, label: 'כמה מים שתית', unit: 'ליטר', section: 'nutrition' },
    stressLevel: { visible: true, label: 'רמת הלחץ היומי', unit: '1-10', section: 'wellness' },
    hungerLevel: { visible: true, label: 'רמת הרעב שלך', unit: '1-10', section: 'wellness' },
    energyLevel: { visible: true, label: 'רמת האנרגיה שלך', unit: '1-10', section: 'wellness' },
    sleepHours: { visible: true, label: 'כמה שעות ישנת', unit: 'שעות', section: 'wellness' },
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
        const mergedConfig: CheckInFieldConfiguration = {
          sections: {
            ...DEFAULT_CHECK_IN_CONFIG.sections,
            ...configData.sections,
          },
          fields: {
            ...DEFAULT_CHECK_IN_CONFIG.fields,
            ...(configData.fields || {}),
          },
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

