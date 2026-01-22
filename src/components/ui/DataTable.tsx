import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnResizeMode,
  type VisibilityState,
  type ColumnOrderState,
} from '@tanstack/react-table';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  initializeTableState,
  setColumnVisibility as setColumnVisibilityAction,
  setColumnSizing as setColumnSizingAction,
  setAllColumnSizing as setAllColumnSizingAction,
  setColumnOrder as setColumnOrderAction,
  toggleColumnVisibility as toggleColumnVisibilityAction,
  selectColumnVisibility,
  selectColumnSizing,
  selectColumnOrder,
  selectGroupByKey,
  selectGroupByKeys,
  selectGroupSorting,
  selectCollapsedGroups,
  toggleGroupCollapse,
  type ResourceKey,
} from '@/store/slices/tableStateSlice';
import { groupDataByKey, groupDataByKeys, type GroupedData, type MultiLevelGroupedData } from '@/utils/groupDataByKey';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUp, ArrowDown, GripVertical, Columns, GripHorizontal, EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

// Stable default values to prevent unnecessary re-renders
const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {};
const DEFAULT_COLUMN_SIZING: Record<string, number> = {};
const DEFAULT_COLUMN_ORDER: string[] = [];
const DEFAULT_GROUP_BY_KEYS: [string | null, string | null] = [null, null];
const DEFAULT_GROUP_SORTING: { level1: 'asc' | 'desc' | null; level2: 'asc' | 'desc' | null } = { level1: null, level2: null };
const DEFAULT_COLLAPSED_GROUPS: string[] = [];
const SELECTION_COLUMN_ID = '__select__';

export interface DataTableColumn<T> {
  id: string;
  header: string | ((props: any) => React.ReactNode);
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (props: any) => React.ReactNode;
  enableSorting?: boolean;
  enableResizing?: boolean;
  enableHiding?: boolean;
  minSize?: number;
  maxSize?: number;
  size?: number;
  meta?: {
    align?: 'left' | 'right' | 'center';
    isNumeric?: boolean;
    truncate?: boolean; // Whether to truncate this column's content
    isSelection?: boolean;
  };
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
  dir?: 'ltr' | 'rtl';
  enableColumnVisibility?: boolean;
  enableColumnReordering?: boolean;
  resourceKey?: ResourceKey; // Resource key for Redux state management
  initialColumnVisibility?: Record<string, boolean>; // Optional initial visibility state (deprecated - use Redux)
  initialColumnOrder?: string[]; // Optional initial column order (deprecated - use Redux)
  // Server-side sorting (for leads)
  onSortChange?: (columnId: string, sortOrder: 'ASC' | 'DESC') => void;
  serverSideSorting?: boolean; // If true, disable client-side sorting and use onSortChange
  sortBy?: string; // Current sort column (for server-side sorting)
  sortOrder?: 'ASC' | 'DESC'; // Current sort order (for server-side sorting)
  enableRowSelection?: boolean;
  getRowId?: (row: T) => string;
  totalCount?: number;
  selectionLabel?: string;
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
  // Group pagination (when grouping is active, paginate groups instead of records)
  groupCurrentPage?: number;
  groupPageSize?: number;
}

// Helper function to get header text and smart truncate
function getHeaderText(header: any): string {
  const headerContent = flexRender(header.column.columnDef.header, header.getContext());
  if (typeof headerContent === 'string') {
    return headerContent;
  }
  if (React.isValidElement(headerContent) && headerContent.props?.children) {
    return String(headerContent.props.children);
  }
  return String(headerContent);
}

// Helper function to smart truncate text - show first 2-3 words
// Only truncate if absolutely necessary, be generous with space
function smartTruncate(text: string, maxLength: number = 20): { display: string; isTruncated: boolean } {
  // Be more generous - only truncate if text is significantly longer
  const effectiveMaxLength = Math.max(maxLength, text.length * 0.9); // Allow up to 90% of text

  if (text.length <= effectiveMaxLength) {
    return { display: text, isTruncated: false };
  }

  // Try to preserve first 2-3 words, but be more generous
  const words = text.split(/\s+/);
  let display = '';
  let wordCount = 0;
  const targetWordCount = words.length <= 3 ? words.length : 3;

  for (const word of words) {
    if (wordCount < targetWordCount && (display.length + word.length + 1) <= maxLength) {
      display += (display ? ' ' : '') + word;
      wordCount++;
    } else {
      break;
    }
  }

  // Only add ellipsis if we actually truncated
  if (display.length < text.length && display.length > 0) {
    return { display: display + '...', isTruncated: true };
  }

  // Fallback: show as much as possible
  return { display: text.substring(0, maxLength - 3) + '...', isTruncated: true };
}

