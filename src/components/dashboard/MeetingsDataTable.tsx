import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { Meeting } from '@/hooks/useMeetings';
import { meetingColumns } from './columns/meetingColumns';

interface MeetingsDataTableProps {
  meetings: Meeting[];
}

export const MeetingsDataTable = ({ meetings }: MeetingsDataTableProps) => {
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
      enableColumnVisibility={false}
      enableColumnReordering={true}
      resourceKey="meetings"
    />
  );
};



