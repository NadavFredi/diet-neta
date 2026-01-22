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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

  // Filter and group columns based on search query and related entities
  const { directColumns, relatedEntityGroups } = useMemo(() => {
    // Get all columns that can be hidden (not just those in columnOrder)
    // This ensures related entity columns are included even if not in columnOrder yet
    const allAvailableColumns = columns.filter((col) => col.enableHiding !== false);
    
    // Create a set of column IDs that are in columnOrder for ordering
    const orderedIds = new Set(columnOrder);
    
    // Sort columns: first those in columnOrder (in order), then those not in columnOrder
    const sortedColumns = [
      ...columnOrder
        .map((colId) => allAvailableColumns.find((col) => col.id === colId))
        .filter((col): col is DataTableColumn<T> => col !== undefined),
      ...allAvailableColumns.filter((col) => !orderedIds.has(col.id))
    ];

    // Filter by search query if provided
    let filtered = sortedColumns;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = sortedColumns.filter((col) => {
        const headerText = typeof col.header === 'string' ? col.header : col.id;
        return headerText.toLowerCase().includes(query) || col.id.toLowerCase().includes(query);
      });
    }

    // Group columns by related entity
    const direct: DataTableColumn<T>[] = [];
    const relatedGroups = new Map<string, DataTableColumn<T>[]>();

    filtered.forEach((col) => {
      const relatedEntity = col.meta?.relatedEntity;
      if (relatedEntity) {
        if (!relatedGroups.has(relatedEntity)) {
          relatedGroups.set(relatedEntity, []);
        }
        relatedGroups.get(relatedEntity)!.push(col);
      } else {
        direct.push(col);
      }
    });

    return {
      directColumns: direct,
      relatedEntityGroups: relatedGroups,
    };
  }, [columnOrder, columns, searchQuery, resourceKey]);

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
        {(directColumns.length > 0 || relatedEntityGroups.size > 0) ? (
          <>
            {/* Direct columns (not related to entities) */}
            {directColumns.length > 0 && (
              <div className="space-y-2">
                {directColumns.map((col) => {
                  const headerText = typeof col.header === 'string' ? col.header : col.id;
                  const isVisible = columnVisibility[col.id] !== undefined 
                    ? columnVisibility[col.id] 
                    : true;
                  return (
                    <div key={col.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`col-${col.id}`}
                        checked={isVisible}
                        onCheckedChange={(checked) => {
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
                })}
              </div>
            )}

            {/* Related entity columns in accordions */}
            {relatedEntityGroups.size > 0 && (
              <Accordion type="multiple" className="w-full">
                {Array.from(relatedEntityGroups.entries()).map(([entityName, entityColumns]) => {
                  const entityLabel = entityColumns[0]?.meta?.relatedEntityLabel || entityName;
                  return (
                    <AccordionItem key={entityName} value={entityName} className="border-0">
                      <AccordionTrigger className="py-2 px-3 hover:no-underline bg-gray-50 rounded-md mb-1 text-sm font-medium text-gray-700 hover:bg-gray-100">
                        {entityLabel}
                      </AccordionTrigger>
                      <AccordionContent className="pb-1 pt-1">
                        <div className="space-y-2">
                          {entityColumns.map((col) => {
                            const headerText = typeof col.header === 'string' ? col.header : col.id;
                            const isVisible = columnVisibility[col.id] !== undefined 
                              ? columnVisibility[col.id] 
                              : true;
                            return (
                              <div key={col.id} className="flex items-center gap-2 px-2">
                                <Checkbox
                                  id={`col-${col.id}`}
                                  checked={isVisible}
                                  onCheckedChange={(checked) => {
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
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            לא נמצאו עמודות התואמות לחיפוש
          </div>
        )}
      </div>
    </div>
  );
};


