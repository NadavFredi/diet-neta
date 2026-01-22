import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnOrderState,
  VisibilityState,
  ColumnSizingState,
  Header,
  Table,
} from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  GripHorizontal,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Trash2,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setColumnVisibility as setColumnVisibilityAction,
  setColumnSizing as setColumnSizingAction,
  setColumnOrder as setColumnOrderAction,
  setGroupByKey as setGroupByKeyAction,
  setGroupByKeys as setGroupByKeysAction,
  setGroupSorting as setGroupSortingAction,
  toggleGroupCollapse as toggleGroupCollapseAction,
  initializeTableState,
  setSelectedRowIds as setSelectedRowIdsAction,
  setSelectAllAcrossPages as setSelectAllAcrossPagesAction,
  setLastClickedRowIndex as setLastClickedRowIndexAction,
  clearSelection as clearSelectionAction,
  selectColumnVisibility,
  selectColumnSizing,
  selectColumnOrder,
  selectGroupByKey,
  selectGroupByKeys,
  selectGroupSorting,
  selectCollapsedGroups,
  selectSelectedRowIds,
  selectLastClickedRowIndex,
  selectAllAcrossPages as selectAllAcrossPagesSelector,
  ResourceKey,
} from '@/store/slices/tableStateSlice';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
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
import { BulkEditModal } from './BulkEditModal';

// --- Types ---

