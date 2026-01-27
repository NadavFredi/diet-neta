/**
 * TableContainer Component
 * 
 * Provides a fixed-height container with:
 * - Always visible header (PageHeader/TableActionHeader)
 * - Sticky table header row
 * - Scrollable table body (vertical and horizontal)
 * - Always visible pagination footer
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface TableContainerProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  pagination?: React.ReactNode;
  className?: string;
  /** Fixed height in viewport units. Default: calc(100vh - 200px) */
  height?: string;
}

export const TableContainer: React.FC<TableContainerProps> = ({
  children,
  header,
  pagination,
  className,
  height = 'calc(100vh - 200px)',
}) => {
  return (
    <div
      className={cn('flex flex-col bg-white', className)}
      style={{ height }}
    >
      {/* Header - Always visible */}
      {header && (
        <div className="flex-shrink-0">
          {header}
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>

      {/* Pagination - Always visible */}
      {pagination && (
        <div className="flex-shrink-0">
          {pagination}
        </div>
      )}
    </div>
  );
};
