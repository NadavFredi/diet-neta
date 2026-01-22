/**
 * TableActionHeader Component
 * 
 * Unified table header component with full Redux integration.
 * Manages search, filters, column visibility, and primary actions.
 * Pixel-perfect match with Leads page header design.
 */

import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TableFilter } from '@/components/dashboard/TableFilter';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { ColumnSettings } from '@/components/dashboard/ColumnSettings';
import { TemplateColumnSettings } from '@/components/dashboard/TemplateColumnSettings';
import { GenericColumnSettings } from '@/components/dashboard/GenericColumnSettings';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Columns, Plus, Settings, LucideIcon, Group, X, Save } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleColumnVisibility } from '@/store/slices/dashboardSlice';
import { useQueryClient } from '@tanstack/react-query';
import {
  toggleColumnVisibility as toggleTableColumnVisibility,
  setSearchQuery,
  addFilter as addFilterAction,
  updateFilter as updateFilterAction,
  removeFilter as removeFilterAction,
  clearFilters as clearFiltersAction,
  setActiveFilters,
  selectColumnOrder,
  selectColumnVisibility,
  selectSearchQuery,
  selectActiveFilters,
  selectFilterGroup,
  selectGroupByKey,
  selectGroupByKeys,
  selectGroupSorting,
  setGroupByKey,
  setGroupByKeys,
  setGroupSorting,
  initializeTableState,
  type ResourceKey,
} from '@/store/slices/tableStateSlice';
import { GroupBadge } from './GroupBadge';
import { GroupBySelector } from './GroupBySelector';
import type { DataTableColumn } from '@/components/ui/DataTable';
import type { ActiveFilter, FilterField, FilterGroup } from '@/components/dashboard/TableFilter';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getFilterGroupSignature, isAdvancedFilterGroup } from '@/utils/filterGroupUtils';
import { useDefaultView } from '@/hooks/useDefaultView';
import { useSavedView, useUpdateSavedView } from '@/hooks/useSavedViews';
import { useToast } from '@/hooks/use-toast';
import type { FilterConfig } from '@/hooks/useSavedViews';
import { useSearchParams } from 'react-router-dom';

interface TableActionHeaderProps {
  // Required props
  resourceKey: ResourceKey;
  title: string;
  icon?: LucideIcon; // Optional - will use icon from preferences if resourceKey is provided
  dataCount: number;
  singularLabel: string; // e.g., "ליד"
  pluralLabel: string; // e.g., "לידים"
  filterFields: FilterField[];
  
  // Optional props
  searchPlaceholder?: string;
  addButtonLabel?: string;
  onAddClick?: () => void;
  enableColumnVisibility?: boolean;
  enableFilters?: boolean;
  enableGroupBy?: boolean;
  enableSearch?: boolean;
  enableSettings?: boolean;
  onSettingsClick?: () => void;
  className?: string;
  
  // For template-specific column settings (nutrition_templates, templates)
  useTemplateColumnSettings?: boolean;
  templateColumnVisibility?: Record<string, boolean> | any; // TemplateColumnVisibility or similar
  onToggleTemplateColumn?: (columnId: string) => void;
  
  // For generic column settings (when not using template column settings)
  columns?: DataTableColumn<any>[];
  
  // Custom actions to add to the header (e.g., sync button for meetings)
  customActions?: React.ReactNode;
  
  // Legacy support: For leads, we still use dashboardSlice for search/filters
  // If these are provided, they override Redux state
  legacySearchQuery?: string;
  legacyOnSearchChange?: (value: string) => void;
  legacyActiveFilters?: any[];
  legacyFilterGroup?: FilterGroup;
  legacyOnFilterAdd?: (filter: any) => void;
  legacyOnFilterUpdate?: (filter: any) => void;
  legacyOnFilterRemove?: (filterId: string) => void;
  legacyOnFilterClear?: () => void;
  legacyOnFilterGroupChange?: (group: FilterGroup) => void;
}

