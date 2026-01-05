import { useMemo } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import type { Budget } from '@/store/slices/budgetSlice';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, FileText, Send, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAppSelector } from '@/store/hooks';
import type { DataTableColumn } from '@/components/ui/DataTable';

interface BudgetsDataTableProps {
  budgets: Budget[];
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  onExportPDF?: (budget: Budget) => void;
  onSendWhatsApp?: (budget: Budget) => void;
}

export const budgetColumns: DataTableColumn<Budget>[] = [
  {
    id: 'name',
    header: 'שם',
    accessorKey: 'name',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
  },
  {
    id: 'description',
    header: 'תיאור',
    accessorKey: 'description',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const desc = row.original.description;
      return desc ? <span className="text-sm text-gray-600 truncate block max-w-[200px]" title={desc}>{desc}</span> : <span className="text-gray-400">—</span>;
    },
  },
  {
    id: 'workout_template',
    header: 'תכנית אימונים',
    accessorKey: 'workout_template_id',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const templateId = row.original.workout_template_id;
      const templateName = row.original.workout_template?.name;
      return templateId ? (
        <span className="text-sm text-gray-700">{templateName || 'תכנית אימונים'}</span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    id: 'nutrition_template',
    header: 'תבנית תזונה',
    accessorKey: 'nutrition_template_id',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const templateId = row.original.nutrition_template_id;
      const templateName = row.original.nutrition_template?.name;
      return templateId ? (
        <span className="text-sm text-gray-700">{templateName || 'תבנית תזונה'}</span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    id: 'nutrition_targets',
    header: 'יעדי תזונה',
    accessorKey: 'nutrition_targets',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const targets = row.original.nutrition_targets;
      if (!targets || !targets.calories) return <span className="text-gray-400">—</span>;
      return (
        <div className="text-xs text-gray-700 space-y-0.5">
          <div>קלוריות: {targets.calories}</div>
          <div>חלבון: {targets.protein}ג | פחמימות: {targets.carbs}ג | שומן: {targets.fat}ג</div>
        </div>
      );
    },
  },
  {
    id: 'supplements',
    header: 'תוספים',
    accessorKey: 'supplements',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const supplements = row.original.supplements || [];
      if (supplements.length === 0) return <span className="text-gray-400">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {supplements.slice(0, 2).map((sup: any, idx: number) => (
            <span key={idx} className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">
              {sup.name || sup}
            </span>
          ))}
          {supplements.length > 2 && (
            <span className="text-xs text-gray-500">+{supplements.length - 2}</span>
          )}
        </div>
      );
    },
  },
  {
    id: 'eating_order',
    header: 'סדר אכילה',
    accessorKey: 'eating_order',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const order = row.original.eating_order;
      return order ? (
        <span className="text-xs text-gray-700 truncate block max-w-[200px]" title={order}>{order}</span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    id: 'eating_rules',
    header: 'כללי אכילה',
    accessorKey: 'eating_rules',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const rules = row.original.eating_rules;
      return rules ? (
        <span className="text-xs text-gray-700 truncate block max-w-[200px]" title={rules}>{rules}</span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    id: 'steps_goal',
    header: 'יעד צעדים',
    accessorKey: 'steps_goal',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const goal = row.original.steps_goal;
      return goal ? <span className="text-sm font-medium">{goal.toLocaleString()}</span> : <span className="text-gray-400">—</span>;
    },
  },
  {
    id: 'steps_instructions',
    header: 'הוראות צעדים',
    accessorKey: 'steps_instructions',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const instructions = row.original.steps_instructions;
      return instructions ? (
        <span className="text-xs text-gray-700 truncate block max-w-[200px]" title={instructions}>{instructions}</span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    id: 'createdDate',
    header: 'תאריך יצירה',
    accessorKey: 'created_at',
    enableSorting: true,
    enableResizing: true,
    enableHiding: true,
    cell: ({ row }: { row: any }) => {
      const date = row.original.created_at;
      return date ? (
        <span className="text-sm text-gray-600">
          {format(new Date(date), 'd MMM yyyy', { locale: he })}
        </span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    id: 'actions',
    header: 'פעולות',
    accessorKey: 'id',
    enableSorting: false,
    enableResizing: true,
    enableHiding: true,
    cell: () => null, // Will be overridden
  },
];

export const BudgetsDataTable = ({
  budgets,
  onEdit,
  onDelete,
  onExportPDF,
  onSendWhatsApp,
}: BudgetsDataTableProps) => {
  const { generatingPDF, sendingWhatsApp } = useAppSelector((state) => state.budget);
  
  const columns = useMemo(() => {
    return budgetColumns.map((col) => {
        if (col.id === 'actions') {
          return {
            ...col,
            cell: ({ row }: { row: any }) => {
              const budget = row.original;
              const isGeneratingPDF = generatingPDF[budget.id] || false;
              const isSending = sendingWhatsApp[budget.id] || false;
              
              return (
                <TooltipProvider>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {onExportPDF && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExportPDF(budget);
                            }}
                            disabled={isGeneratingPDF || isSending}
                            className="hover:bg-purple-50 hover:text-purple-600"
                          >
                            {isGeneratingPDF ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>ייצא PDF</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {onSendWhatsApp && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendWhatsApp(budget);
                            }}
                            disabled={isGeneratingPDF || isSending}
                            className="hover:bg-green-50 hover:text-green-600"
                          >
                            {isSending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>שלח תקציב</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(budget);
                          }}
                          disabled={isGeneratingPDF || isSending}
                          className="hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>ערוך</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(budget);
                          }}
                          disabled={isGeneratingPDF || isSending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>מחק</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              );
            },
          };
        }
        return col;
      });
  }, [onEdit, onDelete, onExportPDF, onSendWhatsApp, generatingPDF, sendingWhatsApp]);

  const handleRowClick = (budget: Budget) => {
    onEdit(budget);
  };

  return (
    <DataTable
      data={budgets}
      columns={columns}
      onRowClick={handleRowClick}
      dir="rtl"
      emptyMessage={
        budgets.length === 0
          ? 'אין תקציבים. צור תקציב חדש כדי להתחיל'
          : 'לא נמצאו תקציבים התואמים לחיפוש'
      }
      enableColumnVisibility={false}
      enableColumnReordering={true}
      resourceKey="budgets"
    />
  );
};

