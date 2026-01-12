import React, { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  toggleColumnVisibility as toggleTableColumnVisibility, 
  setColumnVisibility as setTableColumnVisibility,
  selectColumnVisibility,
  initializeTableState,
  type ResourceKey 
} from '@/store/slices/tableStateSlice';
import type { DataTableColumn } from '@/components/ui/DataTable';

interface GenericColumnSettingsProps<T> {
  resourceKey: ResourceKey;
  columns: DataTableColumn<T>[];
  columnOrder: string[];
}

export const GenericColumnSettings = <T extends Record<string, any>>({
  resourceKey,
  columns,
  columnOrder,
}: GenericColumnSettingsProps<T>) => {
  const dispatch = useAppDispatch();
  const columnVisibility = useAppSelector((state) => selectColumnVisibility(state, resourceKey));
  const [searchQuery, setSearchQuery] = useState('');
  
  // Ensure state is initialized
  const isInitialized = useAppSelector((state) => !!state.tableState.tables[resourceKey]);
  
  React.useEffect(() => {
    if (!isInitialized && columns.length > 0) {
      const columnIds = columns.map((col) => col.id);
      dispatch(
        initializeTableState({
          resourceKey,
          columnIds,
        })
      );
    }
  }, [dispatch, resourceKey, columns, isInitialized]);

  const handleToggleColumn = (columnId: string, checked: boolean) => {
    // Ensure state is initialized before toggling
    if (!isInitialized && columns.length > 0) {
      const columnIds = columns.map((col) => col.id);
      const initialVisibility: Record<string, boolean> = {};
      columnIds.forEach((id) => {
        initialVisibility[id] = true; // Default all to visible
      });
      dispatch(
        initializeTableState({
          resourceKey,
          columnIds,
          initialVisibility,
        })
      );
    }
    // Use setColumnVisibility to explicitly set the value
    dispatch(setTableColumnVisibility({ resourceKey, columnId, visible: checked }));
  };

  // Filter columns based on search query
  const filteredColumns = useMemo(() => {
    const orderedColumns = columnOrder
      .map((colId) => columns.find((col) => col.id === colId))
      .filter((col): col is DataTableColumn<T> => 
        col !== undefined && col.enableHiding !== false
      );

    if (!searchQuery.trim()) {
      return orderedColumns;
    }

    const query = searchQuery.toLowerCase().trim();
    return orderedColumns.filter((col) => {
      const headerText = typeof col.header === 'string' ? col.header : col.id;
      return headerText.toLowerCase().includes(query) || col.id.toLowerCase().includes(query);
    });
  }, [columnOrder, columns, searchQuery]);

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">הצגת עמודות</h4>
      
      {/* Search Input */}
      <Input
        placeholder="חיפוש עמודות..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-9 text-sm bg-white text-gray-900 border border-gray-200 hover:bg-white focus:bg-white focus:border-indigo-400"
        dir="rtl"
      />

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredColumns.length > 0 ? (
          filteredColumns.map((col) => {
            const headerText = typeof col.header === 'string' ? col.header : col.id;
            // Check if column visibility is explicitly set in Redux, default to true if not set
            const isVisible = columnVisibility[col.id] !== undefined 
              ? columnVisibility[col.id] 
              : true;
            return (
              <div key={col.id} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.id}`}
                  checked={isVisible}
                  onCheckedChange={(checked) => {
                    // Explicitly set visibility instead of toggling to ensure proper state
                    handleToggleColumn(col.id, checked === true);
                  }}
                  disabled={col.enableHiding === false}
                />
                <Label
                  htmlFor={`col-${col.id}`}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {headerText}
                </Label>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            לא נמצאו עמודות התואמות לחיפוש
          </div>
        )}
      </div>
    </div>
  );
};


