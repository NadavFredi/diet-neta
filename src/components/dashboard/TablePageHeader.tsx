import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TableFilter } from '@/components/dashboard/TableFilter';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { ColumnSettings } from '@/components/dashboard/ColumnSettings';
import { TemplateColumnSettings } from '@/components/dashboard/TemplateColumnSettings';
import { GenericColumnSettings } from '@/components/dashboard/GenericColumnSettings';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Columns, Plus, LucideIcon } from 'lucide-react';
import { useTableFilters, type FilterField } from '@/hooks/useTableFilters';
import type { ActiveFilter, FilterGroup } from '@/components/dashboard/TableFilter';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleColumnVisibility } from '@/store/slices/dashboardSlice';
import { toggleColumnVisibility as toggleTableColumnVisibility, selectColumnOrder, type ResourceKey } from '@/store/slices/tableStateSlice';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getFilterGroupSignature, isAdvancedFilterGroup } from '@/utils/filterGroupUtils';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView, useUpdateSavedView } from '@/hooks/useSavedViews';
import { useToast } from '@/hooks/use-toast';
import type { FilterConfig } from '@/hooks/useSavedViews';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface TablePageHeaderProps {
  // Required props
  resourceKey: ResourceKey;
  title: string;
  icon: LucideIcon;
  dataCount: number;
  singularLabel: string; // e.g., "ליד"
  pluralLabel: string; // e.g., "לידים"
  filterFields: FilterField[];
  searchPlaceholder?: string;
  
  // Optional props
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  addButtonLabel?: string;
  onAddClick?: () => void;
  enableColumnVisibility?: boolean;
  enableFilters?: boolean;
  enableSearch?: boolean;
  className?: string;
  
  // For template-specific column settings (nutrition_templates, templates)
  useTemplateColumnSettings?: boolean;
  templateColumnVisibility?: Record<string, boolean> | any; // TemplateColumnVisibility or similar
  onToggleTemplateColumn?: (columnId: string) => void;
  
  // Optional: External filter management (for modals that need access to filters)
  activeFilters?: any[];
  filterGroup?: FilterGroup;
  onFilterAdd?: (filter: any) => void;
  onFilterUpdate?: (filter: any) => void;
  onFilterRemove?: (filterId: string) => void;
  onFilterClear?: () => void;
  onFilterGroupChange?: (group: FilterGroup) => void;
  
  // For generic column settings (when not using template column settings)
  columns?: DataTableColumn<any>[];
}

