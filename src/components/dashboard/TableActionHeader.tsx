/**
 * TableActionHeader Component
 * 
 * Unified table header component with full Redux integration.
 * Manages search, filters, column visibility, and primary actions.
 * Pixel-perfect match with Leads page header design.
 */

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TableFilter } from '@/components/dashboard/TableFilter';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { ColumnSettings } from '@/components/dashboard/ColumnSettings';
import { TemplateColumnSettings } from '@/components/dashboard/TemplateColumnSettings';
import { GenericColumnSettings } from '@/components/dashboard/GenericColumnSettings';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Columns, Plus, Settings, LucideIcon, Group } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleColumnVisibility } from '@/store/slices/dashboardSlice';
import {
  toggleColumnVisibility as toggleTableColumnVisibility,
  setSearchQuery,
  addFilter as addFilterAction,
  removeFilter as removeFilterAction,
  clearFilters as clearFiltersAction,
  selectColumnOrder,
  selectSearchQuery,
  selectActiveFilters,
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
import type { FilterField } from '@/components/dashboard/TableFilter';
import { cn } from '@/lib/utils';

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
  
  // Legacy support: For leads, we still use dashboardSlice for search/filters
  // If these are provided, they override Redux state
  legacySearchQuery?: string;
  legacyOnSearchChange?: (value: string) => void;
  legacyActiveFilters?: any[];
  legacyOnFilterAdd?: (filter: any) => void;
  legacyOnFilterRemove?: (filterId: string) => void;
  legacyOnFilterClear?: () => void;
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
  legacyOnFilterAdd,
  legacyOnFilterRemove,
  legacyOnFilterClear,
}: TableActionHeaderProps) => {
  const dispatch = useAppDispatch();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGroupByOpen, setIsGroupByOpen] = useState(false);

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

  // Use legacy props for leads, Redux for others
  const searchQuery = resourceKey === 'leads' && legacySearchQuery !== undefined 
    ? legacySearchQuery 
    : reduxSearchQuery;
  
  const activeFilters = resourceKey === 'leads' && legacyActiveFilters !== undefined
    ? legacyActiveFilters
    : reduxActiveFilters;

  // Handle search change
  const handleSearchChange = (value: string) => {
    if (resourceKey === 'leads' && legacyOnSearchChange) {
      legacyOnSearchChange(value);
    } else {
      dispatch(setSearchQuery({ resourceKey, query: value }));
    }
  };

  // Handle filter actions
  const handleAddFilter = (filter: any) => {
    if (resourceKey === 'leads' && legacyOnFilterAdd) {
      legacyOnFilterAdd(filter);
    } else {
      dispatch(addFilterAction({ resourceKey, filter }));
    }
  };

  const handleRemoveFilter = (filterId: string) => {
    if (resourceKey === 'leads' && legacyOnFilterRemove) {
      legacyOnFilterRemove(filterId);
    } else {
      dispatch(removeFilterAction({ resourceKey, filterId }));
    }
  };

  const handleClearFilters = () => {
    if (resourceKey === 'leads' && legacyOnFilterClear) {
      legacyOnFilterClear();
    } else {
      dispatch(clearFiltersAction({ resourceKey }));
    }
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
    // Filter out columns that shouldn't be grouped (like actions, IDs, etc.)
    return columns.filter((col) => {
      // Exclude certain column types from grouping
      const excludeIds = ['id', 'actions'];
      return !excludeIds.includes(col.id) && col.enableHiding !== false;
    });
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
    
    // Leads: use legacy ColumnSettings component
    if (resourceKey === 'leads' && leadsColumnVisibility) {
      return (
        <ColumnSettings
          columnVisibility={leadsColumnVisibility}
          onToggleColumn={handleToggleColumn as any}
        />
      );
    }
    
    // Generic column settings for customers and other resources (using Redux)
    if (columns && columns.length > 0) {
      return (
        <GenericColumnSettings
          resourceKey={resourceKey}
          columns={columns}
          columnOrder={columnOrder.length > 0 ? columnOrder : columns.map((col) => col.id)}
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
      actions={
        <div className="flex items-center gap-3" dir="rtl">
          {/* Search Input - Rightmost (first in RTL flex) */}
          {enableSearch && (
            <Input
              placeholder={searchPlaceholder || `חיפוש...`}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-64 h-11 text-base bg-white text-gray-900 border border-indigo-200/60 hover:bg-white focus:bg-white focus:border-indigo-400"
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
                  className="gap-2 h-11"
                >
                  <Columns className="h-4 w-4" />
                  <span>עמודות</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end" dir="rtl">
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
              onFilterRemove={handleRemoveFilter}
              onFilterClear={handleClearFilters}
            />
          )}

          {/* Add Button - Leftmost (last in RTL flex) */}
          {addButtonLabel && onAddClick && (
            <Button
              onClick={onAddClick}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white rounded-lg flex items-center gap-2 flex-shrink-0"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>{addButtonLabel}</span>
            </Button>
          )}

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

          {/* Active Filter Chips */}
          {enableFilters && activeFilters && activeFilters.length > 0 && (
            <FilterChips
              filters={activeFilters}
              onRemove={handleRemoveFilter}
              onClearAll={handleClearFilters}
            />
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


