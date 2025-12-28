import { useMemo } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import type { NutritionTemplate } from '@/hooks/useNutritionTemplates';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { TemplateColumnVisibility } from './TemplateColumnSettings';
import { nutritionTemplateColumns } from './columns/templateColumns';

interface NutritionTemplatesDataTableProps {
  templates: NutritionTemplate[];
  columnVisibility: TemplateColumnVisibility;
  onEdit: (template: NutritionTemplate) => void;
  onDelete: (template: NutritionTemplate) => void;
}

export const NutritionTemplatesDataTable = ({
  templates,
  columnVisibility,
  onEdit,
  onDelete,
  enableColumnVisibility = true,
}: NutritionTemplatesDataTableProps) => {
  // CRITICAL: Pass ALL columns from schema to DataTable
  // This ensures the column visibility popover shows ALL available Nutrition Template columns
  // DataTable will filter visible columns internally
  const columns = useMemo(() => {
    return nutritionTemplateColumns.map((col) => {
      // Add actions cell renderer if this is the actions column
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const template = row.original;
            return (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(template);
                  }}
                  className="hover:bg-blue-50"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(template);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          },
        };
      }
      return col;
    });
  }, [onEdit, onDelete]);

  const handleRowClick = (template: NutritionTemplate) => {
    onEdit(template);
  };

  return (
    <DataTable
      data={templates}
      columns={columns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage={
        templates.length === 0
          ? 'אין תבניות. צור תבנית חדשה כדי להתחיל'
          : 'לא נמצאו תבניות התואמות לחיפוש'
      }
      enableColumnVisibility={false}
      enableColumnReordering={true}
      resourceKey="nutrition_templates"
    />
  );
};


