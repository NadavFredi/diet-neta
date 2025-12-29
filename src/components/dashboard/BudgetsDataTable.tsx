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
import type { BudgetColumnVisibility } from '@/pages/BudgetManagement';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAppSelector } from '@/store/hooks';

interface BudgetsDataTableProps {
  budgets: Budget[];
  columnVisibility: BudgetColumnVisibility;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  onExportPDF?: (budget: Budget) => void;
  onSendWhatsApp?: (budget: Budget) => void;
}

const budgetColumns = [
  {
    id: 'name',
    header: 'שם',
    accessorKey: 'name',
  },
  {
    id: 'description',
    header: 'תיאור',
    accessorKey: 'description',
    cell: ({ row }: { row: any }) => {
      const desc = row.original.description;
      return desc ? <span className="text-sm text-gray-600">{desc}</span> : <span className="text-gray-400">—</span>;
    },
  },
  {
    id: 'steps_goal',
    header: 'יעד צעדים',
    accessorKey: 'steps_goal',
    cell: ({ row }: { row: any }) => {
      const goal = row.original.steps_goal;
      return goal ? <span className="text-sm font-medium">{goal.toLocaleString()}</span> : <span className="text-gray-400">—</span>;
    },
  },
  {
    id: 'createdDate',
    header: 'תאריך יצירה',
    accessorKey: 'created_at',
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
    cell: () => null, // Will be overridden
  },
];

export const BudgetsDataTable = ({
  budgets,
  columnVisibility,
  onEdit,
  onDelete,
  onExportPDF,
  onSendWhatsApp,
}: BudgetsDataTableProps) => {
  const { generatingPDF, sendingWhatsApp } = useAppSelector((state) => state.budget);
  
  const columns = useMemo(() => {
    return budgetColumns
      .filter((col) => {
        if (col.id === 'actions') return true;
        return columnVisibility[col.id as keyof BudgetColumnVisibility];
      })
      .map((col) => {
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
  }, [onEdit, onDelete, onExportPDF, onSendWhatsApp, columnVisibility, generatingPDF, sendingWhatsApp]);

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
    />
  );
};

