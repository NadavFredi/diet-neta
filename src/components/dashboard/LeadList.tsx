import type { Lead } from '@/store/slices/dashboardSlice';
import { LeadRow } from './LeadRow';
import type { ColumnVisibility } from '@/utils/dashboard';

interface LeadListProps {
  leads: Lead[];
  columnVisibility: ColumnVisibility;
}

export const LeadList = ({ leads, columnVisibility }: LeadListProps) => {
  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        לא נמצאו תוצאות
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <LeadRow key={lead.id} lead={lead} columnVisibility={columnVisibility} />
      ))}
    </div>
  );
};

