import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface EntityConfig {
  entity: string;
  tableName: string;
  columns: any[];
  filters: any[];
  grouping: any[];
  defaultSort: { field: string; direction: 'asc' | 'desc' };
}

interface QueryOptions {
  select?: string | string[];
  filters?: any[];
  sort?: { field: string; direction: 'asc' | 'desc' };
  page?: number;
  pageSize?: number;
}

export const useEntityQuery = (entityName: string) => {
  const [config, setConfig] = useState<EntityConfig | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-interface-options', {
        body: { entity: entityName }
      });
      if (error) throw error;
      setConfig(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingConfig(false);
    }
  }, [entityName]);

  // Fetch data
  const fetchData = useCallback(async (options: QueryOptions = {}) => {
    if (!config) return; // Wait for config
    
    setIsLoadingData(true);
    try {
      // Ensure 'id' is always selected for keys/navigation
      const columnsToSelect = new Set(options.select || config.columns.filter(c => c.visible).map(c => c.id));
      columnsToSelect.add('id');

      const payload = {
        entity: entityName,
        select: Array.from(columnsToSelect),
        filters: options.filters || [],
        sort: options.sort || config.defaultSort,
        page: options.page || 1,
        pageSize: options.pageSize || 20
      };

      const { data: responseData, error } = await supabase.functions.invoke('query-entity', {
        body: payload
      });

      if (error) throw error;
      
      setData(responseData.data);
      setCount(responseData.count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingData(false);
    }
  }, [entityName, config]);

  // Initial config load
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    data,
    count,
    isLoading: isLoadingConfig || isLoadingData,
    error,
    fetchData
  };
};