export const TablePageHeader = ({
  resourceKey,
  title,
  icon,
  dataCount,
  singularLabel,
  pluralLabel,
  filterFields,
  searchPlaceholder,
  searchQuery: externalSearchQuery,
  onSearchChange,
  addButtonLabel,
  onAddClick,
  enableColumnVisibility = true,
  enableFilters = true,
  enableSearch = true,
  className,
  useTemplateColumnSettings = false,
  templateColumnVisibility,
  onToggleTemplateColumn,
  activeFilters: externalActiveFilters,
  filterGroup: externalFilterGroup,
  onFilterAdd: externalOnFilterAdd,
  onFilterUpdate: externalOnFilterUpdate,
  onFilterRemove: externalOnFilterRemove,
  onFilterClear: externalOnFilterClear,
  onFilterGroupChange: externalOnFilterGroupChange,
  columns,
}: TablePageHeaderProps) => {
  const dispatch = useAppDispatch();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<ActiveFilter | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const { defaultView } = useDefaultView(resourceKey);
  const updateSavedView = useUpdateSavedView();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { data: activeView } = useSavedView(viewId);

  // Get search query from Redux if not provided externally
  const reduxSearchQuery = useAppSelector((state) => {
    return state.tableState.tables[resourceKey]?.searchQuery || '';
  });
  
  // Use external search query if provided, otherwise use Redux, otherwise use local state
  const searchQuery = externalSearchQuery !== undefined 
    ? externalSearchQuery 
    : reduxSearchQuery || localSearchQuery;
    
  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearchQuery(value);
    }
  };

  // Use external filters if provided, otherwise use table filters hook
  const internalFilters = useTableFilters([]);
  const activeFilters = externalActiveFilters || internalFilters.filters;
  const filterGroup = externalFilterGroup || internalFilters.filterGroup;
  const addFilter = externalOnFilterAdd || internalFilters.addFilter;
  const updateFilter = externalOnFilterUpdate || internalFilters.updateFilter;
  const removeFilter = externalOnFilterRemove || internalFilters.removeFilter;
  const clearFilters = externalOnFilterClear || internalFilters.clearFilters;
  const handleFilterGroupChange = externalOnFilterGroupChange || internalFilters.setFilterGroup;
  const canEditFilters = (!!externalActiveFilters && !!externalOnFilterUpdate) || !externalActiveFilters;

  const handleRemoveFilter = (filterId: string) => {
    removeFilter(filterId);
    if (editingFilter?.id === filterId) {
      setEditingFilter(null);
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    setEditingFilter(null);
  };

  // Get column visibility from Redux for leads (legacy dashboardSlice)
  const leadsColumnVisibility = resourceKey === 'leads' 
    ? useAppSelector((state) => state.dashboard.columnVisibility)
    : undefined;

  const handleToggleColumn = (columnId: string) => {
    if (resourceKey === 'leads') {
      // Legacy leads column visibility in dashboardSlice
      dispatch(toggleColumnVisibility(columnId as any));
    } else if (useTemplateColumnSettings && onToggleTemplateColumn) {
      // Template column settings - use provided handler
      onToggleTemplateColumn(columnId);
    } else {
      // Use new tableStateSlice for other resources
      dispatch(toggleTableColumnVisibility({ resourceKey, columnId }));
    }
  };

  // Get column order from Redux
  const columnOrder = useAppSelector((state) => selectColumnOrder(state, resourceKey));

  // Check if filters are dirty (different from saved/default state)
  const filtersDirty = useMemo(() => {
    const targetView = viewId ? activeView : defaultView;
    if (!targetView) return false;
    
    const savedConfig = targetView.filter_config as FilterConfig | null;
    if (!savedConfig) return false;
    
    const savedFilters = savedConfig.advancedFilters || [];
    const savedFilterGroup = savedConfig.filterGroup || null;
    const savedSearchQuery = savedConfig.searchQuery || '';
    
    // Normalize current filters for comparison
    const currentFilters = (activeFilters || []).map(f => ({
      id: f.id,
      fieldId: f.fieldId,
      operator: f.operator,
      values: Array.isArray(f.values) ? [...f.values].sort() : f.values,
      type: f.type,
    })).sort((a, b) => a.id.localeCompare(b.id));
    
    // Normalize saved filters for comparison
    const normalizedSavedFilters = (savedFilters || []).map((f: any) => ({
      id: f.id,
      fieldId: f.fieldId,
      operator: f.operator,
      values: Array.isArray(f.values) ? [...f.values].sort() : f.values,
      type: f.type,
    })).sort((a: any, b: any) => a.id.localeCompare(b.id));
    
    const currentFilterGroupStr = getFilterGroupSignature(filterGroup || undefined);
    const savedFilterGroupStr = getFilterGroupSignature(savedFilterGroup || undefined);
    const filtersChanged = savedFilterGroup
      ? currentFilterGroupStr !== savedFilterGroupStr
      : JSON.stringify(currentFilters) !== JSON.stringify(normalizedSavedFilters);
    
    // Compare search query
    const currentSearchQuery = (searchQuery || '').trim();
    const normalizedSavedSearchQuery = savedSearchQuery.trim();
    const searchQueryChanged = currentSearchQuery !== normalizedSavedSearchQuery;
    
    // Filters are dirty if filters changed or search query changed
    return filtersChanged || searchQueryChanged;
  }, [activeFilters, searchQuery, defaultView, activeView, viewId, filterGroup]);

  // Handle saving filters to default view
  const handleSaveFilters = async () => {
    const targetView = viewId ? activeView : defaultView;
    if (!targetView) {
      toast({
        title: 'שגיאה',
        description: 'לא נמצאה תצוגה פעילה',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Build current filter config
      const currentFilterConfig: FilterConfig = {
        ...(targetView.filter_config as FilterConfig),
        searchQuery: searchQuery,
        filterGroup: filterGroup,
        advancedFilters: activeFilters.map(f => ({
          id: f.id,
          fieldId: f.fieldId,
          fieldLabel: f.fieldLabel,
          operator: f.operator,
          values: f.values,
          type: f.type,
        })),
      };

      await updateSavedView.mutateAsync({
        viewId: targetView.id,
        filterConfig: currentFilterConfig,
      });

      if (targetView.is_default) {
        queryClient.invalidateQueries({ queryKey: ['defaultView', resourceKey, user?.id] });
      } else if (viewId) {
        queryClient.invalidateQueries({ queryKey: ['savedView', viewId, user?.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['savedViews', resourceKey, user?.id] });

      toast({
        title: 'הצלחה',
        description: 'המסננים נשמרו בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת המסננים. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const getColumnSettingsComponent = () => {
    // Template column settings (nutrition_templates, templates using TemplateColumnSettings)
    if (useTemplateColumnSettings && templateColumnVisibility && onToggleTemplateColumn) {
      return (
        <TemplateColumnSettings
          columnVisibility={templateColumnVisibility}
          onToggleColumn={onToggleTemplateColumn}
        />
      );
    }
    
    // Generic column settings (preferred when columns are provided - supports related entity columns)
    if (columns && columns.length > 0) {
      return (
        <GenericColumnSettings
          resourceKey={resourceKey}
          columns={columns}
          columnOrder={columnOrder.length > 0 ? columnOrder : columns.map((col) => col.id)}
        />
      );
    }
    
    // Leads: fallback to legacy ColumnSettings component (only if columns not provided)
    if (resourceKey === 'leads' && leadsColumnVisibility) {
      return (
        <ColumnSettings
          columnVisibility={leadsColumnVisibility}
          onToggleColumn={handleToggleColumn as any}
        />
      );
    }
    
    return null;
  };

  return (
    <PageHeader
      title={title}
      icon={icon}
      resourceKey={resourceKey}
      className={className}
      filtersDirty={filtersDirty}
      onSaveFilters={handleSaveFilters}
      actions={
        <div className="flex items-center gap-3">
          {/* Search Input */}
          {enableSearch && (
            <Input
              placeholder={searchPlaceholder || `חיפוש...`}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-64 h-11 text-base bg-white text-gray-900 border border-indigo-200/60 shadow-sm hover:bg-white focus:bg-white focus:border-indigo-400 transition-colors"
              dir="rtl"
            />
          )}

          {/* Filter Button */}
          {enableFilters && (
            <TableFilter
              fields={filterFields}
              activeFilters={activeFilters}
              onFilterAdd={addFilter}
              onFilterUpdate={canEditFilters ? updateFilter : undefined}
              onFilterRemove={handleRemoveFilter}
              onFilterClear={handleClearFilters}
              filterGroup={filterGroup}
              onFilterGroupChange={handleFilterGroupChange}
              editFilter={canEditFilters ? editingFilter : null}
              onEditApplied={() => setEditingFilter(null)}
            />
          )}

          {/* Columns Button */}
          {enableColumnVisibility && (
            <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 h-11"
                >
                  <Columns className="h-4 w-4" />
                  <span>עמודות</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 shadow-xl" align="end" dir="rtl">
                {getColumnSettingsComponent()}
              </PopoverContent>
            </Popover>
          )}

          {/* Add Button */}
          {addButtonLabel && onAddClick && (
            <Button
              onClick={onAddClick}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-lg flex items-center gap-2 flex-shrink-0"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>{addButtonLabel}</span>
            </Button>
          )}
        </div>
      }
      filters={
        <div className="space-y-3">
          {/* Active Filter Chips */}
          {enableFilters && activeFilters && activeFilters.length > 0 && (
            <FilterChips
              filters={activeFilters}
              filterGroup={filterGroup}
              onRemove={handleRemoveFilter}
              onClearAll={handleClearFilters}
              onEdit={canEditFilters ? setEditingFilter : undefined}
            />
          )}

          {filterGroup && isAdvancedFilterGroup(filterGroup) && (
            <Badge variant="secondary" className="w-fit bg-indigo-50 text-indigo-700 border border-indigo-200">
              סינון מתקדם פעיל
            </Badge>
          )}

          {/* Results Count */}
          <p className="text-sm text-gray-500 font-normal">
            {dataCount} {dataCount === 1 ? singularLabel : pluralLabel} נמצאו
          </p>
        </div>
      }
    />
  );
};
