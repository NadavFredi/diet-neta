import React, { useState, useMemo } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { 
  setColumnVisibility as setTableColumnVisibility,
  setColumnOrder as setTableColumnOrder,
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

interface SortableColumnItemProps {
  column: DataTableColumn<any>;
  isVisible: boolean;
  onToggle: (checked: boolean) => void;
}

const SortableColumnItem = ({ column, isVisible, onToggle }: SortableColumnItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const headerText = typeof column.header === 'string' ? column.header : column.id;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group/column-item">
      <button
        type="button"
        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        {...attributes}
        {...listeners}
        title="גרור לשינוי סדר"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        id={`col-${column.id}`}
        checked={isVisible}
        onCheckedChange={(checked) => onToggle(checked === true)}
        disabled={column.enableHiding === false}
      />
      <Label
        htmlFor={`col-${column.id}`}
        className="text-sm font-normal cursor-pointer flex-1"
      >
        {headerText}
      </Label>
    </div>
  );
};

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

  const orderedColumnIds = useMemo(() => {
    const orderedIds = columnOrder.length > 0 ? columnOrder : columns.map((col) => col.id);
    const availableIds = columns.filter((col) => col.enableHiding !== false).map((col) => col.id);
    const seen = new Set<string>();
    const ordered = orderedIds.filter((id) => availableIds.includes(id));
    ordered.forEach((id) => seen.add(id));
    availableIds.forEach((id) => {
      if (!seen.has(id)) ordered.push(id);
    });
    return ordered;
  }, [columnOrder, columns]);

  const renderedColumnIds = useMemo(() => {
    const relatedColumns = Array.from(relatedEntityGroups.values()).flat();
    return [...directColumns, ...relatedColumns].map((col) => col.id);
  }, [directColumns, relatedEntityGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedColumnIds.indexOf(active.id as string);
    const newIndex = orderedColumnIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextOrder = arrayMove(orderedColumnIds, oldIndex, newIndex);
    dispatch(setTableColumnOrder({ resourceKey, order: nextOrder }));
  };

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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={renderedColumnIds}>
              {/* Direct columns (not related to entities) */}
              {directColumns.length > 0 && (
                <div className="space-y-2">
                  {directColumns.map((col) => {
                    const isVisible = columnVisibility[col.id] !== undefined 
                      ? columnVisibility[col.id] 
                      : true;
                    return (
                      <SortableColumnItem
                        key={col.id}
                        column={col}
                        isVisible={isVisible}
                        onToggle={(checked) => handleToggleColumn(col.id, checked)}
                      />
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
                              const isVisible = columnVisibility[col.id] !== undefined 
                                ? columnVisibility[col.id] 
                                : true;
                              return (
                                <div key={col.id} className="px-2">
                                  <SortableColumnItem
                                    column={col}
                                    isVisible={isVisible}
                                    onToggle={(checked) => handleToggleColumn(col.id, checked)}
                                  />
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
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            לא נמצאו עמודות התואמות לחיפוש
          </div>
        )}
      </div>
    </div>
  );
};
