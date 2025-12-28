import { useState } from 'react';
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
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { toggleColumnVisibility } from '@/store/slices/dashboardSlice';
import { toggleColumnVisibility as toggleTableColumnVisibility, selectColumnOrder, type ResourceKey } from '@/store/slices/tableStateSlice';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

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
  onFilterAdd?: (filter: any) => void;
  onFilterRemove?: (filterId: string) => void;
  onFilterClear?: () => void;
  
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
  onFilterAdd: externalOnFilterAdd,
  onFilterRemove: externalOnFilterRemove,
  onFilterClear: externalOnFilterClear,
  columns,
}: TablePageHeaderProps) => {
  const dispatch = useAppDispatch();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Use external search query if provided, otherwise use local state
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
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
  const addFilter = externalOnFilterAdd || internalFilters.addFilter;
  const removeFilter = externalOnFilterRemove || internalFilters.removeFilter;
  const clearFilters = externalOnFilterClear || internalFilters.clearFilters;

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
      className={className}
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
              onFilterRemove={removeFilter}
              onFilterClear={clearFilters}
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
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9] text-white rounded-lg flex items-center gap-2 flex-shrink-0"
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
              onRemove={removeFilter}
              onClearAll={clearFilters}
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


