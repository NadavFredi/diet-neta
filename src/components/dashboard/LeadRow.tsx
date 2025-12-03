import type { Lead } from '@/store/slices/dashboardSlice';
import { formatDate, COLUMN_ORDER } from '@/utils/dashboard';
import type { ColumnVisibility } from '@/utils/dashboard';

interface LeadRowProps {
  lead: Lead;
  columnVisibility: ColumnVisibility;
}

export const LeadRow = ({ lead, columnVisibility }: LeadRowProps) => {
  const visibleColumns = COLUMN_ORDER.filter((col) => columnVisibility[col]);

  return (
    <div className="bg-[#4fc3f7] rounded-lg p-4 hover:bg-[#29b6f6] transition-colors cursor-pointer">
      <div
        className="grid gap-4 items-center"
        style={{
          gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
        }}
      >
        {visibleColumns.map((col) => {
          if (!columnVisibility[col]) return null;
          return (
            <div key={col} className="text-sm text-gray-900">
              {col === 'id' && <span className="font-medium">{lead.id}</span>}
              {col === 'name' && (
                <span className="font-medium underline">{lead.name}</span>
              )}
              {col === 'createdDate' && formatDate(lead.createdDate)}
              {col === 'status' && lead.status}
              {col === 'phone' && lead.phone}
              {col === 'email' && lead.email}
              {col === 'source' && lead.source}
            </div>
          );
        })}
      </div>
    </div>
  );
};

