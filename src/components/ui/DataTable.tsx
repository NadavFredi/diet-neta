import React, { useMemo, useState, useCallback } from 'react';
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
  percentageWidth,
  onHideColumn,
}: {
  header: any;
  table: any;
  dir: 'ltr' | 'rtl';
  onHeaderClick: (columnId: string) => void;
  getSortIcon: (columnId: string) => React.ReactNode;
  onResizeStart: (e: React.MouseEvent, columnId: string) => void;
  percentageWidth: number;
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
  const width = header.getSize();
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
    width: `${percentageWidth}%`,
    // Remove minWidth constraint to allow flexible resizing
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
              'absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/60 bg-transparent transition-colors z-10',
              dir === 'rtl' ? 'left-0' : 'right-0'
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
            <GripVertical className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ [dir === 'rtl' ? 'left' : 'right']: '-1.5px' }} />
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
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.map((col) => col.id));

  // Initialize column visibility - all visible by default
  React.useEffect(() => {
    const initialVisibility: VisibilityState = {};
    columns.forEach((col) => {
      // Default to visible unless explicitly disabled
      initialVisibility[col.id] = col.enableHiding !== false;
    });
    setColumnVisibility((prev) => {
      // Only update if not already set
      if (Object.keys(prev).length === 0) {
        return initialVisibility;
      }
      // Merge with new columns
      const merged = { ...prev };
      columns.forEach((col) => {
        if (!(col.id in merged)) {
          merged[col.id] = col.enableHiding !== false;
        }
      });
      return merged;
    });
  }, [columns]);

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
    const orderedColumns = columnOrder
      .map((id) => columns.find((col) => col.id === id))
      .filter((col): col is DataTableColumn<T> => col !== undefined && columnVisibility[col.id] !== false);

    // Calculate weighted widths based on header text length (Smart Density)
    const getHeaderTextLength = (col: DataTableColumn<T>): number => {
      if (typeof col.header === 'string') {
        return col.header.length;
      }
      // Estimate for function headers - use column id as fallback
      return col.id.length;
    };

    // Calculate base width and weights for Smart Density
    const visibleCount = orderedColumns.length;
    const headerLengths = orderedColumns.map(col => getHeaderTextLength(col));
    const totalLength = headerLengths.reduce((sum, len) => sum + len, 0);
    const baseWidth = 100; // Minimum readable width
    const charWidth = 10; // Pixels per character for Hebrew text (more generous)
    const iconSpace = 40; // Space reserved for icons

    return orderedColumns.map((col, index) => {
      // Use provided size or calculate based on weighted width
      let defaultSize = col.size;
      
      if (!defaultSize) {
        // Special cases for compact columns
        if (col.id === 'id' || col.id === 'actions') {
          defaultSize = 80; // Very compact for IDs
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
  }, [columns, columnOrder, columnVisibility]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnSizing,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
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

    const sortDirection = column.getIsSorted();
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
    if (column && column.getCanSort()) {
      column.toggleSorting(undefined, true);
    }
  };

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, columnId: string) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = table.getColumn(columnId)?.getSize() || 150;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = dir === 'rtl' ? startX - e.clientX : e.clientX - startX;
        // Allow much smaller columns - minimum 60px to ensure icons are visible
        const newWidth = Math.max(60, Math.min(Infinity, startWidth + delta));
        setColumnSizing((prev) => ({
          ...prev,
          [columnId]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
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
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const handleHideColumn = (columnId: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: false,
    }));
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
        if (node.props?.children) {
          return getTextContent(node.props.children);
        }
        if (node.props?.title) {
          return node.props.title;
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

  const visibleColumns = columns.filter((col) => columnVisibility[col.id] !== false);

  return (
    <div className={cn('w-full', className)} dir={dir}>
      {/* Column Visibility Control */}
      {enableColumnVisibility && (
        <div className="mb-4 flex justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns className="h-4 w-4" />
                <span>עמודות</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end" dir={dir}>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm mb-3">הצגת עמודות</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {columns.map((col) => {
                    const headerText = typeof col.header === 'string' ? col.header : col.id;
                    const isVisible = columnVisibility[col.id] !== false;
                    return (
                      <div key={col.id} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`col-${col.id}`}
                          checked={isVisible}
                          onCheckedChange={() => toggleColumnVisibility(col.id)}
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
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Table */}
      <div className="w-full overflow-hidden">
        {enableColumnReordering ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <TableContent
              table={table}
              tableColumns={tableColumns}
              visibleColumns={visibleColumns}
              dir={dir}
              enableColumnReordering={enableColumnReordering}
              onRowClick={onRowClick}
              handleHeaderClick={handleHeaderClick}
              getSortIcon={getSortIcon}
              handleResizeStart={handleResizeStart}
              getCellContent={getCellContent}
              onHideColumn={handleHideColumn}
            />
          </DndContext>
        ) : (
          <TableContent
            table={table}
            tableColumns={tableColumns}
            visibleColumns={visibleColumns}
            dir={dir}
            enableColumnReordering={enableColumnReordering}
            onRowClick={onRowClick}
            handleHeaderClick={handleHeaderClick}
            getSortIcon={getSortIcon}
            handleResizeStart={handleResizeStart}
            getCellContent={getCellContent}
            onHideColumn={handleHideColumn}
          />
        )}
      </div>
    </div>
  );
}

// Extracted table content component to avoid duplication
function TableContent<T>({
  table,
  tableColumns,
  visibleColumns,
  dir,
  enableColumnReordering,
  onRowClick,
  handleHeaderClick,
  getSortIcon,
  handleResizeStart,
  getCellContent,
  onHideColumn,
}: {
  table: any;
  tableColumns: any[];
  visibleColumns: any[];
  dir: 'ltr' | 'rtl';
  enableColumnReordering: boolean;
  onRowClick?: (row: T) => void;
  handleHeaderClick: (columnId: string) => void;
  getSortIcon: (columnId: string) => React.ReactNode;
  handleResizeStart: (e: React.MouseEvent, columnId: string) => void;
  getCellContent: (cell: any, column: any) => React.ReactNode;
  onHideColumn: (columnId: string) => void;
}) {
  const totalWidth = tableColumns.reduce((sum, col) => sum + (col.size || 150), 0);

  return (
    <table className="w-full border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
      <thead>
        {table.getHeaderGroups().map((headerGroup: any) => {
          const headers = headerGroup.headers;
          
          const headerContent = headers.map((header: any) => {
            const width = header.getSize();
            const percentageWidth = totalWidth > 0 ? (width / totalWidth) * 100 : 100 / headers.length;
            
            if (enableColumnReordering) {
              return (
                <SortableHeader
                  key={header.id}
                  header={header}
                  table={table}
                  dir={dir}
                  onHeaderClick={handleHeaderClick}
                  getSortIcon={getSortIcon}
                  onResizeStart={handleResizeStart}
                  percentageWidth={percentageWidth}
                  onHideColumn={onHideColumn}
                />
              );
            }

            // Regular header (non-sortable) with improved styling
            const column = table.getColumn(header.id);
            const canSort = column?.getCanSort();
            const canResize = column?.columnDef.enableResizing !== false;
            const canHide = column?.columnDef.enableHiding !== false;
            const meta = column?.columnDef.meta;
            const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
            const [isHovered, setIsHovered] = useState(false);

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
                  width: `${percentageWidth}%`,
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
                        'absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/60 bg-transparent transition-colors z-10',
                        dir === 'rtl' ? 'left-0' : 'right-0'
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
                      <GripVertical className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ [dir === 'rtl' ? 'left' : 'right']: '-1.5px' }} />
                    </div>
                  )}
                </div>
              </th>
            );
          });

          return (
            <tr
              key={headerGroup.id}
              className="bg-gray-50/50 border-b border-gray-100"
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
        {table.getRowModel().rows.map((row: any, rowIndex: number) => (
          <tr
            key={row.id}
            className={cn(
              'border-b border-gray-100 transition-all duration-150',
              'bg-white',
              onRowClick && 'cursor-pointer hover:bg-gray-50/80',
              'group'
            )}
            onClick={() => onRowClick?.(row.original)}
          >
            {row.getVisibleCells().map((cell: any) => {
              const column = table.getColumn(cell.column.id);
              const meta = column?.columnDef.meta;
              const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
              const isNumeric = meta?.isNumeric;
              const width = cell.column.getSize();
              const canResize = column?.columnDef.enableResizing !== false;

              // Calculate percentage width for fixed layout
              const percentageWidth = totalWidth > 0 ? (width / totalWidth) * 100 : 100 / visibleColumns.length;

              return (
                <td
                  key={cell.id}
                  className={cn(
                    'px-2 py-4 text-sm transition-colors overflow-hidden',
                    `text-${align}`,
                    isNumeric 
                      ? 'font-mono tabular-nums text-gray-900' 
                      : 'text-gray-900',
                    // Softer gray for metadata (dates, IDs)
                    (cell.column.id.includes('date') || cell.column.id.includes('created') || cell.column.id === 'id') && !isNumeric
                      ? 'text-gray-600'
                      : '',
                    // Force single line for critical fields
                    (cell.column.id === 'id' || cell.column.id === 'phone' || isNumeric)
                      ? 'whitespace-nowrap'
                      : ''
                  )}
                  style={{
                    width: `${percentageWidth}%`,
                    // Remove minWidth constraint to allow flexible resizing
                    maxWidth: `${percentageWidth}%`,
                  }}
                  title={typeof cell.getValue() === 'string' ? cell.getValue() : undefined}
                >
                  {getCellContent(cell, column)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