export interface DataTableColumn<T> extends Omit<ColumnDef<T>, 'id'> {
  id: string;
  accessorKey?: keyof T | string;
  header: string | ((props: any) => React.ReactNode);
  cell?: (props: any) => React.ReactNode;
  enableSorting?: boolean;
  enableHiding?: boolean;
  enableResizing?: boolean;
  size?: number;
  meta?: {
    align?: 'left' | 'center' | 'right';
    className?: string;
    sortKey?: string;
    sortKeys?: string[];
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
  resourceKey?: ResourceKey;
  initialColumnVisibility?: Record<string, boolean>;
  initialColumnOrder?: string[];
  onSortChange?: (sortBy: string, sortOrder: 'ASC' | 'DESC') => void;
  serverSideSorting?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  enableRowSelection?: boolean;
  getRowId?: (row: T) => string;
  totalCount?: number;
  selectionLabel?: string;
  onBulkDelete?: (params: { ids: string[], selectAllAcrossPages: boolean, totalCount: number }) => Promise<void>;
  onBulkEdit?: (params: { ids: string[], selectAllAcrossPages: boolean, totalCount: number, updates: Record<string, any> }) => Promise<void>;
  groupCurrentPage?: number;
  groupPageSize?: number;
  singularLabel?: string;
  pluralLabel?: string;
}

interface GroupedData<T> {
  groupKey: string;
  items: T[];
}

interface MultiLevelGroupedData<T> {
  level1Key: string;
  level2Groups: GroupedData<T>[];
  items: T[]; // Items that only have level 1 key but no level 2 key
}

const DEFAULT_COLUMN_VISIBILITY = {};
const DEFAULT_COLUMN_SIZING = {};
const DEFAULT_COLUMN_ORDER: string[] = [];
const DEFAULT_GROUP_BY_KEYS: [string | null, string | null] = [null, null];
const DEFAULT_GROUP_SORTING: SortingState = [];
const DEFAULT_COLLAPSED_GROUPS: string[] = [];
const SELECTION_COLUMN_ID = '__select__';

// --- Components ---

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: header.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
  };

  const column = table.getColumn(header.id);
  const canSort = column?.getCanSort();
  const canResize = column?.getCanResize();
  const canHide = column?.columnDef.enableHiding !== false;
  const meta = column?.columnDef.meta;
  const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
  const isSelection = header.id === SELECTION_COLUMN_ID;

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onHideColumn(header.id);
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-slate-50 border-b border-slate-200 px-2 py-3 text-xs font-semibold text-slate-600 transition-colors sm:di',
        'hover:bg-slate-100/80',
        isResizing && 'bg-slate-100',
        `text-${align}`
      )}
    >
      <div
        className={cn(
          "flex items-center h-full relative gap-2 px-1",
          align === 'center' ? "justify-center" : "justify-end"
        )}
        style={{
          flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
        }}
      >
        {/* Column Actions (Drag & Hide) */}
        {!isSelection && (
          <div
            className="flex items-center flex-shrink-0 gap-0.5"
            style={{
              flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
            }}
          >
            {canHide && (
              <button
                onClick={handleHideClick}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-all hidden group-hover:flex"
                title="הסתר עמודה"
              >
                <EyeOff className="h-3 w-3" />
              </button>
            )}
            <div
              {...attributes}
              {...listeners}
              className={cn(
                "p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded transition-all",
                isDragging ? "flex" : "hidden group-hover:flex"
              )}
              style={{
                touchAction: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GripHorizontal className="h-3 w-3 text-slate-500" />
            </div>
          </div>
        )}

        {/* Column Header Content */}
        <div
          className={cn(
            "flex items-center gap-1.5 min-w-0",
            canSort && "cursor-pointer select-none"
          )}
          style={{
            flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
          }}
          onClick={() => onHeaderClick(header.id)}
        >
          <span className="truncate">
            {typeof header.column.columnDef.header === 'function'
              ? header.column.columnDef.header(header.getContext())
              : header.column.columnDef.header}
          </span>
          {canSort && (
            <div className="flex-shrink-0">
              {getSortIcon(header.id)}
            </div>
          )}
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

        </div>
      )}
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
  onBulkEdit,
  groupCurrentPage,
  groupPageSize = 100,
  singularLabel = 'פריט',
  pluralLabel = 'פריטים',
}: DataTableProps<T>) {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  useEffect(() => {
    if (!resourceKey || columns.length === 0) return;
    const columnIds = columns.map((col) => col.id);
    dispatch(
      initializeTableState({
        resourceKey,
        columnIds,
        initialVisibility: initialColumnVisibility,
        initialOrder: initialColumnOrder,
      })
    );
  }, [resourceKey, columns, initialColumnVisibility, initialColumnOrder, dispatch]);

  // 1. Initial Hooks & Base State
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const tableRef = React.useRef<HTMLDivElement>(null);
  const lastShiftKeyRef = React.useRef(false);
  const [hasMeasured, setHasMeasured] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  // Sorting state sync
  const serverSortingState = useMemo<SortingState>(() => {
    if (serverSideSorting && externalSortBy) {
      return [{ id: externalSortBy, desc: externalSortOrder === 'DESC' }];
    }
    return [];
  }, [serverSideSorting, externalSortBy, externalSortOrder]);

  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    if (serverSideSorting && externalSortBy) {
      setSorting(serverSortingState);
    }
  }, [serverSideSorting, externalSortBy, externalSortOrder, serverSortingState]);

  // 2. Selection State (Redux + Local)
  const [localSelectedRowIds, setLocalSelectedRowIds] = useState<Set<string>>(new Set());
  const [localSelectAllAcrossPages, setLocalSelectAllAcrossPages] = useState(false);
  const [localLastClickedRowIndex, setLocalLastClickedRowIndex] = useState<number | null>(null);

  const reduxSelectedRowIdsArray = resourceKey ? useAppSelector((state) => selectSelectedRowIds(state, resourceKey)) : [];
  const reduxSelectedRowIds = useMemo(() => new Set(reduxSelectedRowIdsArray), [reduxSelectedRowIdsArray]);
  const reduxSelectAllAcrossPages = resourceKey ? useAppSelector((state) => selectAllAcrossPagesSelector(state, resourceKey)) : false;
  const reduxLastClickedRowIndex = resourceKey ? useAppSelector((state) => selectLastClickedRowIndex(state, resourceKey)) : null;

  const selectedRowIds = resourceKey ? reduxSelectedRowIds : localSelectedRowIds;
  const selectAllAcrossPages = resourceKey ? reduxSelectAllAcrossPages : localSelectAllAcrossPages;
  const lastClickedRowIndex = resourceKey ? reduxLastClickedRowIndex : localLastClickedRowIndex;

  // 3. Selection Setters
  const setSelectedRowIds = useCallback((updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (resourceKey) {
      const nextSet = typeof updater === 'function' ? updater(reduxSelectedRowIds) : updater;
      dispatch(setSelectedRowIdsAction({ resourceKey, ids: Array.from(nextSet) }));
    } else {
      setLocalSelectedRowIds(updater);
    }
  }, [resourceKey, reduxSelectedRowIds, dispatch]);

  const setSelectAllAcrossPages = useCallback((value: boolean) => {
    if (resourceKey) {
      dispatch(setSelectAllAcrossPagesAction({ resourceKey, selectAll: value }));
    } else {
      setLocalSelectAllAcrossPages(value);
    }
  }, [resourceKey, dispatch]);

  const setLastClickedRowIndex = useCallback((index: number | null) => {
    if (resourceKey) {
      dispatch(setLastClickedRowIndexAction({ resourceKey, index }));
    } else {
      setLocalLastClickedRowIndex(index);
    }
  }, [resourceKey, dispatch]);

  // 4. Data Helpers
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

  const handleToggleAllPage = useCallback((checked: boolean) => {
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
  }, [selectAllAcrossPages, currentPageIds, setSelectedRowIds, setSelectAllAcrossPages]);

  const handleClearSelection = useCallback(() => {
    if (resourceKey) {
      dispatch(clearSelectionAction({ resourceKey }));
    } else {
      setLocalSelectAllAcrossPages(false);
      setLocalSelectedRowIds(new Set());
      setLocalLastClickedRowIndex(null);
    }
  }, [resourceKey, dispatch]);

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

  const handleConfirmBulkEdit = async (updates: Record<string, any>) => {
    if (!onBulkEdit || Object.keys(updates).length === 0) return;
    setIsBulkEditing(true);
    try {
      await onBulkEdit({
        ids: Array.from(selectedRowIds),
        selectAllAcrossPages,
        totalCount: totalItems,
        updates,
      });
      handleClearSelection();
      setIsBulkEditOpen(false);
      toast({
        title: 'הצלחה',
        description: 'הערכים עודכנו בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון. נסה שוב.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkEditing(false);
    }
  };

  // 5. Table State Selectors & Sync
  const reduxColumnVisibility = resourceKey ? useAppSelector((state) => selectColumnVisibility(state, resourceKey)) : DEFAULT_COLUMN_VISIBILITY;
  const reduxColumnSizing = resourceKey ? useAppSelector((state) => selectColumnSizing(state, resourceKey)) : DEFAULT_COLUMN_SIZING;
  const reduxColumnOrder = resourceKey ? useAppSelector((state) => selectColumnOrder(state, resourceKey)) : DEFAULT_COLUMN_ORDER;
  const groupByKey = resourceKey ? useAppSelector((state) => selectGroupByKey(state, resourceKey)) : null;
  const groupByKeys = resourceKey ? useAppSelector((state) => selectGroupByKeys(state, resourceKey)) : DEFAULT_GROUP_BY_KEYS;
  const groupSorting = resourceKey ? useAppSelector((state) => selectGroupSorting(state, resourceKey)) : DEFAULT_GROUP_SORTING;
  const collapsedGroups = resourceKey ? useAppSelector((state) => selectCollapsedGroups(state, resourceKey)) : DEFAULT_COLLAPSED_GROUPS;

  const [localColumnVisibility, setLocalColumnVisibility] = useState<VisibilityState>(initialColumnVisibility || DEFAULT_COLUMN_VISIBILITY);
  const [localColumnSizing, setLocalColumnSizing] = useState<ColumnSizingState>(DEFAULT_COLUMN_SIZING);
  const [localColumnOrder, setLocalColumnOrder] = useState<ColumnOrderState>(initialColumnOrder || columns.map(c => c.id));

  const effectiveColumnVisibility = resourceKey ? reduxColumnVisibility : localColumnVisibility;
  const effectiveColumnSizing = resourceKey ? reduxColumnSizing : localColumnSizing;
  const columnOrder = resourceKey ? reduxColumnOrder : localColumnOrder;

  const derivedColumnSizing = enableRowSelection ? { ...effectiveColumnSizing, [SELECTION_COLUMN_ID]: 48 } : effectiveColumnSizing;
  const derivedColumnVisibility = enableRowSelection ? { ...effectiveColumnVisibility, [SELECTION_COLUMN_ID]: true } : effectiveColumnVisibility;
  const derivedColumnOrder = enableRowSelection ? [SELECTION_COLUMN_ID, ...columnOrder.filter(id => id !== SELECTION_COLUMN_ID)] : columnOrder;

  // 6. Table Instance
  const tableColumns = useMemo(() => {
    const dataCols: ColumnDef<T>[] = columns.map((col) => ({
      ...col,
      id: col.id,
      header: col.header,
      cell: col.cell,
      enableSorting: col.enableSorting !== false,
      enableHiding: col.enableHiding !== false,
      enableResizing: col.enableResizing !== false,
      size: col.size || 150,
      meta: col.meta,
    }));

    const selectionCol: ColumnDef<T> | null = enableRowSelection ? {
      id: SELECTION_COLUMN_ID,
      header: ({ table }) => (
        <Checkbox
          checked={selectAllAcrossPages ? true : allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
          onCheckedChange={(v) => handleToggleAllPage(v === true)}
          aria-label="בחר הכל"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => {
        const rowId = getRowIdValue(row.original);
        const checked = selectAllAcrossPages ? true : selectedRowIds.has(rowId);
        return (
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => {
              handleToggleRow(rowId, v === true, lastShiftKeyRef.current);
              lastShiftKeyRef.current = false;
            }}
            aria-label="בחר שורה"
            className="translate-y-[2px]"
            onClick={(e) => {
              lastShiftKeyRef.current = e.shiftKey;
              e.stopPropagation();
            }}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 48,
      meta: { align: 'center' },
    } : null;

    return selectionCol ? [selectionCol, ...dataCols] : dataCols;
  }, [columns, derivedColumnOrder, effectiveColumnVisibility, enableRowSelection, allPageSelected, somePageSelected, selectAllAcrossPages, selectedRowIds, getRowIdValue, handleToggleAllPage]);

  const tableInstance = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility: derivedColumnVisibility,
      columnOrder: derivedColumnOrder,
      columnSizing: derivedColumnSizing,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      if (serverSideSorting && onSortChange && next.length > 0) {
        onSortChange(next[0].id, next[0].desc ? 'DESC' : 'ASC');
      } else {
        setSorting(next);
      }
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(effectiveColumnVisibility) : updater;
      const sanitized = Object.fromEntries(Object.entries(next as Record<string, unknown>).filter(([k]) => k !== SELECTION_COLUMN_ID).map(([k, v]) => [k, Number(v)]));
      if (resourceKey) Object.keys(next as Record<string, boolean>).forEach(id => id !== SELECTION_COLUMN_ID && dispatch(setColumnVisibilityAction({ resourceKey, columnId: id, visible: (next as Record<string, boolean>)[id] })));
      else setLocalColumnVisibility(Object.fromEntries(Object.entries(next as Record<string, boolean>).filter(([k]) => k !== SELECTION_COLUMN_ID)));
    },
    onColumnOrderChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnOrder) : updater;
      const sanitized = (next as string[]).filter((id: string) => id !== SELECTION_COLUMN_ID);
      if (resourceKey) dispatch(setColumnOrderAction({ resourceKey, order: sanitized }));
      else setLocalColumnOrder(sanitized);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualSorting: serverSideSorting,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  // 7. Grouping Logic
  const resolvedGroupByKey = groupByKey;
  const resolvedGroupByKeys = groupByKeys;

  const paginatedGroupedData = useMemo(() => {
    if (!resolvedGroupByKey && !resolvedGroupByKeys[0]) return null;

    if (resolvedGroupByKeys[0] && resolvedGroupByKeys[1]) {
      const l1GroupsMap = new Map<string, MultiLevelGroupedData<T>>();
      data.forEach(item => {
        const l1Val = String(item[resolvedGroupByKeys[0]!] ?? 'ללא ערך');
        const l2Val = String(item[resolvedGroupByKeys[1]!] ?? 'ללא ערך');
        if (!l1GroupsMap.has(l1Val)) l1GroupsMap.set(l1Val, { level1Key: l1Val, level2Groups: [], items: [] });
        const l1Group = l1GroupsMap.get(l1Val)!;
        if (l2Val !== 'ללא ערך') {
          let l2Group = l1Group.level2Groups.find(g => g.groupKey === l2Val);
          if (!l2Group) { l2Group = { groupKey: l2Val, items: [] }; l1Group.level2Groups.push(l2Group); }
          l2Group.items.push(item);
        } else {
          l1Group.items.push(item);
        }
      });
      return Array.from(l1GroupsMap.values());
    }

    const key = resolvedGroupByKey || resolvedGroupByKeys[0]!;
    const groupsMap = new Map<string, GroupedData<T>>();
    data.forEach(item => {
      const val = String(item[key] ?? 'ללא ערך');
      if (!groupsMap.has(val)) groupsMap.set(val, { groupKey: val, items: [] });
      groupsMap.get(val)!.items.push(item);
    });
    return Array.from(groupsMap.values());
  }, [data, resolvedGroupByKey, resolvedGroupByKeys]);

  const collapsedGroupsSet = useMemo(() => new Set(collapsedGroups), [collapsedGroups]);

  // 8. Selection Logic
  const getVisibleRowIdsInOrder = useCallback(() => {
    if (paginatedGroupedData && (paginatedGroupedData as any[]).length > 0) {
      const visibleIds: string[] = [];
      const groups = paginatedGroupedData as any[];
      const isMultiLevel = groups.length > 0 && 'level1Key' in groups[0];

      if (isMultiLevel) {
        (groups as MultiLevelGroupedData<T>[]).forEach((l1) => {
          const l1Key = `level1:${l1.level1Key}`;
          if (collapsedGroupsSet.has(l1Key)) return;
          if (l1.level2Groups?.length) {
            l1.level2Groups.forEach((l2) => {
              const l2Key = `${l1Key}|level2:${l2.groupKey}`;
              if (collapsedGroupsSet.has(l2Key)) return;
              l2.items.forEach((item) => {
                const id = getRowIdValue(item);
                if (id) visibleIds.push(id);
              });
            });
          }
          if (l1.items?.length) {
            l1.items.forEach((item) => {
              const id = getRowIdValue(item);
              if (id) visibleIds.push(id);
            });
          }
        });
        return visibleIds;
      }

      (groups as GroupedData<T>[]).forEach((group) => {
        const groupKey = `group:${group.groupKey}`;
        if (collapsedGroupsSet.has(groupKey)) return;
        group.items.forEach((item) => {
          const id = getRowIdValue(item);
          if (id) visibleIds.push(id);
        });
      });
      return visibleIds;
    }

    return tableInstance.getRowModel().rows.map((row) => getRowIdValue(row.original));
  }, [paginatedGroupedData, collapsedGroupsSet, getRowIdValue, tableInstance]);

  const handleToggleRow = useCallback((rowId: string, checked: boolean, shiftKey?: boolean, rowIndex?: number) => {
    const visibleIds = getVisibleRowIdsInOrder();
    const resolvedRowIndex = visibleIds.indexOf(rowId);
    const effectiveRowIndex = resolvedRowIndex === -1 ? rowIndex : resolvedRowIndex;

    if (selectAllAcrossPages) {
      setSelectAllAcrossPages(false);
      const next = new Set(currentPageIds);
      if (!checked) next.delete(rowId);
      setSelectedRowIds(next);
      setLastClickedRowIndex(effectiveRowIndex ?? null);
      return;
    }

    if (shiftKey && lastClickedRowIndex !== null && effectiveRowIndex !== undefined) {
      const start = Math.min(lastClickedRowIndex, effectiveRowIndex);
      const end = Math.max(lastClickedRowIndex, effectiveRowIndex);
      const idsInRange = visibleIds.slice(start, end + 1);
      const lastRowId = visibleIds[lastClickedRowIndex];
      const shouldSelect = selectedRowIds.has(lastRowId);

      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        idsInRange.forEach(id => shouldSelect ? next.add(id) : next.delete(id));
        return next;
      });
    } else {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        if (checked) next.add(rowId);
        else next.delete(rowId);
        return next;
      });
      setLastClickedRowIndex(effectiveRowIndex ?? null);
    }
  }, [getVisibleRowIdsInOrder, currentPageIds, selectAllAcrossPages, selectedRowIds, lastClickedRowIndex, setSelectedRowIds, setSelectAllAcrossPages, setLastClickedRowIndex]);

  // 9. Table UI Event Handlers
  const getSortIcon = (columnId: string) => {
    const col = tableInstance.getColumn(columnId);
    if (!col?.getCanSort()) return null;
    const sortDir = serverSideSorting && externalSortBy === columnId ? (externalSortOrder === 'ASC' ? 'asc' : 'desc') : col.getIsSorted();
    return sortDir === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-600" /> : (sortDir === 'desc' ? <ArrowDown className="h-4 w-4 text-blue-600" /> : <ArrowUp className="h-4 w-4 text-slate-400 opacity-50" />);
  };

  const handleHeaderClick = (columnId: string) => {
    const col = tableInstance.getColumn(columnId);
    if (!col?.getCanSort()) return;
    if (serverSideSorting && onSortChange) onSortChange(columnId, externalSortBy === columnId && externalSortOrder === 'DESC' ? 'ASC' : 'DESC');
    else col.toggleSorting(undefined, true);
  };

  const handleResizeStart = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startWidth = tableInstance.getColumn(columnId)?.getSize() || 150;
    setIsResizing(columnId);
    const onMove = (me: MouseEvent) => {
      const delta = dir === 'rtl' ? startX - me.clientX : me.clientX - startX;
      const nextWidth = Math.max(60, startWidth + delta);
      resourceKey ? dispatch(setColumnSizingAction({ resourceKey, columnId, size: nextWidth })) : setLocalColumnSizing(p => ({ ...p, [columnId]: nextWidth }));
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; setIsResizing(null); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
  }, [tableInstance, dir, resourceKey, dispatch]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over?.id as string);
      const nextOrder = arrayMove(columnOrder, oldIndex, newIndex);
      if (resourceKey) dispatch(setColumnOrderAction({ resourceKey, order: nextOrder }));
      else setLocalColumnOrder(nextOrder);
    }
  };

  const handleHideColumn = (columnId: string) => {
    if (resourceKey) dispatch(setColumnVisibilityAction({ resourceKey, columnId, visible: false }));
    else setLocalColumnVisibility(prev => ({ ...prev, [columnId]: false }));
  };

  const handleToggleGroup = (groupKey: string) => {
    if (resourceKey) dispatch(toggleGroupCollapseAction({ resourceKey, groupKey }));
  };

  const getCellContent = (cell: any, column: any) => {
    return flexRender(column.columnDef.cell, cell.getContext());
  };

  const getGroupColumnHeader = (columnId?: string | null) => {
    if (!columnId) return '';
    const col = columns.find(c => c.id === columnId || c.accessorKey === columnId);
    return typeof col?.header === 'string' ? col.header : columnId;
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  return (
    <div className={cn('flex flex-col h-full w-full bg-white', className)} dir={dir}>
      {enableRowSelection && (selectedRowIds.size > 0 || selectAllAcrossPages) && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="text-sm text-slate-700">{selectAllAcrossPages ? <span>נבחרו כל {totalItems} {selectionLabel}</span> : <span>נבחרו {selectedCount} מתוך {totalItems} {selectionLabel}</span>}</div>
          <div className="flex items-center gap-2">
            {showSelectAllAcrossPages && <Button type="button" variant="outline" size="sm" onClick={() => setSelectAllAcrossPages(true)}>בחר את כל {totalItems} {selectionLabel}</Button>}
            {onBulkEdit && <Button type="button" variant="outline" size="sm" onClick={() => setIsBulkEditOpen(true)} className="gap-2"><Edit className="h-4 w-4" /> עריכה קבוצתית</Button>}
            {onBulkDelete && <Button type="button" variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)} className="gap-2"><Trash2 className="h-4 w-4" /> מחיקה</Button>}
            <Button type="button" variant="ghost" size="sm" onClick={handleClearSelection}>ביטול בחירה</Button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto relative" ref={tableRef}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <TableContent table={tableInstance} tableColumns={tableColumns} dir={dir} enableColumnReordering={enableColumnReordering} onRowClick={onRowClick} handleHeaderClick={handleHeaderClick} getSortIcon={getSortIcon} handleResizeStart={handleResizeStart} getCellContent={getCellContent} onHideColumn={handleHideColumn} isResizing={isResizing} columnSizing={derivedColumnSizing} groupedData={paginatedGroupedData as any} groupByKey={resolvedGroupByKey} groupByKeys={resolvedGroupByKeys} originalGroupByKey={groupByKey || null} originalGroupByKeys={groupByKeys} columns={columns} collapsedGroupsSet={collapsedGroupsSet} onToggleGroup={handleToggleGroup} getGroupColumnHeader={getGroupColumnHeader} enableRowSelection={enableRowSelection} getRowIdValue={getRowIdValue} handleToggleRow={handleToggleRow} selectedRowIds={selectedRowIds} selectAllAcrossPages={selectAllAcrossPages} getVisibleRowIdsInOrder={getVisibleRowIdsInOrder} singularLabel={singularLabel} pluralLabel={pluralLabel} emptyMessage={emptyMessage} />
        </DndContext>
      </div>
      {onBulkEdit && <BulkEditModal open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen} onConfirm={handleConfirmBulkEdit} columns={columns} selectedCount={selectedCount} totalItems={totalItems} selectAllAcrossPages={selectAllAcrossPages} selectionLabel={selectionLabel} isEditing={isBulkEditing} dir={dir} />}
      {onBulkDelete && <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>מחיקת {selectionLabel}</AlertDialogTitle><AlertDialogDescription>{selectAllAcrossPages ? `את/ה עומד/ת למחוק ${totalItems} ${selectionLabel}.` : `את/ה עומד/ת למחוק ${selectedCount} ${selectionLabel}.`} פעולה זו אינה ניתנת לשחזור.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-red-600 hover:bg-red-600/90 text-white" disabled={isBulkDeleting}>{isBulkDeleting ? 'מוחק...' : 'אישור מחיקה'}</AlertDialogAction><AlertDialogCancel disabled={isBulkDeleting}>ביטול</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog>}
    </div>
  );
}

