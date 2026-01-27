import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { Meeting } from '@/hooks/useMeetings';
import { meetingColumns, defaultMeetingColumnVisibility } from './columns/meetingColumns';

interface MeetingsDataTableProps {
  meetings: Meeting[];
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
  onSortChange?: (columnId: string, sortOrder: 'ASC' | 'DESC') => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  groupCurrentPage?: number;
  groupPageSize?: number;
}

export const MeetingsDataTable = ({ 
  meetings, 
  onBulkDelete,
  onSortChange,
  sortBy,
  sortOrder,
  groupCurrentPage,
  groupPageSize,
}: MeetingsDataTableProps) => {
  const navigate = useNavigate();

  const handleRowClick = (meeting: Meeting) => {
    navigate(`/dashboard/meetings/${meeting.id}`);
  };

  return (
    <DataTable
      data={meetings}
      columns={meetingColumns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage="לא נמצאו פגישות"
      enableColumnVisibility={true}
      enableColumnReordering={true}
      resourceKey="meetings"
      initialColumnVisibility={defaultMeetingColumnVisibility}
      enableRowSelection
      totalCount={meetings.length}
      onBulkDelete={onBulkDelete}
      selectionLabel="פגישות"
      groupCurrentPage={groupCurrentPage}
      groupPageSize={groupPageSize}
      onSortChange={onSortChange}
      serverSideSorting={!!onSortChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
    />
  );
};




