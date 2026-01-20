import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { Meeting } from '@/hooks/useMeetings';
import { meetingColumns, defaultMeetingColumnVisibility } from './columns/meetingColumns';

interface MeetingsDataTableProps {
  meetings: Meeting[];
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
}

export const MeetingsDataTable = ({ meetings, onBulkDelete }: MeetingsDataTableProps) => {
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
    />
  );
};