export const TableActionHeader = ({
  resourceKey,
  title,
  icon,
  dataCount,
  singularLabel,
  pluralLabel,
  filterFields,
  searchPlaceholder,
  addButtonLabel,
  onAddClick,
  enableColumnVisibility = true,
  enableFilters = true,
  enableGroupBy = true,
  enableSearch = true,
  customActions,
  enableSettings = false,
  onSettingsClick,
  className,
  useTemplateColumnSettings = false,
  templateColumnVisibility,
  onToggleTemplateColumn,
  columns,
  legacySearchQuery,
  legacyOnSearchChange,
  legacyActiveFilters,
  legacyFilterGroup,
  legacyOnFilterAdd,
  legacyOnFilterUpdate,
  legacyOnFilterRemove,
  legacyOnFilterClear,
  legacyOnFilterGroupChange,
}: TableActionHeaderProps) => {
  const dispatch = useAppDispatch();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<ActiveFilter | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const { defaultView } = useDefaultView(resourceKey);
  const updateSavedView = useUpdateSavedView();
  const [searchParams] = useSearchParams();
  const viewId = searchParams.get('view_id');
  const { data: activeView } = useSavedView(viewId);

  // Check if state is initialized
  const isInitialized = useAppSelector((state) => !!state.tableState.tables[resourceKey]);
  
  // Initialize Redux state for this resource if not already initialized
  useEffect(() => {
    if (resourceKey !== 'leads' && !isInitialized) {
      // Initialize even without columns (for search/filter state)
      dispatch(
        initializeTableState({
          resourceKey,
          columnIds: columns?.map((col) => col.id) || [],
        })
      );
    }
  }, [dispatch, resourceKey, columns, isInitialized]);

  // Get state from Redux (or use legacy props for leads)
  const reduxSearchQuery = useAppSelector((state) => selectSearchQuery(state, resourceKey));
  const reduxActiveFilters = useAppSelector((state) => selectActiveFilters(state, resourceKey));
  const reduxFilterGroup = useAppSelector((state) => selectFilterGroup(state, resourceKey));

  // Use legacy props when provided, Redux otherwise
  const searchQuery = legacySearchQuery !== undefined 
    ? legacySearchQuery 
    : reduxSearchQuery;
  
  const activeFilters = legacyActiveFilters !== undefined
    ? legacyActiveFilters
    : reduxActiveFilters;

  const filterGroup = legacyFilterGroup !== undefined
    ? legacyFilterGroup
    : reduxFilterGroup;

  // Handle search change
  const handleSearchChange = (value: string) => {
    if (legacyOnSearchChange) {
      legacyOnSearchChange(value);
    } else {
      dispatch(setSearchQuery({ resourceKey, query: value }));
    }
  };

  // Handle filter actions
  const handleAddFilter = (filter: any) => {
    if (legacyOnFilterAdd) {
      legacyOnFilterAdd(filter);
    } else {
      dispatch(addFilterAction({ resourceKey, filter }));
    }
  };

  const handleUpdateFilter = (filter: any) => {
    if (legacyOnFilterUpdate) {
      legacyOnFilterUpdate(filter);
    } else {
      dispatch(updateFilterAction({ resourceKey, filter }));
    }
  };

  const handleRemoveFilter = (filterId: string) => {
    if (legacyOnFilterRemove) {
      legacyOnFilterRemove(filterId);
    } else {
      dispatch(removeFilterAction({ resourceKey, filterId }));
    }
    if (editingFilter?.id === filterId) {
      setEditingFilter(null);
    }
  };

  const handleClearFilters = () => {
    if (legacyOnFilterClear) {
      legacyOnFilterClear();
    } else {
      dispatch(clearFiltersAction({ resourceKey }));
    }
    setEditingFilter(null);
  };

  const handleFilterGroupChange = (group: FilterGroup) => {
    if (legacyOnFilterGroupChange) {
      legacyOnFilterGroupChange(group);
    } else {
      dispatch(setActiveFilters({ resourceKey, filters: group }));
    }
  };

  // Get column visibility from Redux for leads (legacy dashboardSlice)
  const leadsColumnVisibility = resourceKey === 'leads' 
    ? useAppSelector((state) => state.dashboard.columnVisibility)
    : undefined;

  const handleToggleColumn = (columnId: string) => {
    // Priority: Use Redux tableStateSlice for all resources when columns are provided
    // This ensures column visibility syncs with DataTable
    if (columns && columns.length > 0) {
      dispatch(toggleTableColumnVisibility({ resourceKey, columnId }));
    } else if (resourceKey === 'leads') {
      // Legacy leads column visibility in dashboardSlice (fallback)
      dispatch(toggleColumnVisibility(columnId as any));
    } else if (useTemplateColumnSettings && onToggleTemplateColumn) {
      // Template column settings - use provided handler (fallback)
      onToggleTemplateColumn(columnId);
    } else {
      // Use new tableStateSlice for other resources
      dispatch(toggleTableColumnVisibility({ resourceKey, columnId }));
    }
  };

  // Get column order from Redux
  const columnOrder = useAppSelector((state) => selectColumnOrder(state, resourceKey));
  
  // Get column visibility from Redux (for non-leads resources)
  const reduxColumnVisibility = resourceKey !== 'leads' 
    ? useAppSelector((state) => selectColumnVisibility(state, resourceKey))
    : undefined;
  
  // Get groupByKey from Redux (legacy)
  const groupByKey = useAppSelector((state) => selectGroupByKey(state, resourceKey));
  
  // Get multi-level grouping from Redux
  const groupByKeys = useAppSelector((state) => selectGroupByKeys(state, resourceKey));
  const groupSorting = useAppSelector((state) => selectGroupSorting(state, resourceKey));
  
  // Handle group by change (legacy - for backward compatibility)
  const handleGroupByChange = (key: string | null) => {
    dispatch(setGroupByKey({ resourceKey, groupByKey: key }));
    setIsGroupByOpen(false);
  };

  // Handle multi-level group by change
  const handleGroupByKeysChange = (keys: [string | null, string | null]) => {
    dispatch(setGroupByKeys({ resourceKey, groupByKeys: keys }));
  };

  // Handle group sorting change
  const handleGroupSortingChange = (level: 1 | 2, direction: 'asc' | 'desc' | null) => {
    dispatch(setGroupSorting({ resourceKey, level, direction }));
  };

  // Build column headers map for GroupBadge
  const columnHeadersMap: Record<string, string> = {};
  if (columns) {
    columns.forEach((col) => {
      const headerText = typeof col.header === 'string' ? col.header : col.id;
      columnHeadersMap[col.id] = headerText;
    });
  }
  
  // Get available columns for grouping (only visible columns that can be grouped)
  const getGroupableColumns = () => {
    if (!columns || columns.length === 0) {
      return [];
    }
    // Filter out columns that shouldn't be grouped (like actions, etc.)
    return columns.filter((col) => {
      // Exclude certain column types from grouping
      const excludeIds = ['actions'];
      return !excludeIds.includes(col.id) && col.enableHiding !== false;
    });
  };

  const getColumnSettingsComponent = () => {
    // Priority 1: Generic column settings (using Redux tableStateSlice) - works for all tables
    // This ensures column visibility syncs with DataTable which also uses Redux tableStateSlice
    if (columns && columns.length > 0) {
      return (
        <GenericColumnSettings
          resourceKey={resourceKey}
          columns={columns}
          columnOrder={columnOrder.length > 0 ? columnOrder : columns.map((col) => col.id)}
        />
      );
    }
    
    // Fallback 1: Template column settings (for backward compatibility if columns not provided)
    if (useTemplateColumnSettings && templateColumnVisibility && onToggleTemplateColumn) {
      return (
        <TemplateColumnSettings
          columnVisibility={templateColumnVisibility}
          onToggleColumn={onToggleTemplateColumn}
        />
      );
    }
    
    // Fallback 2: Leads legacy ColumnSettings (for backward compatibility if columns not provided)
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

  // Check if filters are currently active (applied to the page)
  const hasActiveFilters = useMemo(() => {
    // Check if there are active filters
    const hasFilters = activeFilters && activeFilters.length > 0;
    // Check if there's an advanced filter group
    const hasAdvancedFilterGroup = filterGroup && isAdvancedFilterGroup(filterGroup);
    // Check if grouping is active
    const hasGrouping = !!(groupByKeys[0] || groupByKeys[1]);
    
    return hasFilters || hasAdvancedFilterGroup || hasGrouping;
  }, [activeFilters, filterGroup, groupByKeys]);

  // Reset filtersExpanded when navigating to a page without active filters
  useEffect(() => {
    if (!hasActiveFilters && filtersExpanded) {
      setFiltersExpanded(false);
    }
  }, [hasActiveFilters, filtersExpanded]);

  // Check if filters are dirty (different from saved/default state)
  const filtersDirty = useMemo(() => {
    const targetView = viewId ? activeView : defaultView;
    if (!targetView) return false;
    
    const savedConfig = targetView.filter_config as FilterConfig | null;
    if (!savedConfig) return false;
    
    const savedFilters = savedConfig.advancedFilters || [];
    const savedFilterGroup = savedConfig.filterGroup || null;
    const savedSearchQuery = savedConfig.searchQuery || '';
    const savedColumnVisibility = savedConfig.columnVisibility || {};
    
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
    
    // Compare column visibility
    // Get current column visibility - use Redux for non-leads, dashboardSlice for leads
    const currentColumnVisibility = resourceKey === 'leads' 
      ? leadsColumnVisibility || {}
      : (reduxColumnVisibility || {});
    
    // Normalize column visibility for comparison (sort keys for consistent comparison)
    const currentColumnVisibilityStr = JSON.stringify(
      Object.keys(currentColumnVisibility)
        .sort()
        .reduce((acc, key) => {
          acc[key] = currentColumnVisibility[key];
          return acc;
        }, {} as Record<string, boolean>)
    );
    const savedColumnVisibilityStr = JSON.stringify(
      Object.keys(savedColumnVisibility)
        .sort()
        .reduce((acc, key) => {
          acc[key] = savedColumnVisibility[key];
          return acc;
        }, {} as Record<string, boolean>)
    );
    const columnVisibilityChanged = currentColumnVisibilityStr !== savedColumnVisibilityStr;
    
    // Filters are dirty if filters changed, search query changed, or column visibility changed
    return filtersChanged || searchQueryChanged || columnVisibilityChanged;
  }, [activeFilters, searchQuery, defaultView, activeView, viewId, filterGroup, resourceKey, leadsColumnVisibility, reduxColumnVisibility]);

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
      // Get current column visibility - use Redux for non-leads, dashboardSlice for leads
      const currentColumnVisibility = resourceKey === 'leads' 
        ? leadsColumnVisibility || {}
        : (reduxColumnVisibility || {});
      
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
        columnVisibility: currentColumnVisibility,
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

  return (
    <PageHeader
      title={title}
      icon={icon}
      resourceKey={resourceKey}
      className={className}
      dataCount={dataCount}
      singularLabel={singularLabel}
      pluralLabel={pluralLabel}
      hasActiveFilters={hasActiveFilters}
      filtersExpanded={filtersExpanded}
      onFiltersExpandedChange={setFiltersExpanded}
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap" dir="rtl">
          {/* Search Input - Rightmost (first in RTL flex) */}
          {enableSearch && (
            <Input
              placeholder={searchPlaceholder || `חיפוש...`}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full sm:w-64 h-10 sm:h-11 text-sm sm:text-base bg-white text-gray-900 border border-indigo-200/60 hover:bg-white focus:bg-white focus:border-indigo-400"
              dir="rtl"
            />
          )}

          {/* Columns Button */}
          {enableColumnVisibility && (
            <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 sm:gap-2 h-10 sm:h-11 px-2 sm:px-3"
                >
                  <Columns className="h-4 w-4" />
                  <span>עמודות</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 max-w-sm" align="end" dir="rtl">
                {getColumnSettingsComponent()}
              </PopoverContent>
            </Popover>
          )}

          {/* Group By Button */}
          {enableGroupBy && columns && columns.length > 0 && (
            <Popover open={isGroupByOpen} onOpenChange={setIsGroupByOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "gap-2 h-11",
                    (groupByKeys[0] || groupByKeys[1]) && "bg-slate-50 border-slate-300"
                  )}
                >
                  <Group className="h-4 w-4" />
                  <span>קיבוץ לפי</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" align="end" dir="rtl">
                <GroupBySelector
                  columns={columns}
                  groupByKeys={groupByKeys}
                  groupSorting={groupSorting}
                  onGroupByKeysChange={handleGroupByKeysChange}
                  onGroupSortingChange={handleGroupSortingChange}
                  onClose={() => setIsGroupByOpen(false)}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Filter Button */}
          {enableFilters && (
            <TableFilter
              fields={filterFields}
              activeFilters={activeFilters}
              onFilterAdd={handleAddFilter}
              onFilterUpdate={handleUpdateFilter}
              onFilterRemove={handleRemoveFilter}
              onFilterClear={handleClearFilters}
              filterGroup={filterGroup}
              onFilterGroupChange={handleFilterGroupChange}
              editFilter={editingFilter}
              onEditApplied={() => setEditingFilter(null)}
              hasActiveFilters={hasActiveFilters}
              filtersExpanded={filtersExpanded}
              onToggleFiltersExpanded={() => setFiltersExpanded(!filtersExpanded)}
            />
          )}

          {/* Save View Button - Only show when filters are dirty */}
          {filtersDirty && (
            <Button
              onClick={handleSaveFilters}
              size="sm"
              variant="outline"
              className="flex items-center gap-2 flex-shrink-0 h-10 sm:h-11"
            >
              <Save className="h-4 w-4" />
              <span>שמור מסננים</span>
            </Button>
          )}

          {/* Add Button */}
          {addButtonLabel && onAddClick && (
            <Button
              onClick={onAddClick}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-lg flex items-center gap-1.5 sm:gap-2 flex-shrink-0 h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>{addButtonLabel}</span>
            </Button>
          )}

          {/* Custom actions slot - Leftmost (last in RTL flex) */}
          {customActions}

          {/* Settings Button (Optional) - Not used in current design */}
          {enableSettings && onSettingsClick && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-11"
              onClick={onSettingsClick}
            >
              <Settings className="h-4 w-4" />
              <span>הגדרות</span>
            </Button>
          )}
        </div>
      }
      filters={
        <div className="space-y-3">
          {/* Group Badge */}
          {(groupByKeys[0] || groupByKeys[1]) && (
            <GroupBadge
              groupByKeys={groupByKeys}
              columnHeaders={columnHeadersMap}
              onEdit={() => setIsGroupByOpen(true)}
              onRemove={() => {
                dispatch(setGroupByKeys({ resourceKey, groupByKeys: [null, null] }));
              }}
            />
          )}

          {filterGroup && isAdvancedFilterGroup(filterGroup) && (
            <Badge variant="secondary" className="w-fit bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 pr-1.5">
              <span>סינון מתקדם פעיל</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearFilters();
                }}
                className="ml-1 rounded-full hover:bg-indigo-100 p-0.5 transition-colors"
                aria-label="נקה מסננים"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {/* Active Filter Chips */}
          {enableFilters && activeFilters && activeFilters.length > 0 && (
            <FilterChips
              filters={activeFilters}
              filterGroup={filterGroup}
              onRemove={handleRemoveFilter}
              onClearAll={handleClearFilters}
              onEdit={setEditingFilter}
            />
          )}
        </div>
      }
    />
  );
};
