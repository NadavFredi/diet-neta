import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface TemplateColumnVisibility {
  name: boolean;
  description: boolean;
  tags: boolean;
  connectedLeads: boolean;
  createdDate: boolean;
  actions: boolean;
}

export const TEMPLATE_COLUMN_ORDER: Array<keyof TemplateColumnVisibility> = [
  'name',
  'description',
  'tags',
  'connectedLeads',
  'createdDate',
  'actions',
];

const getColumnLabel = (key: keyof TemplateColumnVisibility): string => {
  const labels: Record<keyof TemplateColumnVisibility, string> = {
    name: 'שם התוכנית',
    description: 'תיאור',
    tags: 'תגיות',
    connectedLeads: 'לידים מחוברים',
    createdDate: 'תאריך יצירה',
    actions: 'פעולות',
  };
  return labels[key];
};

interface TemplateColumnSettingsProps {
  columnVisibility: TemplateColumnVisibility;
  onToggleColumn: (key: keyof TemplateColumnVisibility) => void;
}

export const TemplateColumnSettings = ({
  columnVisibility,
  onToggleColumn,
}: TemplateColumnSettingsProps) => {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">הצגת עמודות</h4>
      <div className="space-y-3">
        {TEMPLATE_COLUMN_ORDER.map((key) => (
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