function TableContent<T>({
  table, tableColumns, dir, enableColumnReordering, onRowClick, handleHeaderClick, getSortIcon, handleResizeStart, getCellContent, onHideColumn, isResizing, columnSizing, groupedData, groupByKey, groupByKeys, originalGroupByKey, originalGroupByKeys, columns, collapsedGroupsSet, onToggleGroup, getGroupColumnHeader, enableRowSelection, getRowIdValue, handleToggleRow, selectedRowIds, selectAllAcrossPages, getVisibleRowIdsInOrder, singularLabel, pluralLabel, emptyMessage
}: {
  table: any; tableColumns: any[]; dir: 'ltr' | 'rtl'; enableColumnReordering: boolean; onRowClick?: (row: T) => void; handleHeaderClick: (columnId: string) => void; getSortIcon: (columnId: string) => React.ReactNode; handleResizeStart: (e: React.MouseEvent, columnId: string) => void; getCellContent: (cell: any, column: any) => React.ReactNode; onHideColumn: (columnId: string) => void; isResizing: string | null; columnSizing: Record<string, number>; groupedData: GroupedData<T>[] | MultiLevelGroupedData<T>[] | null; groupByKey: string | null; groupByKeys: [string | null, string | null]; originalGroupByKey: string | null; originalGroupByKeys: [string | null, string | null]; columns: DataTableColumn<T>[]; collapsedGroupsSet: Set<string>; onToggleGroup: (groupKey: string) => void; getGroupColumnHeader: (columnId?: string | null) => string; enableRowSelection?: boolean; getRowIdValue?: (row: T) => string; handleToggleRow?: (rowId: string, checked: boolean, shiftKey?: boolean, rowIndex?: number) => void; selectedRowIds?: Set<string>; selectAllAcrossPages?: boolean; getVisibleRowIdsInOrder?: () => string[]; singularLabel?: string; pluralLabel?: string; emptyMessage?: string;
}) {
  const getRowIndex = useCallback((rowId: string): number | undefined => {
    if (!getVisibleRowIdsInOrder || !enableRowSelection) return undefined;
    const visible = getVisibleRowIdsInOrder();
    const idx = visible.indexOf(rowId);
    return idx !== -1 ? idx : undefined;
  }, [getVisibleRowIdsInOrder, enableRowSelection]);

  const isMultiLevel = (data: any): data is MultiLevelGroupedData<T>[] => Array.isArray(data) && data.length > 0 && 'level1Key' in data[0];

  const getGroupHeader = (columnId: string | null, isL2: boolean = false) => {
    if (!columnId) return '';
    const id = isL2 ? (originalGroupByKeys?.[1] || columnId) : (originalGroupByKeys?.[0] || originalGroupByKey || columnId);
    const col = columns.find(c => c.id === id || c.accessorKey === columnId);
    return typeof col?.header === 'string' ? col.header : columnId;
  };

  const isDateCol = (columnId: string | null, isL2: boolean = false): boolean => {
    if (!columnId) return false;
    const id = isL2 ? (originalGroupByKeys?.[1] || columnId) : (originalGroupByKeys?.[0] || originalGroupByKey || columnId);
    const col = columns.find(c => c.id === id || c.accessorKey === columnId);
    if (!col) { const cid = (id || columnId).toLowerCase(); return cid.includes('date') || cid.includes('created') || cid.includes('updated') || cid.includes('time'); }
    const cid = col.id.toLowerCase(), ack = (col.accessorKey as string)?.toLowerCase() || '';
    return cid.includes('date') || cid.includes('created') || cid.includes('updated') || cid.includes('time') || ack.includes('date') || ack.includes('created') || ack.includes('updated') || ack.includes('time');
  };

  const formatGVal = (val: any, columnId: string | null, isL2: boolean = false): string => {
    if (val === null || val === undefined || val === 'ללא ערך') return 'ללא ערך';
    if (!isDateCol(columnId, isL2)) return String(val);
    try { const d = typeof val === 'string' ? new Date(val) : val; if (d instanceof Date && !isNaN(d.getTime())) return format(d, 'HH:mm | dd/MM/yyyy', { locale: he }); } catch (e) { }
    return String(val);
  };

  return (
    <table className="w-full border-collapse min-w-full">
      <thead className="sticky top-0 z-20">
        {table.getHeaderGroups().map((headerGroup: any) => (
          <tr key={headerGroup.id} className="bg-slate-50 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
            <SortableContext items={tableColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {headerGroup.headers.map((header: any) => (
                <SortableHeader key={header.id} header={header} table={table} dir={dir} onHeaderClick={handleHeaderClick} getSortIcon={getSortIcon} onResizeStart={handleResizeStart} width={columnSizing[header.id] || header.column.getSize()} isResizing={isResizing === header.id} onHideColumn={onHideColumn} />
              ))}
            </SortableContext>
          </tr>
        ))}
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {groupedData && (groupedData as any[]).length > 0 ? (
          isMultiLevel(groupedData) ? (
            (groupedData as MultiLevelGroupedData<T>[]).map((l1) => {
              const l1Key = `level1:${l1.level1Key}`, isL1Collapsed = collapsedGroupsSet.has(l1Key), l1Header = getGroupHeader(groupByKeys[0], false);
              const l1Rows: any[] = [];
              if (l1.level2Groups?.length) {
                l1.level2Groups.forEach(l2 => {
                  const l2Key = `${l1Key}|level2:${l2.groupKey}`, isL2Collapsed = collapsedGroupsSet.has(l2Key), l2Header = getGroupHeader(groupByKeys[1], true);
                  l1Rows.push({ type: 'level2-header', key: l2Key, header: l2Header, group: l2, isCollapsed: isL2Collapsed, rows: l2.items.map(i => table.getRowModel().rows.find((r: any) => getRowIdValue?.(r.original) === getRowIdValue?.(i))).filter(Boolean) });
                  if (!isL2Collapsed) l1Rows.push({ type: 'level2-rows', key: `${l2Key}-rows`, rows: l2.items.map(i => table.getRowModel().rows.find((r: any) => getRowIdValue?.(r.original) === getRowIdValue?.(i))).filter(Boolean) });
                });
              }
              if (l1.items?.length) l1Rows.push({ type: 'level1-rows', key: `${l1Key}-items`, rows: l1.items.map(i => table.getRowModel().rows.find((r: any) => getRowIdValue?.(r.original) === getRowIdValue?.(i))).filter(Boolean) });
              const getL1VisIds = () => {
                if (!enableRowSelection || !getRowIdValue) return [];
                const ids: string[] = [];
                if (l1.level2Groups?.length) {
                  l1.level2Groups.forEach((l2) => {
                    l2.items.forEach((item) => {
                      const id = getRowIdValue(item);
                      if (id) ids.push(id);
                    });
                  });
                }
                if (l1.items?.length) {
                  l1.items.forEach((item) => {
                    const id = getRowIdValue(item);
                    if (id) ids.push(id);
                  });
                }
                return ids;
              };
              const l1VisIds = getL1VisIds(), l1SelCount = l1VisIds.filter(id => selectAllAcrossPages || selectedRowIds?.has(id)).length;
              const l1AllSel = l1VisIds.length > 0 && l1SelCount === l1VisIds.length, l1SomeSel = l1SelCount > 0 && !l1AllSel;

              return (
                <React.Fragment key={l1Key}>
                  <tr className="bg-slate-50 border-t border-b border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onToggleGroup(l1Key)}>
                    <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-3">
                      <div className="flex items-center gap-3" style={{ flexDirection: dir === 'rtl' ? 'row-reverse' : 'row', justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start' }}>
                        <span className="text-sm font-bold text-slate-900">{l1Header}: {formatGVal(l1.level1Key, groupByKeys[0], false)}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200">{l1.items.length + (l1.level2Groups?.reduce((acc, g) => acc + g.items.length, 0) || 0)} {singularLabel}</span>
                        <div className="flex-shrink-0 transition-transform duration-200">{isL1Collapsed ? <ChevronRight className="h-4 w-4 text-slate-600" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}</div>
                        {enableRowSelection && handleToggleRow && getRowIdValue && <div className="flex-shrink-0"><Checkbox checked={l1AllSel ? true : l1SomeSel ? 'indeterminate' : false} onCheckedChange={(v) => l1VisIds.forEach(id => handleToggleRow(id, v === true))} aria-label="בחר כל הקבוצה" onClick={(e) => e.stopPropagation()} /></div>}
                      </div>
                    </td>
                  </tr>
                  {!isL1Collapsed && l1Rows.map((item) => {
                    if (item.type === 'level2-header') {
                      const l2VisIds = item.rows.map((r: any) => getRowIdValue?.(r.original)).filter(Boolean);
                      const l2SelCount = l2VisIds.filter((id: string) => selectAllAcrossPages || selectedRowIds?.has(id)).length;
                      const l2AllSel = l2VisIds.length > 0 && l2SelCount === l2VisIds.length, l2SomeSel = l2SelCount > 0 && !l2AllSel;
                      return (
                        <tr key={item.key} className="bg-slate-100/50 border-b border-slate-200 hover:bg-slate-150 transition-colors cursor-pointer" onClick={() => onToggleGroup(item.key)}>
                          <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-2.5">
                            <div className="flex items-center gap-3" style={{ flexDirection: dir === 'rtl' ? 'row-reverse' : 'row', justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start', marginRight: dir === 'rtl' ? '24px' : '0', marginLeft: dir === 'ltr' ? '24px' : '0' }}>
                              <span className="text-sm font-semibold text-slate-700">{item.header}: {formatGVal(item.group.groupKey, groupByKeys[1], true)}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200">{item.group.items.length} {singularLabel}</span>
                              <div className="flex-shrink-0 transition-transform duration-200">{item.isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}</div>
                              {enableRowSelection && handleToggleRow && getRowIdValue && <div className="flex-shrink-0"><Checkbox checked={l2AllSel ? true : l2SomeSel ? 'indeterminate' : false} onCheckedChange={(v) => l2VisIds.forEach((id: string) => handleToggleRow(id, v === true))} aria-label="בחר כל הקבוצה" onClick={(e) => e.stopPropagation()} /></div>}
                            </div>
                          </td>
                        </tr>
                      );
                    } else if (item.type === 'level2-rows' || item.type === 'level1-rows') {
                      return item.rows.map((row: any) => (
                        <tr key={row.id} className={cn('group transition-colors', onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/50')} onClick={() => onRowClick?.(row.original)}>
                          {row.getVisibleCells().map((cell: any) => {
                            const col = table.getColumn(cell.column.id), isSelection = cell.column.id === SELECTION_COLUMN_ID, width = columnSizing[cell.column.id] || cell.column.getSize();
                            return (
                              <td key={cell.id} className={cn('px-2 py-1 text-sm overflow-hidden truncate', `text-${col?.columnDef.meta?.align || (dir === 'rtl' ? 'right' : 'left')}`, isSelection && 'cursor-pointer')} style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }} onClick={isSelection ? (e) => { e.stopPropagation(); const id = getRowIdValue?.(row.original); if (id) handleToggleRow?.(id, !(selectAllAcrossPages || selectedRowIds?.has(id)), e.shiftKey, getRowIndex(id)); } : undefined}>
                                {getCellContent(cell, cell.column)}
                              </td>
                            );
                          })}
                        </tr>
                      ));
                    }
                    return null;
                  })}
                </React.Fragment>
              );
            })
          ) : (
            (groupedData as GroupedData<T>[]).map((group) => {
              const groupKey = `group:${group.groupKey}`, isCollapsed = collapsedGroupsSet.has(groupKey), header = getGroupColumnHeader(groupByKey || groupByKeys[0]);
              const groupVisIds = group.items.map(i => getRowIdValue?.(i)).filter(Boolean);
              const gSelCount = groupVisIds.filter((id: string) => selectAllAcrossPages || selectedRowIds?.has(id)).length;
              const gAllSel = groupVisIds.length > 0 && gSelCount === groupVisIds.length, gSomeSel = gSelCount > 0 && !gAllSel;

              return (
                <React.Fragment key={groupKey}>
                  <tr className="bg-slate-50 border-t border-b border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => onToggleGroup(groupKey)}>
                    <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-3">
                      <div className="flex items-center gap-3" style={{ flexDirection: dir === 'rtl' ? 'row-reverse' : 'row', justifyContent: dir === 'rtl' ? 'flex-end' : 'flex-start' }}>
                        <span className="text-sm font-bold text-slate-900">{header}: {formatGVal(group.groupKey, groupByKey || groupByKeys[0], false)}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200">{group.items.length} {singularLabel}</span>
                        <div className="flex-shrink-0 transition-transform duration-200">{isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-600" /> : <ChevronDown className="h-4 w-4 text-slate-600" />}</div>
                        {enableRowSelection && handleToggleRow && getRowIdValue && <div className="flex-shrink-0"><Checkbox checked={gAllSel ? true : gSomeSel ? 'indeterminate' : false} onCheckedChange={(v) => groupVisIds.forEach((id: string) => handleToggleRow(id, v === true))} aria-label="בחר כל הקבוצה" onClick={(e) => e.stopPropagation()} /></div>}
                      </div>
                    </td>
                  </tr>
                  {!isCollapsed && group.items.map((item) => {
                    const row = table.getRowModel().rows.find((r: any) => getRowIdValue?.(r.original) === getRowIdValue?.(item));
                    if (!row) return null;
                    return (
                      <tr key={row.id} className={cn('group transition-colors', onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/50')} onClick={() => onRowClick?.(row.original)}>
                        {row.getVisibleCells().map((cell: any) => {
                          const col = table.getColumn(cell.column.id), isSelection = cell.column.id === SELECTION_COLUMN_ID, width = columnSizing[cell.column.id] || cell.column.getSize();
                          return (
                            <td key={cell.id} className={cn('px-2 py-4 text-sm overflow-hidden truncate', `text-${col?.columnDef.meta?.align || (dir === 'rtl' ? 'right' : 'left')}`, isSelection && 'cursor-pointer')} style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }} onClick={isSelection ? (e) => { e.stopPropagation(); const id = getRowIdValue?.(row.original); if (id) handleToggleRow?.(id, !(selectAllAcrossPages || selectedRowIds?.has(id)), e.shiftKey, getRowIndex(id)); } : undefined}>
                              {getCellContent(cell, cell.column)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })
          )
        ) : table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row: any) => (
            <tr key={row.id} className={cn('group transition-colors', onRowClick ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/50')} onClick={() => onRowClick?.(row.original)}>
              {row.getVisibleCells().map((cell: any) => {
                const col = table.getColumn(cell.column.id), isSelection = cell.column.id === SELECTION_COLUMN_ID, width = columnSizing[cell.column.id] || cell.column.getSize();
                return (
                  <td key={cell.id} className={cn('px-2 py-1.5 text-sm overflow-hidden truncate', `text-${col?.columnDef.meta?.align || (dir === 'rtl' ? 'right' : 'left')}`, isSelection && 'cursor-pointer')} style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }} onClick={isSelection ? (e) => { e.stopPropagation(); const id = getRowIdValue?.(row.original); if (id) handleToggleRow?.(id, !(selectAllAcrossPages || selectedRowIds?.has(id)), e.shiftKey, getRowIndex(id)); } : undefined}>
                    {getCellContent(cell, cell.column)}
                  </td>
                );
              })}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={table.getVisibleLeafColumns().length} className="px-4 py-8 text-center text-sm text-slate-500">{emptyMessage}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
