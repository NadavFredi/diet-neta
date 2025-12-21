import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleColumnVisibility as toggleTableColumnVisibility, selectColumnVisibility, type ResourceKey } from '@/store/slices/tableStateSlice';
import type { DataTableColumn } from '@/components/ui/DataTable';

interface GenericColumnSettingsProps<T> {
  resourceKey: ResourceKey;
  columns: DataTableColumn<T>[];
  columnOrder: string[];
}

export const GenericColumnSettings = <T extends Record<string, any>>({
  resourceKey,
  columns,
  columnOrder,
}: GenericColumnSettingsProps<T>) => {
  const dispatch = useAppDispatch();
  const columnVisibility = useAppSelector((state) => selectColumnVisibility(state, resourceKey));

  const handleToggleColumn = (columnId: string) => {
    dispatch(toggleTableColumnVisibility({ resourceKey, columnId }));
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">הצגת עמודות</h4>
      <div className="space-y-3">
        {columnOrder
          .map((colId) => columns.find((col) => col.id === colId))
          .filter((col): col is DataTableColumn<T> => 
            col !== undefined && col.enableHiding !== false
          )
          .map((col) => {
            const headerText = typeof col.header === 'string' ? col.header : col.id;
            // Default to visible if not in Redux state yet
            const isVisible = columnVisibility[col.id] !== false;
            return (
              <div key={col.id} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${col.id}`}
                  checked={isVisible}
                  onCheckedChange={() => handleToggleColumn(col.id)}
                  disabled={col.enableHiding === false}
                />
                <Label
                  htmlFor={`col-${col.id}`}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {headerText}
                </Label>
              </div>
            );
          })}
      </div>
    </div>
  );
};


