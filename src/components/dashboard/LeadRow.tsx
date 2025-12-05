import type { Lead } from '@/store/slices/dashboardSlice';
import { formatDate, COLUMN_ORDER } from '@/utils/dashboard';
import type { ColumnVisibility } from '@/utils/dashboard';

interface LeadRowProps {
  lead: Lead;
  columnVisibility: ColumnVisibility;
}

export const LeadRow = ({ lead, columnVisibility }: LeadRowProps) => {
  const visibleColumns = COLUMN_ORDER.filter((col) => columnVisibility[col]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'חדש':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'בטיפול':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'הושלם':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-7 py-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
          gap: '1.25rem',
        }}
      >
        {visibleColumns.map((col) => {
          if (!columnVisibility[col]) return null;
          return (
            <div key={col} className="text-sm text-gray-700 text-right">
              {col === 'id' && (
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                  {lead.id}
                </span>
              )}
              {col === 'name' && (
                <span className="font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                  {lead.name}
                </span>
              )}
              {col === 'createdDate' && (
                <span className="text-gray-700">{formatDate(lead.createdDate)}</span>
              )}
              {col === 'status' && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              )}
              {col === 'phone' && (
                <span className="text-gray-700 font-mono text-sm">{lead.phone}</span>
              )}
              {col === 'email' && (
                <span className="text-gray-700 hover:text-blue-600 transition-colors text-sm">{lead.email}</span>
              )}
              {col === 'source' && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                  {lead.source}
                </span>
              )}
              {col === 'age' && (
                <span className="text-gray-700">{lead.age} שנים</span>
              )}
              {col === 'height' && (
                <span className="text-gray-700">{lead.height} ס"מ</span>
              )}
              {col === 'weight' && (
                <span className="text-gray-700 font-semibold">{lead.weight} ק"ג</span>
              )}
              {col === 'fitnessGoal' && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                  {lead.fitnessGoal}
                </span>
              )}
              {col === 'activityLevel' && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
                  {lead.activityLevel}
                </span>
              )}
              {col === 'preferredTime' && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                  {lead.preferredTime}
                </span>
              )}
              {col === 'notes' && lead.notes && (
                <span className="text-gray-600 text-xs italic" title={lead.notes}>
                  {lead.notes.length > 30 ? `${lead.notes.substring(0, 30)}...` : lead.notes}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

