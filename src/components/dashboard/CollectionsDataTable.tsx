/**
 * CollectionsDataTable Component
 * 
 * Displays collections in a data table format.
 * Matches the structure of MeetingsDataTable.
 */

import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import type { AllCollectionRecord } from '@/hooks/useAllCollections';
import { collectionColumns, defaultCollectionColumnVisibility } from './columns/collectionColumns';

interface CollectionsDataTableProps {
  collections: AllCollectionRecord[];
  onBulkDelete?: (payload: { ids: string[]; selectAllAcrossPages: boolean; totalCount: number }) => Promise<void> | void;
  groupCurrentPage?: number;
  groupPageSize?: number;
}

export const CollectionsDataTable = ({ 
  collections, 
  onBulkDelete,
  groupCurrentPage,
  groupPageSize,
}: CollectionsDataTableProps) => {
  const navigate = useNavigate();

  const handleRowClick = (collection: AllCollectionRecord) => {
    navigate(`/dashboard/collections/${collection.id}`);
  };

  return (
    <DataTable
      data={collections}
      columns={collectionColumns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage="לא נמצאו גבייות"
      enableColumnVisibility={true}
      enableColumnReordering={true}
      resourceKey="collections"
      initialColumnVisibility={defaultCollectionColumnVisibility}
      enableRowSelection
      totalCount={collections.length}
      onBulkDelete={onBulkDelete}
      selectionLabel="גבייות"
      groupCurrentPage={groupCurrentPage}
      groupPageSize={groupPageSize}
    />
  );
};