// Sortable Header Component
function SortableHeader<T>({
  header,
  table,
  dir,
  onHeaderClick,
  getSortIcon,
  onResizeStart,
  width,
  isResizing,
  onHideColumn,
}: {
  header: any;
  table: any;
  dir: 'ltr' | 'rtl';
  onHeaderClick: (columnId: string) => void;
  getSortIcon: (columnId: string) => React.ReactNode;
  onResizeStart: (e: React.MouseEvent, columnId: string) => void;
  width: number;
  isResizing: boolean;
  onHideColumn: (columnId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.id,
  });

  const column = table.getColumn(header.id);
  const canSort = column?.getCanSort();
  const canResize = column?.columnDef.enableResizing !== false;
  const canHide = column?.columnDef.enableHiding !== false;
  const meta = column?.columnDef.meta;
  const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
  const columnWidth = header.getSize();
  const [isHovered, setIsHovered] = useState(false);

  const headerText = getHeaderText(header);
  // Let CSS handle truncation naturally - only use JS truncation for very long text (>50 chars)
  // This allows text to use maximum available space
  const isVeryLong = headerText.length > 50;
  const { display: displayText, isTruncated } = isVeryLong
    ? smartTruncate(headerText, 50)
    : { display: headerText, isTruncated: false };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: `${columnWidth}px`,
    minWidth: `${columnWidth}px`,
    maxWidth: `${columnWidth}px`,
  };

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHideColumn(header.id);
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative h-16 px-1 font-bold text-sm text-slate-800 group',
        `text-${align}`,
        canSort && 'cursor-pointer select-none hover:bg-gray-100/60',
        'transition-colors duration-150',
        isDragging && 'z-50'
      )}
      onClick={() => canSort && onHeaderClick(header.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex items-center h-full relative"
        style={{
          flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
          justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start',
          alignItems: 'center',
          gap: '2px', // Minimal gap - icons close to text
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* Header Text - Smart shrinking: allow flex to shrink, CSS handles truncation */}
        <span
          className="truncate"
          style={{
            flex: '1 1 0%', // Take available space, can shrink
            minWidth: 0, // Critical: allow flex to shrink below content size
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: dir === 'rtl' ? '0' : '2px',
            paddingLeft: dir === 'rtl' ? '2px' : '0',
          }}
          title={headerText}
        >
          {headerText}
        </span>

        {/* Icons - Gliding layout, can overlay text edge if narrow */}
        <div
          className="flex items-center flex-shrink-0"
          style={{
            gap: '2px',
            position: 'relative',
            zIndex: 1, // Allow icons to overlay text if needed
          }}
        >
          {/* Sort Icon - appears immediately after text */}
          {canSort && (
            <span
              className="flex-shrink-0 text-slate-600"
              style={{
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onHeaderClick(header.id);
              }}
            >
              {getSortIcon(header.id)}
            </span>
          )}

          {/* Hide Column Button - Shows on Hover, can overlay if narrow */}
          {canHide && isHovered && (
            <button
              onClick={handleHideClick}
              className="flex-shrink-0 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
              title="הסתר עמודה"
              aria-label="הסתר עמודה"
              style={{
                width: '16px',
                height: '16px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <EyeOff className="h-3 w-3 text-slate-600 hover:text-slate-800" />
            </button>
          )}

          {/* Drag Handle - appears on hover */}
          <div
            {...attributes}
            {...listeners}
            className={cn(
              'cursor-grab active:cursor-grabbing flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
              'touch-none'
            )}
            title="גרור לשינוי סדר"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '16px',
              height: '16px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GripHorizontal className="h-3 w-3 text-slate-500" />
          </div>
        </div>

        {/* Resize Handle */}
        {canResize && (
          <div
            className={cn(
              'absolute top-0 bottom-0 w-1 cursor-col-resize transition-all z-10',
              dir === 'rtl' ? 'left-0' : 'right-0',
              isResizing
                ? 'bg-blue-500 w-0.5'
                : 'bg-transparent hover:bg-blue-400/60'
            )}
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, header.id);
            }}
            style={{
              touchAction: 'none',
            }}
            title="גרור לשינוי רוחב"
          >
            <GripVertical
              className={cn(
                "absolute top-1/2 -translate-y-1/2 h-4 w-4 transition-opacity",
                isResizing
                  ? "text-blue-500 opacity-100"
                  : "text-gray-400 opacity-0 group-hover:opacity-100"
              )}
              style={{ [dir === 'rtl' ? 'left' : 'right']: '-1.5px' }}
            />
          </div>
        )}
      </div>
    </th>
  );
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  className,
  emptyMessage = 'לא נמצאו תוצאות',
  dir = 'rtl',
  enableColumnVisibility = true,
  enableColumnReordering = true,
  resourceKey,
  initialColumnVisibility,
  initialColumnOrder,
  onSortChange,
  serverSideSorting = false,
  sortBy: externalSortBy,
  sortOrder: externalSortOrder,
  enableRowSelection = false,
  getRowId,
  totalCount,
  selectionLabel = 'רשומות',
  onBulkDelete,
  groupCurrentPage,
  groupPageSize = 50,
}: DataTableProps<T>) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  // For server-side sorting, sync sorting state from props
  // For client-side sorting, use local state
  const serverSortingState = useMemo<SortingState>(() => {
    if (serverSideSorting && externalSortBy) {
      return [{
        id: externalSortBy,
        desc: externalSortOrder === 'DESC',
      }];
    }
    return [];
  }, [serverSideSorting, externalSortBy, externalSortOrder]);

  const [sorting, setSorting] = useState<SortingState>([]);

  // Sync sorting state with server-side sorting props
  useEffect(() => {
    if (serverSideSorting && externalSortBy) {
      setSorting(serverSortingState);
    }
  }, [serverSideSorting, externalSortBy, externalSortOrder, serverSortingState]);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [hasMeasured, setHasMeasured] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const getRowIdValue = useCallback(
    (row: T): string => {
      if (getRowId) return getRowId(row);
      const value = (row as any)?.id;
      return value ? String(value) : '';
    },
    [getRowId]
  );

  const currentPageIds = useMemo(
    () => data.map(getRowIdValue).filter((id) => id),
    [data, getRowIdValue]
  );

  const totalItems = totalCount ?? data.length;
  const selectedCount = selectAllAcrossPages ? totalItems : selectedRowIds.size;
  const allPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedRowIds.has(id));
  const somePageSelected = currentPageIds.some((id) => selectedRowIds.has(id)) && !allPageSelected;
  const showSelectAllAcrossPages = !selectAllAcrossPages && allPageSelected && totalItems > currentPageIds.length;

  const handleToggleAllPage = (checked: boolean) => {
    if (selectAllAcrossPages) {
      setSelectAllAcrossPages(false);
      setSelectedRowIds(new Set());
      return;
    }

    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        currentPageIds.forEach((id) => next.add(id));
      } else {
        currentPageIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const handleToggleRow = (rowId: string, checked: boolean) => {
    if (!rowId) return;
    if (selectAllAcrossPages) {
      const next = new Set(currentPageIds);
      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      setSelectAllAcrossPages(false);
      setSelectedRowIds(next);
      return;
    }
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(rowId);
      } else {
        next.delete(rowId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectAllAcrossPages(false);
    setSelectedRowIds(new Set());
  };

  const handleConfirmBulkDelete = async () => {
    if (!onBulkDelete) return;
    setIsBulkDeleting(true);
    try {
      await onBulkDelete({
        ids: Array.from(selectedRowIds),
        selectAllAcrossPages,
        totalCount: totalItems,
      });
      handleClearSelection();
      setIsBulkDeleteOpen(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל במחיקה. נסה שוב.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Get state from Redux if resourceKey is provided, otherwise use local state (backward compatibility)
  // Use stable default constants to prevent unnecessary re-renders
  const reduxColumnVisibility = resourceKey ? useAppSelector((state) => selectColumnVisibility(state, resourceKey)) : DEFAULT_COLUMN_VISIBILITY;
  const reduxColumnSizing = resourceKey ? useAppSelector((state) => selectColumnSizing(state, resourceKey)) : DEFAULT_COLUMN_SIZING;
  const reduxColumnOrder = resourceKey ? useAppSelector((state) => selectColumnOrder(state, resourceKey)) : DEFAULT_COLUMN_ORDER;
  const groupByKey = resourceKey ? useAppSelector((state) => selectGroupByKey(state, resourceKey)) : null;
  const groupByKeys = resourceKey ? useAppSelector((state) => selectGroupByKeys(state, resourceKey)) : DEFAULT_GROUP_BY_KEYS;
  const groupSorting = resourceKey ? useAppSelector((state) => selectGroupSorting(state, resourceKey)) : DEFAULT_GROUP_SORTING;
  const collapsedGroups = resourceKey ? useAppSelector((state) => selectCollapsedGroups(state, resourceKey)) : DEFAULT_COLLAPSED_GROUPS;

  // Convert collapsedGroups array to Set for efficient lookup
  const collapsedGroupsSet = useMemo(() => new Set(collapsedGroups), [collapsedGroups]);

  // Initialize Redux state on mount if resourceKey is provided
  useEffect(() => {
    if (resourceKey && columns.length > 0) {
      const columnIds = columns.map((col) => col.id);
      dispatch(
        initializeTableState({
          resourceKey,
          columnIds,
          initialVisibility: initialColumnVisibility,
          initialSizing: undefined,
          initialOrder: initialColumnOrder,
        })
      );
    }
  }, [resourceKey, dispatch, columns, initialColumnVisibility, initialColumnOrder]);

  // Use Redux state if resourceKey is provided, otherwise use empty object (will be managed locally)
  const columnVisibility = resourceKey ? reduxColumnVisibility : {};
  const columnSizing = resourceKey ? reduxColumnSizing : {};

  // Local state for column sizing (backward compatibility only)
  const [localColumnSizing, setLocalColumnSizing] = useState<Record<string, number>>({});

  // Use Redux state if resourceKey is provided, otherwise use local state
  const effectiveColumnSizing = resourceKey ? columnSizing : localColumnSizing;
  const derivedColumnSizing = enableRowSelection
    ? { ...effectiveColumnSizing, [SELECTION_COLUMN_ID]: 48 }
    : effectiveColumnSizing;

  // Fit-to-content: Measure and adjust column widths on initial load
  React.useEffect(() => {
    // Skip if already measured, no data
    if (hasMeasured || data.length === 0) {
      return;
    }

    // Check if user has manually resized any column (effectiveColumnSizing has values that differ from defaults)
    const hasManualResizing = Object.keys(effectiveColumnSizing).length > 0 && Object.keys(effectiveColumnSizing).some((colId) => {
      const col = columns.find((c) => c.id === colId);
      if (!col) return false;
      const defaultSize = col.size || 150;
      return effectiveColumnSizing[colId] !== defaultSize;
    });

    if (hasManualResizing) {
      setHasMeasured(true); // Mark as measured to prevent auto-sizing
      return;
    }

    // Use requestAnimationFrame to ensure DOM is ready
    const measureColumns = () => {
      if (!tableRef.current) return;

      const table = tableRef.current.querySelector('table');
      if (!table) return;

      const newSizing: Record<string, number> = {};

      // Create a temporary measurement container
      const measureDiv = document.createElement('div');
      measureDiv.style.position = 'absolute';
      measureDiv.style.visibility = 'hidden';
      measureDiv.style.whiteSpace = 'nowrap';
      measureDiv.style.fontSize = '0.875rem'; // text-sm
      measureDiv.style.fontFamily = getComputedStyle(table).fontFamily;
      measureDiv.style.fontWeight = '600'; // font-semibold for headers
      document.body.appendChild(measureDiv);

      columns.forEach((col) => {
        // Measure header text
        const headerText = typeof col.header === 'string' ? col.header : col.id;
        measureDiv.textContent = headerText;
        const headerWidth = measureDiv.offsetWidth;

        // Measure sample cell content (use first few rows)
        let maxCellWidth = 0;
        const sampleRows = data.slice(0, Math.min(5, data.length));
        sampleRows.forEach((row) => {
          let cellText = '';
          if (col.accessorKey) {
            const value = (row as any)[col.accessorKey];
            cellText = value !== null && value !== undefined ? String(value) : '';
          } else if (col.accessorFn) {
            const value = col.accessorFn(row);
            cellText = value !== null && value !== undefined ? String(value) : '';
          }

          measureDiv.textContent = cellText;
          measureDiv.style.fontWeight = '400'; // Normal weight for cells
          const cellWidth = measureDiv.offsetWidth;
          maxCellWidth = Math.max(maxCellWidth, cellWidth);
          measureDiv.style.fontWeight = '600'; // Reset for next header
        });

        // Calculate optimal width: max of header, cells, plus padding and icons
        const padding = 32; // px-2 on both sides = 16px * 2
        const iconSpace = 60; // Space for sort icon, hide button, drag handle
        const optimalWidth = Math.max(
          col.minSize || 80,
          Math.max(headerWidth, maxCellWidth) + padding + iconSpace,
          col.size || 150
        );

        // Cap at maxSize if defined
        const finalWidth = col.maxSize ? Math.min(optimalWidth, col.maxSize) : optimalWidth;
        newSizing[col.id] = finalWidth;
      });

      document.body.removeChild(measureDiv);

      // Only apply if we have measurements
      if (Object.keys(newSizing).length > 0) {
        if (resourceKey) {
          // Update Redux state
          dispatch(setAllColumnSizingAction({ resourceKey, sizing: newSizing }));
        } else {
          // Update local state (backward compatibility)
          setLocalColumnSizing(newSizing);
        }
        setHasMeasured(true);
      }
    };

    // Small delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(measureColumns);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [data, columns, hasMeasured, effectiveColumnSizing, resourceKey, dispatch]);
  // Use Redux state for column order if resourceKey is provided, otherwise use local state
  const [localColumnOrder, setLocalColumnOrder] = useState<string[]>(() => {
    if (initialColumnOrder) {
      const validOrder = initialColumnOrder.filter((id) =>
        columns.some((col) => col.id === id)
      );
      const missingColumns = columns
        .filter((col) => !validOrder.includes(col.id))
        .map((col) => col.id);
      return [...validOrder, ...missingColumns];
    }
    return columns.map((col) => col.id);
  });

  // Build column order: use Redux order if available, but ensure all visible columns are included
  const columnOrder = useMemo(() => {
    if (resourceKey) {
      if (reduxColumnOrder.length > 0) {
        // Use Redux order, but append any columns that are visible but missing from order
        const validOrder = reduxColumnOrder.filter((id) =>
          columns.some((col) => col.id === id)
        );
        const missingColumns = columns
          .filter((col) => !validOrder.includes(col.id))
          .map((col) => col.id);
        return [...validOrder, ...missingColumns];
      }
      // If no Redux order, use all column IDs
      return columns.map((col) => col.id);
    }
    return localColumnOrder;
  }, [resourceKey, reduxColumnOrder, columns, localColumnOrder]);

  const derivedColumnOrder = enableRowSelection
    ? [SELECTION_COLUMN_ID, ...columnOrder.filter((id) => id !== SELECTION_COLUMN_ID)]
    : columnOrder;

  // Initialize column visibility for backward compatibility (when resourceKey is not provided)
  React.useEffect(() => {
    if (resourceKey) {
      // Redux manages this, no local state needed
      return;
    }

    // Legacy local state management (backward compatibility)
    const initialVisibility: VisibilityState = {};
    columns.forEach((col) => {
      if (initialColumnVisibility && col.id in initialColumnVisibility) {
        initialVisibility[col.id] = initialColumnVisibility[col.id];
      } else {
        initialVisibility[col.id] = col.enableHiding !== false;
      }
    });

    // Only initialize if columnVisibility is empty (first render)
    if (Object.keys(columnVisibility).length === 0) {
      // This will be handled by the local state setter below if needed
    }
  }, [columns, initialColumnVisibility, resourceKey, columnVisibility]);

  // Local state for column visibility (backward compatibility only)
  const [localColumnVisibility, setLocalColumnVisibility] = useState<VisibilityState>(() => {
    if (resourceKey) return {}; // Redux manages this

    const initialVisibility: VisibilityState = {};
    columns.forEach((col) => {
      if (initialColumnVisibility && col.id in initialColumnVisibility) {
        initialVisibility[col.id] = initialColumnVisibility[col.id];
      } else {
        initialVisibility[col.id] = col.enableHiding !== false;
      }
    });
    return initialVisibility;
  });

  // Use Redux state if resourceKey is provided, otherwise use local state
  const effectiveColumnVisibility = resourceKey ? columnVisibility : localColumnVisibility;
  const derivedColumnVisibility = enableRowSelection
    ? { ...effectiveColumnVisibility, [SELECTION_COLUMN_ID]: true }
    : effectiveColumnVisibility;

  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Convert our column format to TanStack Table format
  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    // Filter and order columns based on visibility and order state
    const orderedColumns = derivedColumnOrder
      .map((id) => columns.find((col) => col.id === id))
      .filter((col): col is DataTableColumn<T> => col !== undefined && effectiveColumnVisibility[col.id] !== false);

    // Calculate weighted widths based on header text length (Smart Density)
    const getHeaderTextLength = (col: DataTableColumn<T>): number => {
      if (typeof col.header === 'string') {
        return col.header.length;
      }
      // Estimate for function headers - use column id as fallback
      return col.id.length;
    };

    // Calculate base width and weights for Smart Density
    const baseWidth = 100; // Minimum readable width
    const charWidth = 10; // Pixels per character for Hebrew text (more generous)
    const iconSpace = 40; // Space reserved for icons

    const selectionColumn: ColumnDef<T> | null = enableRowSelection
      ? {
        id: SELECTION_COLUMN_ID,
        header: () => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={selectAllAcrossPages ? true : allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
              onCheckedChange={(value) => handleToggleAllPage(value === true)}
              aria-label="בחר הכל בעמוד"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        ),
        cell: ({ row }: any) => {
          const rowId = getRowIdValue(row.original);
          const checked = selectAllAcrossPages ? true : selectedRowIds.has(rowId);
          return (
            <div className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => handleToggleRow(rowId, value === true)}
                aria-label="בחר שורה"
                disabled={!rowId}
              />
            </div>
          );
        },
        enableSorting: false,
        enableResizing: false,
        enableHiding: false,
        size: 48,
        meta: {
          align: 'center',
          isSelection: true,
        },
      }
      : null;

    const dataColumns = orderedColumns.map((col) => {
      // Use provided size or calculate based on weighted width
      let defaultSize = col.size;

      if (!defaultSize) {
        // Special cases for compact columns
        if (col.id === 'actions') {
          defaultSize = 80; // Very compact for actions
        } else if (col.meta?.isNumeric) {
          defaultSize = 90; // Compact for numbers
        } else {
          // Weighted width: ensure header text fits comfortably
          const headerLength = getHeaderTextLength(col);
          // Calculate natural width needed: text width + icon space + padding
          const textWidth = headerLength * charWidth;
          const naturalWidth = textWidth + iconSpace + 16; // 16px for padding

          // Use natural width, but ensure minimum readability
          defaultSize = Math.max(baseWidth, Math.min(naturalWidth, 280));
        }
      }

      return {
        id: col.id,
        header: col.header,
        accessorKey: col.accessorKey as string,
        accessorFn: col.accessorFn,
        cell: col.cell
          ? ({ getValue, row }: any) => col.cell!({ getValue, row })
          : ({ getValue }: any) => getValue(),
        enableSorting: col.enableSorting !== false,
        enableResizing: col.enableResizing !== false,
        enableHiding: col.enableHiding !== false,
        minSize: col.minSize || 60, // Reduced minimum to allow smaller columns
        maxSize: col.maxSize || Infinity,
        size: defaultSize,
        meta: col.meta,
      };
    });

    return selectionColumn ? [selectionColumn, ...dataColumns] : dataColumns;
  }, [
    columns,
    derivedColumnOrder,
    effectiveColumnVisibility,
    enableRowSelection,
    allPageSelected,
    somePageSelected,
    selectAllAcrossPages,
    selectedRowIds,
    getRowIdValue,
    handleToggleAllPage,
    handleToggleRow,
  ]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnSizing: derivedColumnSizing,
      columnVisibility: derivedColumnVisibility,
      columnOrder: derivedColumnOrder,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: (updater: any) => {
      const newSizing = typeof updater === 'function' ? updater(derivedColumnSizing) : updater;
      const sanitizedSizing = enableRowSelection
        ? Object.fromEntries(Object.entries(newSizing).filter(([key]) => key !== SELECTION_COLUMN_ID))
        : newSizing;
      if (resourceKey) {
        dispatch(setAllColumnSizingAction({ resourceKey, sizing: sanitizedSizing }));
      } else {
        setLocalColumnSizing(sanitizedSizing);
      }
    },
    onColumnVisibilityChange: (updater: any) => {
      const newVisibility = typeof updater === 'function' ? updater(derivedColumnVisibility) : updater;
      if (resourceKey) {
        // Update Redux state column by column
        Object.keys(newVisibility).forEach((colId) => {
          if (enableRowSelection && colId === SELECTION_COLUMN_ID) return;
          dispatch(setColumnVisibilityAction({ resourceKey, columnId: colId, visible: newVisibility[colId] }));
        });
      } else {
        const sanitizedVisibility = enableRowSelection
          ? Object.fromEntries(Object.entries(newVisibility).filter(([key]) => key !== SELECTION_COLUMN_ID))
          : newVisibility;
        setLocalColumnVisibility(sanitizedVisibility);
      }
    },
    onColumnOrderChange: (updater: any) => {
      const newOrder = typeof updater === 'function' ? updater(derivedColumnOrder) : updater;
      const sanitizedOrder = enableRowSelection
        ? newOrder.filter((id: string) => id !== SELECTION_COLUMN_ID)
        : newOrder;
      if (resourceKey) {
        dispatch(setColumnOrderAction({ resourceKey, order: sanitizedOrder }));
      } else {
        setLocalColumnOrder(sanitizedOrder);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: 'onChange' as ColumnResizeMode,
    defaultColumn: {
      minSize: 60, // Reduced minimum to allow smaller columns
      maxSize: Infinity,
      size: 200,
    },
  });

  const getSortIcon = (columnId: string) => {
    const column = table.getColumn(columnId);
    if (!column || !column.getCanSort()) return null;

    // For server-side sorting, check external sortBy/sortOrder props
    // For client-side sorting, use table's sorting state
    let sortDirection: false | 'asc' | 'desc' = false;

    if (serverSideSorting && externalSortBy === columnId) {
      // Server-side sorting: use props
      sortDirection = externalSortOrder === 'ASC' ? 'asc' : 'desc';
    } else {
      // Client-side sorting: use table's sorting state
      sortDirection = column.getIsSorted();
    }

    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 text-blue-600" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 text-blue-600" />;
    }
    return <ArrowUp className="h-4 w-4 text-slate-400 opacity-50" />;
  };

  const handleHeaderClick = (columnId: string) => {
    const column = table.getColumn(columnId);
    if (!column || !column.getCanSort()) return;

    // If server-side sorting is enabled, use onSortChange callback
    if (serverSideSorting && onSortChange) {
      // Determine new sort order based on current sortBy/sortOrder props
      let newSortOrder: 'ASC' | 'DESC' = 'DESC';

      if (externalSortBy === columnId) {
        // Currently sorting by this column - toggle order
        newSortOrder = externalSortOrder === 'DESC' ? 'ASC' : 'DESC';
      } else {
        // Not sorting by this column yet - default to DESC
        newSortOrder = 'DESC';
      }

      // Call server-side sort handler
      onSortChange(columnId, newSortOrder);
    } else {
      // Client-side sorting (existing behavior)
      column.toggleSorting(undefined, true);
    }
  };

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = table.getColumn(columnId)?.getSize() || 150;
      setIsResizing(columnId);

      const handleMouseMove = (e: MouseEvent) => {
        const delta = dir === 'rtl' ? startX - e.clientX : e.clientX - startX;
        // Allow much smaller columns - minimum 60px to ensure icons are visible
        const newWidth = Math.max(60, Math.min(Infinity, startWidth + delta));
        if (resourceKey) {
          dispatch(setColumnSizingAction({ resourceKey, columnId, size: newWidth }));
        } else {
          setLocalColumnSizing((prev) => ({
            ...prev,
            [columnId]: newWidth,
          }));
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setIsResizing(null);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [table, dir]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);

      if (resourceKey) {
        dispatch(setColumnOrderAction({ resourceKey, order: newOrder }));
      } else {
        setLocalColumnOrder(newOrder);
      }
    }
  };

  const toggleColumnVisibility = (columnId: string) => {
    if (resourceKey) {
      dispatch(toggleColumnVisibilityAction({ resourceKey, columnId }));
    } else {
      setLocalColumnVisibility((prev) => ({
        ...prev,
        [columnId]: !prev[columnId],
      }));
    }
  };

  const handleHideColumn = (columnId: string) => {
    if (resourceKey) {
      dispatch(setColumnVisibilityAction({ resourceKey, columnId, visible: false }));
    } else {
      setLocalColumnVisibility((prev) => ({
        ...prev,
        [columnId]: false,
      }));
    }
  };

  // Handle group collapse toggle
  const handleToggleGroup = (groupKey: string) => {
    if (resourceKey) {
      dispatch(toggleGroupCollapse({ resourceKey, groupKey }));
    }
  };

  // Helper function to resolve column ID to accessorKey
  const resolveColumnToField = useCallback((columnId: string | null): string | null => {
    if (!columnId) return null;
    const column = columns.find((col) => col.id === columnId);
    if (!column) return columnId; // Fallback to columnId if column not found

    // Use accessorKey if available, otherwise use accessorFn result or fallback to columnId
    if (column.accessorKey) {
      return column.accessorKey as string;
    }
    // If no accessorKey, try to get value using accessorFn or use columnId
    return columnId;
  }, [columns]);

  // Get grouped data - support both legacy single-level and new multi-level grouping
  const groupedData = useMemo(() => {
    // Check if multi-level grouping is active
    const hasMultiLevelGrouping = groupByKeys[0] || groupByKeys[1];

    if (!hasMultiLevelGrouping && !groupByKey) {
      return null;
    }

    if (!table || !data || data.length === 0) {
      return null;
    }

    // Use the table's row model to get processed (sorted/filtered) data
    const processedData = table.getRowModel().rows.map((row: any) => row.original);
    if (processedData.length === 0) {
      return null;
    }

    // Use multi-level grouping if active
    if (hasMultiLevelGrouping) {
      // Resolve column IDs to actual field names for grouping
      const resolvedKeys: [string | null, string | null] = [
        resolveColumnToField(groupByKeys[0]),
        resolveColumnToField(groupByKeys[1]),
      ];
      return groupDataByKeys(processedData, resolvedKeys, groupSorting);
    }

    // Fallback to legacy single-level grouping
    if (groupByKey) {
      const resolvedKey = resolveColumnToField(groupByKey);
      if (resolvedKey) {
        return groupDataByKey(processedData, resolvedKey);
      }
    }

    return null;
  }, [data, groupByKey, groupByKeys, groupSorting, table, resolveColumnToField]);

  // Store resolved field names for row filtering (keep column IDs for display)
  const resolvedGroupByKeys = useMemo(() => [
    resolveColumnToField(groupByKeys[0]),
    resolveColumnToField(groupByKeys[1]),
  ] as [string | null, string | null], [groupByKeys, resolveColumnToField]);

  const resolvedGroupByKey = useMemo(() =>
    groupByKey ? resolveColumnToField(groupByKey) : null,
    [groupByKey, resolveColumnToField]
  );

  // Paginate groups when grouping is active
  const paginatedGroupedData = useMemo(() => {
    if (!groupedData || !groupCurrentPage) {
      return groupedData;
    }

    const startIndex = (groupCurrentPage - 1) * groupPageSize;
    const endIndex = startIndex + groupPageSize;

    if (Array.isArray(groupedData)) {
      return groupedData.slice(startIndex, endIndex);
    }

    return groupedData;
  }, [groupedData, groupCurrentPage, groupPageSize]);

  // Get column header text for group by column
  const getGroupColumnHeader = (columnId: string | null) => {
    if (!columnId) return '';
    const column = columns.find((col) => col.id === columnId);
    if (!column) return columnId;
    return typeof column.header === 'string' ? column.header : columnId;
  };

  // Helper to check if groupedData is multi-level
  const isMultiLevelGrouping = (data: any): data is MultiLevelGroupedData<T>[] => {
    return Array.isArray(data) && data.length > 0 && 'level1Key' in data[0];
  };

  const getCellContent = (cell: any, column: any) => {
    const content = flexRender(cell.column.columnDef.cell, cell.getContext());
    const meta = column?.columnDef.meta;
    const shouldTruncate = meta?.truncate !== false; // Default to truncating unless explicitly disabled

    // Extract text content for tooltip
    const getTextContent = (node: any): string => {
      if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
      }
      if (React.isValidElement(node)) {
        const props = node.props as any;
        if (props?.children) {
          return getTextContent(props.children);
        }
        if (props?.title) {
          return props.title;
        }
      }
      return '';
    };

    const contentString = getTextContent(content);

    if (!shouldTruncate || !contentString) {
      return <div className="w-full">{content}</div>;
    }

    // For truncation, wrap in tooltip
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="truncate w-full cursor-help">
              {content}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs" dir={dir}>
            <p className="break-words">{contentString}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-600 mb-2">{emptyMessage}</p>
        <p className="text-sm text-gray-500">נסה לשנות את פרמטרי החיפוש</p>
      </div>
    );
  }

  return (
    <div className={cn('w-full h-full flex flex-col', className)} dir={dir}>
      {enableRowSelection && (selectedRowIds.size > 0 || selectAllAcrossPages) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-indigo-100 bg-indigo-50/40 px-4 py-3 ">
          <div className="text-sm text-slate-700">
            {selectAllAcrossPages ? (
              <span>
                נבחרו כל {totalItems} {selectionLabel}
              </span>
            ) : (
              <span>
                נבחרו {selectedCount} מתוך {totalItems} {selectionLabel}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showSelectAllAcrossPages && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectAllAcrossPages(true)}
              >
                בחר את כל {totalItems} {selectionLabel}
              </Button>
            )}
            {onBulkDelete && (
              <Button
                type="button"
                size="sm"
                className="bg-red-600 hover:bg-red-600/90 text-white"
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                מחיקה
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={handleClearSelection}>
              נקה בחירה
            </Button>
          </div>
        </div>
      )}
      {/* Table with Horizontal and Vertical Scroll */}
      <div
        ref={tableRef}
        className="w-full overflow-auto flex-1 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
        }}
      >
        <style>{`
          div::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          div::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        {enableColumnReordering ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <TableContent
              table={table}
              tableColumns={tableColumns}
              dir={dir}
              enableColumnReordering={enableColumnReordering}
              onRowClick={onRowClick}
              handleHeaderClick={handleHeaderClick}
              getSortIcon={getSortIcon}
              handleResizeStart={handleResizeStart}
              getCellContent={getCellContent}
              onHideColumn={handleHideColumn}
              isResizing={isResizing}
              columnSizing={derivedColumnSizing}
              groupedData={paginatedGroupedData || groupedData}
              groupByKey={resolvedGroupByKey}
              groupByKeys={resolvedGroupByKeys}
              originalGroupByKey={groupByKey || null}
              originalGroupByKeys={groupByKeys}
              columns={columns}
              collapsedGroupsSet={collapsedGroupsSet}
              onToggleGroup={handleToggleGroup}
              getGroupColumnHeader={getGroupColumnHeader}
              enableRowSelection={enableRowSelection}
              getRowIdValue={getRowIdValue}
              handleToggleRow={handleToggleRow}
              selectedRowIds={selectedRowIds}
              selectAllAcrossPages={selectAllAcrossPages}
            />
          </DndContext>
        ) : (
          <TableContent
            table={table}
            tableColumns={tableColumns}
            dir={dir}
            enableColumnReordering={enableColumnReordering}
            onRowClick={onRowClick}
            handleHeaderClick={handleHeaderClick}
            getSortIcon={getSortIcon}
            handleResizeStart={handleResizeStart}
            getCellContent={getCellContent}
            onHideColumn={handleHideColumn}
            isResizing={isResizing}
            columnSizing={derivedColumnSizing}
            groupedData={paginatedGroupedData || groupedData}
            groupByKey={resolvedGroupByKey}
            groupByKeys={resolvedGroupByKeys}
            originalGroupByKey={groupByKey || null}
            originalGroupByKeys={groupByKeys}
            columns={columns}
            collapsedGroupsSet={collapsedGroupsSet}
            onToggleGroup={handleToggleGroup}
            getGroupColumnHeader={getGroupColumnHeader}
            enableRowSelection={enableRowSelection}
            getRowIdValue={getRowIdValue}
            handleToggleRow={handleToggleRow}
            selectedRowIds={selectedRowIds}
            selectAllAcrossPages={selectAllAcrossPages}
          />
        )}
      </div>
      {onBulkDelete && (
        <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>מחיקת {selectionLabel}</AlertDialogTitle>
              <AlertDialogDescription>
                {selectAllAcrossPages
                  ? `את/ה עומד/ת למחוק ${totalItems} ${selectionLabel}.`
                  : `את/ה עומד/ת למחוק ${selectedCount} ${selectionLabel}.`}{' '}
                פעולה זו אינה ניתנת לשחזור.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={handleConfirmBulkDelete}
                className="bg-red-600 hover:bg-red-600/90 text-white"
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? 'מוחק...' : 'אישור מחיקה'}
              </AlertDialogAction>
              <AlertDialogCancel disabled={isBulkDeleting}>ביטול</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// Extracted table content component to avoid duplication
function TableContent<T>({
  table,
  tableColumns,
  dir,
  enableColumnReordering,
  onRowClick,
  handleHeaderClick,
  getSortIcon,
  handleResizeStart,
  getCellContent,
  onHideColumn,
  isResizing,
  columnSizing,
  groupedData,
  groupByKey,
  groupByKeys,
  originalGroupByKey,
  originalGroupByKeys,
  columns,
  collapsedGroupsSet,
  onToggleGroup,
  getGroupColumnHeader,
  enableRowSelection,
  getRowIdValue,
  handleToggleRow,
  selectedRowIds,
  selectAllAcrossPages,
}: {
  table: any;
  tableColumns: any[];
  dir: 'ltr' | 'rtl';
  enableColumnReordering: boolean;
  onRowClick?: (row: T) => void;
  handleHeaderClick: (columnId: string) => void;
  getSortIcon: (columnId: string) => React.ReactNode;
  handleResizeStart: (e: React.MouseEvent, columnId: string) => void;
  getCellContent: (cell: any, column: any) => React.ReactNode;
  onHideColumn: (columnId: string) => void;
  isResizing: string | null;
  columnSizing: Record<string, number>;
  groupedData: GroupedData<T>[] | MultiLevelGroupedData<T>[] | null;
  groupByKey: string | null;
  groupByKeys: [string | null, string | null];
  originalGroupByKey: string | null;
  originalGroupByKeys: [string | null, string | null];
  columns: DataTableColumn<T>[];
  collapsedGroupsSet: Set<string>;
  onToggleGroup: (groupKey: string) => void;
  getGroupColumnHeader: (columnId?: string | null) => string;
  enableRowSelection?: boolean;
  getRowIdValue?: (row: T) => string;
  handleToggleRow?: (rowId: string, checked: boolean) => void;
  selectedRowIds?: Set<string>;
  selectAllAcrossPages?: boolean;
}) {
  // Helper to check if groupedData is multi-level
  const isMultiLevelGrouping = (data: any): data is MultiLevelGroupedData<T>[] => {
    return Array.isArray(data) && data.length > 0 && 'level1Key' in data[0];
  };

  // Get column header text for group by column
  // Get column header text using original column IDs for display
  const getGroupColumnHeaderText = (columnId: string | null, isLevel2: boolean = false) => {
    if (!columnId) return '';
    // Use original column ID for display (not the resolved field name)
    const originalColumnId = isLevel2
      ? (originalGroupByKeys?.[1] || columnId)
      : (originalGroupByKeys?.[0] || originalGroupByKey || columnId);

    const column = columns.find((col) => col.id === originalColumnId);
    if (!column) {
      // Fallback: try to find by accessorKey
      const columnByAccessor = columns.find((col) => col.accessorKey === columnId);
      if (columnByAccessor) {
        return typeof columnByAccessor.header === 'string' ? columnByAccessor.header : columnId;
      }
      return columnId;
    }
    return typeof column.header === 'string' ? column.header : columnId;
  };

  // Helper function to check if a column is a date column
  const isDateColumn = (columnId: string | null, isLevel2: boolean = false): boolean => {
    if (!columnId) return false;
    // Use original column ID for checking (not the resolved field name)
    const originalColumnId = isLevel2
      ? (originalGroupByKeys?.[1] || columnId)
      : (originalGroupByKeys?.[0] || originalGroupByKey || columnId);

    const column = columns.find((col) => col.id === originalColumnId || col.accessorKey === columnId);
    if (!column) {
      // Check by column ID pattern
      const checkId = originalColumnId || columnId;
      return checkId.toLowerCase().includes('date') ||
        checkId.toLowerCase().includes('created') ||
        checkId.toLowerCase().includes('updated') ||
        checkId.toLowerCase().includes('time');
    }
    // Check column ID and accessorKey
    const colId = column.id.toLowerCase();
    const accessorKey = (column.accessorKey as string)?.toLowerCase() || '';
    return colId.includes('date') || colId.includes('created') || colId.includes('updated') || colId.includes('time') ||
      accessorKey.includes('date') || accessorKey.includes('created') || accessorKey.includes('updated') || accessorKey.includes('time');
  };

  // Helper function to format date values in group headers
  const formatGroupValue = (value: any, columnId: string | null, isLevel2: boolean = false): string => {
    if (value === null || value === undefined || value === 'ללא ערך') {
      return 'ללא ערך';
    }

    // Check if this is a date column (use original column ID for detection)
    if (!isDateColumn(columnId, isLevel2)) {
      return String(value);
    }

    // Try to parse and format the date
    try {
      const dateValue = typeof value === 'string' ? new Date(value) : value;
      if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        // Format: "HH:mm | dd/MM/yyyy" (matching payment column format in rows)
        return format(dateValue, 'HH:mm | dd/MM/yyyy', { locale: he });
      }
    } catch (error) {
      // If parsing fails, return the original value
    }

    return String(value);
  };
  // Calculate total width using pixel-based sizing
  const totalWidth = tableColumns.reduce((sum, col) => {
    const size = columnSizing[col.id] || col.size || 150;
    return sum + size;
  }, 0);

  return (
    <table className="border-collapse" style={{ tableLayout: 'auto', width: '100%', minWidth: `${totalWidth}px` }}>
      <thead className="sticky top-0 z-10 bg-gray-50">
        {table.getHeaderGroups().map((headerGroup: any) => {
          const headers = headerGroup.headers;

          const headerContent = headers.map((header: any) => {
            const width = columnSizing[header.id] || header.getSize() || 150;

            const column = table.getColumn(header.id);
            const meta = column?.columnDef.meta;

            if (enableColumnReordering && !meta?.isSelection) {
              return (
                <SortableHeader
                  key={header.id}
                  header={header}
                  table={table}
                  dir={dir}
                  onHeaderClick={handleHeaderClick}
                  getSortIcon={getSortIcon}
                  onResizeStart={handleResizeStart}
                  width={width}
                  isResizing={isResizing === header.id}
                  onHideColumn={onHideColumn}
                />
              );
            }

            // Regular header (non-sortable) with improved styling
            const canSort = column?.getCanSort();
            const canResize = column?.columnDef.enableResizing !== false;
            const canHide = column?.columnDef.enableHiding !== false;
            const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
            const [isHovered, setIsHovered] = useState(false);

            if (meta?.isSelection) {
              return (
                <th
                  key={header.id}
                  className="relative h-16 px-1"
                  style={{
                    width: `${width}px`,
                    minWidth: `${width}px`,
                    maxWidth: `${width}px`,
                  }}
                >
                  <div className="flex items-center justify-center h-full">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                </th>
              );
            }

            const headerText = getHeaderText(header);
            // Let CSS handle truncation naturally - only use JS truncation for very long text (>50 chars)
            // This allows text to use maximum available space
            const isVeryLong = headerText.length > 50;
            const { display: displayText, isTruncated } = isVeryLong
              ? smartTruncate(headerText, 50)
              : { display: headerText, isTruncated: false };

            const handleHideClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              onHideColumn(header.id);
            };

            return (
              <th
                key={header.id}
                className={cn(
                  'relative h-16 px-1 font-bold text-sm text-slate-800 group',
                  `text-${align}`,
                  canSort && 'cursor-pointer select-none hover:bg-gray-100/60',
                  'transition-colors duration-150'
                )}
                style={{
                  width: `${width}px`,
                  minWidth: `${width}px`,
                  maxWidth: `${width}px`,
                }}
                onClick={() => canSort && handleHeaderClick(header.id)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div
                  className="flex items-center h-full relative"
                  style={{
                    flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
                    justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start',
                    alignItems: 'center',
                    gap: '2px', // Minimal gap - icons close to text
                    overflow: 'hidden',
                    width: '100%',
                  }}
                >
                  {/* Header Text - Smart shrinking: allow flex to shrink, CSS handles truncation */}
                  <span
                    className="truncate"
                    style={{
                      flex: '1 1 0%', // Take available space, can shrink
                      minWidth: 0, // Critical: allow flex to shrink below content size
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      paddingRight: dir === 'rtl' ? '0' : '2px',
                      paddingLeft: dir === 'rtl' ? '2px' : '0',
                    }}
                    title={headerText}
                  >
                    {headerText}
                  </span>

                  {/* Icons - Gliding layout, can overlay text edge if narrow */}
                  <div
                    className="flex items-center flex-shrink-0"
                    style={{
                      gap: '2px',
                      position: 'relative',
                      zIndex: 1, // Allow icons to overlay text if needed
                    }}
                  >
                    {/* Sort Icon - appears immediately after text */}
                    {canSort && (
                      <span
                        className="flex-shrink-0 text-slate-600"
                        style={{
                          width: '14px',
                          height: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHeaderClick(header.id);
                        }}
                      >
                        {getSortIcon(header.id)}
                      </span>
                    )}

                    {/* Hide Column Button - Shows on Hover, can overlay if narrow */}
                    {canHide && isHovered && (
                      <button
                        onClick={handleHideClick}
                        className="flex-shrink-0 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                        title="הסתר עמודה"
                        aria-label="הסתר עמודה"
                        style={{
                          width: '16px',
                          height: '16px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <EyeOff className="h-3 w-3 text-slate-600 hover:text-slate-800" />
                      </button>
                    )}
                  </div>

                  {/* Resize Handle */}
                  {canResize && (
                    <div
                      className={cn(
                        'absolute top-0 bottom-0 w-1 cursor-col-resize transition-all z-10',
                        dir === 'rtl' ? 'left-0' : 'right-0',
                        isResizing === header.id
                          ? 'bg-blue-500 w-0.5'
                          : 'bg-transparent hover:bg-blue-400/60'
                      )}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResizeStart(e, header.id);
                      }}
                      style={{
                        touchAction: 'none',
                      }}
                      title="גרור לשינוי רוחב"
                    >
                      <GripVertical
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 h-4 w-4 transition-opacity",
                          isResizing === header.id
                            ? "text-blue-500 opacity-100"
                            : "text-gray-400 opacity-0 group-hover:opacity-100"
                        )}
                        style={{ [dir === 'rtl' ? 'left' : 'right']: '-1.5px' }}
                      />
                    </div>
                  )}
                </div>
              </th>
            );
          });

          return (
            <tr
              key={headerGroup.id}
              className="bg-gray-50 border-b border-gray-100"
            >
              {enableColumnReordering ? (
                <SortableContext
                  items={headers.map((h: any) => h.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {headerContent}
                </SortableContext>
              ) : (
                headerContent
              )}
            </tr>
          );
        })}
      </thead>
      <tbody>
        {groupedData && groupedData.length > 0 ? (
          // Render grouped data (supports both single-level and multi-level)
          isMultiLevelGrouping(groupedData) ? (
            // Multi-level grouping rendering
            groupedData.map((level1Group) => {
              const level1Key = `level1:${level1Group.level1Key}`;
              const isLevel1Collapsed = collapsedGroupsSet.has(level1Key);
              const level1Header = getGroupColumnHeaderText(groupByKeys[0], false);

              // Get all rows for this level 1 group
              const allLevel1Rows: any[] = [];
              if (level1Group.level2Groups && level1Group.level2Groups.length > 0) {
                // Has level 2 groups
                level1Group.level2Groups.forEach((level2Group) => {
                  const level2Key = `${level1Key}|level2:${level2Group.groupKey}`;
                  const isLevel2Collapsed = collapsedGroupsSet.has(level2Key);
                  const level2Header = getGroupColumnHeaderText(groupByKeys[1], true);

                  // Match rows for this level 2 group
                  const level2Rows = table.getRowModel().rows.filter((row: any) => {
                    const rowOriginal = row.original;
                    const rowLevel1Value = rowOriginal[groupByKeys[0]!];
                    const rowLevel2Value = rowOriginal[groupByKeys[1]!];
                    const normalizedLevel1 = rowLevel1Value === null || rowLevel1Value === undefined ? 'ללא ערך' : String(rowLevel1Value);
                    const normalizedLevel2 = rowLevel2Value === null || rowLevel2Value === undefined ? 'ללא ערך' : String(rowLevel2Value);
                    return normalizedLevel1 === level1Group.level1Key && normalizedLevel2 === level2Group.groupKey;
                  });

                  allLevel1Rows.push({
                    type: 'level2-header',
                    key: level2Key,
                    group: level2Group,
                    rows: level2Rows,
                    isCollapsed: isLevel2Collapsed,
                    header: level2Header,
                  });

                  if (!isLevel2Collapsed) {
                    allLevel1Rows.push({
                      type: 'level2-rows',
                      key: `${level2Key}-rows`,
                      rows: level2Rows,
                    });
                  }
                });
              } else {
                // No level 2 groups, just level 1 items
                const level1Rows = table.getRowModel().rows.filter((row: any) => {
                  const rowOriginal = row.original;
                  const rowLevel1Value = rowOriginal[groupByKeys[0]!];
                  const normalizedLevel1 = rowLevel1Value === null || rowLevel1Value === undefined ? 'ללא ערך' : String(rowLevel1Value);
                  return normalizedLevel1 === level1Group.level1Key;
                });
                allLevel1Rows.push({
                  type: 'level1-rows',
                  key: `${level1Key}-rows`,
                  rows: level1Rows,
                });
              }

              const totalItems = level1Group.level2Groups
                ? level1Group.level2Groups.reduce((sum, g) => sum + g.items.length, 0)
                : level1Group.items.length;

              return (
                <React.Fragment key={level1Key}>
                  {/* Level 1 Group Header */}
                  <tr
                    className={cn(
                      "bg-slate-50 border-t border-b border-slate-200",
                      "hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
                    )}
                    onClick={() => onToggleGroup(level1Key)}
                  >
                    <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-3">
                      <div
                        className="flex items-center gap-3"
                        style={{
                          flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
                          justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div className="flex-shrink-0 transition-transform duration-200">
                          {isLevel1Collapsed ? (
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-600" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          {level1Header}: {formatGroupValue(level1Group.level1Key, groupByKeys[0], false)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200">
                          {totalItems} {totalItems === 1 ? 'ליד' : 'לידים'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* Level 1 Content */}
                  {!isLevel1Collapsed && allLevel1Rows.map((item) => {
                    if (item.type === 'level2-header') {
                      return (
                        <tr
                          key={item.key}
                          className={cn(
                            "bg-slate-100/50 border-b border-slate-200",
                            "hover:bg-slate-150 transition-colors duration-200 cursor-pointer"
                          )}
                          onClick={() => onToggleGroup(item.key)}
                          style={{
                            paddingRight: dir === 'rtl' ? '24px' : '0',
                            paddingLeft: dir === 'ltr' ? '24px' : '0',
                          }}
                        >
                          <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-2.5">
                            <div
                              className="flex items-center gap-3"
                              style={{
                                flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
                                justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start',
                                marginRight: dir === 'rtl' ? '24px' : '0',
                                marginLeft: dir === 'ltr' ? '24px' : '0',
                              }}
                            >
                              <div className="flex-shrink-0 transition-transform duration-200">
                                {item.isCollapsed ? (
                                  <ChevronRight className="h-4 w-4 text-slate-500" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-500" />
                                )}
                              </div>
                              <span className="text-sm font-semibold text-slate-700">
                                {item.header}: {formatGroupValue(item.group.groupKey, groupByKeys[1], true)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200">
                                {item.group.items.length} {item.group.items.length === 1 ? 'ליד' : 'לידים'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    } else if (item.type === 'level2-rows' || item.type === 'level1-rows') {
                      return (
                        <React.Fragment key={item.key}>
                          {item.rows.map((row: any, rowIndex: number) => (
                            <tr
                              key={row.id || `${item.key}-${rowIndex}`}
                              className={cn(
                                'border-b border-gray-100 transition-all duration-200',
                                'bg-white',
                                onRowClick && 'cursor-pointer hover:bg-gray-50',
                                'group',
                                'hover:shadow-sm'
                              )}
                              onClick={() => onRowClick?.(row.original)}
                              style={{
                                borderRight: dir === 'rtl' ? '2px solid #e2e8f0' : 'none',
                                borderLeft: dir === 'ltr' ? '2px solid #e2e8f0' : 'none',
                                paddingRight: dir === 'rtl' ? (item.type === 'level2-rows' ? '48px' : '24px') : '0',
                                paddingLeft: dir === 'ltr' ? (item.type === 'level2-rows' ? '48px' : '24px') : '0',
                              }}
                            >
                              {row.getVisibleCells().map((cell: any) => {
                                const column = table.getColumn(cell.column.id);
                                const meta = column?.columnDef.meta;
                                const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
                                const isNumeric = meta?.isNumeric;
                                const width = columnSizing[cell.column.id] || cell.column.getSize() || 150;
                                const isSelectionColumn = cell.column.id === SELECTION_COLUMN_ID;

                                return (
                                  <td
                                    key={cell.id}
                                    className={cn(
                                      'px-2 py-4 text-sm transition-colors overflow-hidden',
                                      `text-${align}`,
                                      isNumeric
                                        ? 'font-mono tabular-nums text-gray-900'
                                        : 'text-gray-900',
                                      (cell.column.id.includes('date') || cell.column.id.includes('created')) && !isNumeric
                                        ? 'text-gray-600'
                                        : '',
                                      (cell.column.id === 'phone' || isNumeric)
                                        ? 'whitespace-nowrap'
                                        : '',
                                      isSelectionColumn && 'cursor-pointer'
                                    )}
                                    style={{
                                      width: `${width}px`,
                                      minWidth: `${width}px`,
                                      maxWidth: `${width}px`,
                                    }}
                                    title={typeof cell.getValue() === 'string' ? cell.getValue() : undefined}
                                    onClick={isSelectionColumn && enableRowSelection && getRowIdValue && handleToggleRow && selectedRowIds && selectAllAcrossPages !== undefined ? (e) => {
                                      e.stopPropagation();
                                      const rowId = getRowIdValue(row.original);
                                      if (rowId) {
                                        const checked = selectAllAcrossPages ? true : selectedRowIds.has(rowId);
                                        handleToggleRow(rowId, !checked);
                                      }
                                    } : undefined}
                                  >
                                    {getCellContent(cell, column)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    }
                    return null;
                  })}
                </React.Fragment>
              );
            })
          ) : (
            // Legacy single-level grouping rendering
            (groupedData as GroupedData<T>[]).map((group) => {
              const isCollapsed = collapsedGroupsSet.has(group.groupKey);
              const groupRows = table.getRowModel().rows.filter((row: any) => {
                const rowOriginal = row.original;
                const rowGroupValue = rowOriginal[groupByKey!];
                const normalizedRowValue = rowGroupValue === null || rowGroupValue === undefined ? 'ללא ערך' : String(rowGroupValue);
                return normalizedRowValue === group.groupKey;
              });

              if (group.items.length === 0) {
                return null;
              }

              return (
                <React.Fragment key={group.groupKey}>
                  <tr
                    className={cn(
                      "bg-slate-50 border-t border-b border-slate-200",
                      "hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
                    )}
                    onClick={() => onToggleGroup(group.groupKey)}
                  >
                    <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-3">
                      <div
                        className="flex items-center gap-3"
                        style={{
                          flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
                          justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div className="flex-shrink-0 transition-transform duration-200">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4 text-slate-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-600" />
                          )}
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          {getGroupColumnHeader(originalGroupByKey || groupByKey)}: {formatGroupValue(group.groupKey, groupByKey, false)}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200">
                          {group.items.length} {group.items.length === 1 ? 'ליד' : 'לידים'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {!isCollapsed && groupRows.length > 0 && (
                    <>
                      {groupRows.map((row: any, rowIndex: number) => (
                        <tr
                          key={row.id || `group-row-${group.groupKey}-${rowIndex}`}
                          className={cn(
                            'border-b border-gray-100 transition-all duration-200',
                            'bg-white',
                            onRowClick && 'cursor-pointer hover:bg-gray-50',
                            'group',
                            'hover:shadow-sm'
                          )}
                          onClick={() => onRowClick?.(row.original)}
                          style={{
                            borderRight: dir === 'rtl' ? '2px solid #e2e8f0' : 'none',
                            borderLeft: dir === 'ltr' ? '2px solid #e2e8f0' : 'none',
                          }}
                        >
                          {row.getVisibleCells().map((cell: any) => {
                            const column = table.getColumn(cell.column.id);
                            const meta = column?.columnDef.meta;
                            const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
                            const isNumeric = meta?.isNumeric;
                            const width = columnSizing[cell.column.id] || cell.column.getSize() || 150;
                            const isSelectionColumn = cell.column.id === SELECTION_COLUMN_ID;

                            return (
                              <td
                                key={cell.id}
                                className={cn(
                                  'px-2 py-4 text-sm transition-colors overflow-hidden',
                                  `text-${align}`,
                                  isNumeric
                                    ? 'font-mono tabular-nums text-gray-900'
                                    : 'text-gray-900',
                                  (cell.column.id.includes('date') || cell.column.id.includes('created')) && !isNumeric
                                    ? 'text-gray-600'
                                    : '',
                                  (cell.column.id === 'phone' || isNumeric)
                                    ? 'whitespace-nowrap'
                                    : '',
                                  isSelectionColumn && 'cursor-pointer'
                                )}
                                style={{
                                  width: `${width}px`,
                                  minWidth: `${width}px`,
                                  maxWidth: `${width}px`,
                                }}
                                title={typeof cell.getValue() === 'string' ? cell.getValue() : undefined}
                                onClick={isSelectionColumn && enableRowSelection && getRowIdValue && handleToggleRow && selectedRowIds && selectAllAcrossPages !== undefined ? (e) => {
                                  e.stopPropagation();
                                  const rowId = getRowIdValue(row.original);
                                  if (rowId) {
                                    const checked = selectAllAcrossPages ? true : selectedRowIds.has(rowId);
                                    handleToggleRow(rowId, !checked);
                                  }
                                } : undefined}
                              >
                                {getCellContent(cell, column)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              );
            })
          )
        ) : (
          // Render normal (ungrouped) data
          table.getRowModel().rows.map((row: any, rowIndex: number) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-gray-100 transition-all duration-200',
                'bg-white',
                onRowClick && 'cursor-pointer hover:bg-gray-50',
                'group',
                'hover:shadow-sm'
              )}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell: any) => {
                const column = table.getColumn(cell.column.id);
                const meta = column?.columnDef.meta;
                const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
                const isNumeric = meta?.isNumeric;
                const width = columnSizing[cell.column.id] || cell.column.getSize() || 150;
                const isSelectionColumn = cell.column.id === SELECTION_COLUMN_ID;

                return (
                  <td
                    key={cell.id}
                    className={cn(
                      'px-2 py-1 text-sm transition-colors overflow-hidden',
                      `text-${align}`,
                      isNumeric
                        ? 'font-mono tabular-nums text-gray-900'
                        : 'text-gray-900',
                      (cell.column.id.includes('date') || cell.column.id.includes('created')) && !isNumeric
                        ? 'text-gray-600'
                        : '',
                      (cell.column.id === 'phone' || isNumeric)
                        ? 'whitespace-nowrap'
                        : '',
                      isSelectionColumn && 'cursor-pointer'
                    )}
                    style={{
                      width: `${width}px`,
                      minWidth: `${width}px`,
                      maxWidth: `${width}px`,
                    }}
                    title={typeof cell.getValue() === 'string' ? cell.getValue() : undefined}
                    onClick={isSelectionColumn ? (e) => {
                      e.stopPropagation();
                      const rowId = getRowIdValue(row.original);
                      if (rowId) {
                        const checked = selectAllAcrossPages ? true : selectedRowIds.has(rowId);
                        handleToggleRow(rowId, !checked);
                      }
                    } : undefined}
                  >
                    {getCellContent(cell, column)}
                  </td>
                );
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
