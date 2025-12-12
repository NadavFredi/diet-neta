import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getColumnLabel, COLUMN_ORDER } from '@/utils/dashboard';
import type { ColumnVisibility } from '@/utils/dashboard';

interface ColumnSettingsProps {
  columnVisibility: ColumnVisibility;
  onToggleColumn: (key: keyof ColumnVisibility) => void;
}

export const ColumnSettings = ({
  columnVisibility,
  onToggleColumn,
}: ColumnSettingsProps) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">הצגת עמודות</h4>
      <div className="space-y-3">
        {COLUMN_ORDER.map((key) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              id={key}
              checked={columnVisibility[key]}
              onCheckedChange={() => onToggleColumn(key)}
            />
            <Label
              htmlFor={key}
              className="text-sm font-normal cursor-pointer flex-1"
            >
              {getColumnLabel(key)}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};





