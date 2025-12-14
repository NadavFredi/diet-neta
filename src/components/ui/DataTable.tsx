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
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  id: string;
  header: string | ((props: any) => React.ReactNode);
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (props: any) => React.ReactNode;
  enableSorting?: boolean;
  enableResizing?: boolean;
  minSize?: number;
  maxSize?: number;
  size?: number;
  meta?: {
    align?: 'left' | 'right' | 'center';
    isNumeric?: boolean;
  };
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
  dir?: 'ltr' | 'rtl';
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  className,
  emptyMessage = 'לא נמצאו תוצאות',
  dir = 'rtl',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

  // Convert our column format to TanStack Table format
  const tableColumns = useMemo<ColumnDef<T>[]>(() => {
    // Calculate smart default sizes based on available space
    const totalColumns = columns.length;
    const defaultSize = Math.max(120, Math.floor(1000 / totalColumns));
    
    return columns.map((col) => ({
      id: col.id,
      header: col.header,
      accessorKey: col.accessorKey as string,
      accessorFn: col.accessorFn,
      cell: col.cell
        ? ({ getValue, row }: any) => col.cell!({ getValue, row })
        : ({ getValue }: any) => getValue(),
      enableSorting: col.enableSorting !== false,
      enableResizing: col.enableResizing !== false,
      minSize: col.minSize || 100,
      maxSize: col.maxSize || Infinity,
      size: col.size || defaultSize,
      meta: col.meta,
    }));
  }, [columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: 'onChange' as ColumnResizeMode,
    defaultColumn: {
      minSize: 100,
      maxSize: Infinity,
      size: 200,
    },
  });

  const getSortIcon = (columnId: string) => {
    const column = table.getColumn(columnId);
    if (!column || !column.getCanSort()) return null;

    const sortDirection = column.getIsSorted();
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3.5 w-3.5 text-blue-600" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-3.5 w-3.5 text-blue-600" />;
    }
    return <ArrowUp className="h-3.5 w-3.5 text-gray-400 opacity-50" />;
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
        // In RTL, dragging left (negative delta) should increase width
        // In LTR, dragging right (positive delta) should increase width
        const delta = dir === 'rtl' ? startX - e.clientX : e.clientX - startX;
        const newWidth = Math.max(50, Math.min(1000, startWidth + delta));
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
    <div className={cn('w-full', className)} dir={dir}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="bg-gray-50/50 border-b border-gray-100"
              >
                {headerGroup.headers.map((header) => {
                  const column = table.getColumn(header.id);
                  const canSort = column?.getCanSort();
                  const canResize = column?.columnDef.enableResizing !== false;
                  const meta = column?.columnDef.meta;
                  const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
                  const width = header.getSize();

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'relative h-14 px-6 font-semibold text-xs text-gray-900 uppercase tracking-wider group whitespace-nowrap',
                        `text-${align}`,
                        canSort && 'cursor-pointer select-none hover:bg-gray-100/50',
                        'transition-colors duration-150'
                      )}
                      style={{
                        width: canResize ? `${width}px` : 'auto',
                        minWidth: canResize ? `${width}px` : '100px',
                      }}
                      onClick={() => canSort && handleHeaderClick(header.id)}
                    >
                      <div className="flex items-center gap-2" style={{ flexDirection: dir === 'rtl' ? 'row-reverse' : 'row' }}>
                        <span className="whitespace-nowrap">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        {canSort && (
                          <span className="flex-shrink-0">{getSortIcon(header.id)}</span>
                        )}
                      </div>
                      {canResize && (
                        <div
                          className={cn(
                            'absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400/60 bg-transparent transition-colors z-10',
                            dir === 'rtl' ? 'left-0' : 'right-0'
                          )}
                          onMouseDown={(e) => handleResizeStart(e, header.id)}
                          style={{
                            touchAction: 'none',
                          }}
                          title="גרור לשינוי רוחב"
                        >
                          <GripVertical className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" style={{ [dir === 'rtl' ? 'left' : 'right']: '-1.5px' }} />
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, rowIndex) => (
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
                {row.getVisibleCells().map((cell) => {
                  const column = table.getColumn(cell.column.id);
                  const meta = column?.columnDef.meta;
                  const align = meta?.align || (dir === 'rtl' ? 'right' : 'left');
                  const isNumeric = meta?.isNumeric;
                  const width = cell.column.getSize();
                  const canResize = column?.columnDef.enableResizing !== false;

                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        'px-6 py-4 text-sm transition-colors',
                        `text-${align}`,
                        isNumeric 
                          ? 'font-mono tabular-nums text-gray-900' 
                          : 'text-gray-900',
                        // Softer gray for metadata (dates, IDs)
                        (cell.column.id.includes('date') || cell.column.id.includes('created') || cell.column.id === 'id') && !isNumeric
                          ? 'text-gray-600'
                          : ''
                      )}
                      style={{
                        width: canResize ? `${width}px` : 'auto',
                        minWidth: canResize ? `${width}px` : '100px',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
