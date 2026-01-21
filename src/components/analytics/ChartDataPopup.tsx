/**
 * ChartDataPopup Component
 * 
 * Professional popup component to display detailed data when a chart element is clicked.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface ChartDataPopupItem {
  id: string;
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

interface ChartDataPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: ChartDataPopupItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  renderItem?: (item: ChartDataPopupItem) => React.ReactNode;
}

export const ChartDataPopup = ({
  open,
  onOpenChange,
  title,
  description,
  items,
  isLoading = false,
  emptyMessage = 'אין נתונים להצגה',
  renderItem,
}: ChartDataPopupProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const defaultRenderItem = (item: ChartDataPopupItem) => (
    <div
      key={item.id}
      className="flex flex-col gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-base mb-1">{item.title}</h4>
          {item.subtitle && (
            <p className="text-sm text-gray-600 mb-2">{item.subtitle}</p>
          )}
          {item.metadata && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(item.metadata).map(([key, value]) => {
                if (value === null || value === undefined || value === '') return null;
                
                let displayValue: string | React.ReactNode = String(value);
                
                // Format dates
                if (key.includes('date') || key.includes('Date') || key === 'created_at' || key === 'createdDate') {
                  try {
                    displayValue = format(parseISO(String(value)), 'dd/MM/yyyy', { locale: he });
                  } catch {
                    displayValue = String(value);
                  }
                }
                
                // Format currency
                if (key.includes('amount') || key.includes('Amount') || key.includes('price') || key.includes('Price')) {
                  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
                  if (!isNaN(numValue)) {
                    displayValue = formatCurrency(numValue);
                  }
                }
                
                return (
                  <Badge key={key} variant="secondary" className="text-xs">
                    <span className="font-medium">{key}:</span> {displayValue}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-right">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-right">{description}</DialogDescription>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#5B6FB9]" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">{emptyMessage}</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600 text-right">
                נמצאו {items.length} פריטים
              </div>
              <ScrollArea className="h-[calc(90vh-200px)] pr-4">
                <div className="space-y-3">
                  {items.map((item) => (renderItem ? renderItem(item) : defaultRenderItem(item)))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
