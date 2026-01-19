import type { Lead } from '@/store/slices/dashboardSlice';
import { LeadRow } from './LeadRow';
import { COLUMN_ORDER, getColumnLabel } from '@/utils/dashboard';
import type { ColumnVisibility } from '@/utils/dashboard';

interface LeadListProps {
  leads: Lead[];
  columnVisibility: ColumnVisibility;
}

export const LeadList = ({ leads, columnVisibility }: LeadListProps) => {
  const visibleColumns = COLUMN_ORDER.filter((col) => {
    // Safeguard: skip birthDate if it somehow still exists
    if (col === 'birthDate') return false;
    return columnVisibility[col] !== false;
  });

  if (leads.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-600 mb-2">לא נמצאו תוצאות</p>
        <p className="text-sm text-gray-500">נסה לשנות את פרמטרי החיפוש</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* Table Header */}
        <div
          className="bg-gray-100 border-b-2 border-gray-300 rounded-t-lg px-7 py-4"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
            gap: '1.25rem',
          }}
        >
          {visibleColumns.map((col) => (
            <div
              key={col}
              className="text-sm font-bold text-gray-700 text-right uppercase tracking-wide"
            >
              {getColumnLabel(col)}
            </div>
          ))}
        </div>

        {/* Table Rows */}
        <div className="space-y-2">
          {leads.map((lead, index) => (
            <div
              key={lead.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <LeadRow lead={lead} columnVisibility={columnVisibility} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

