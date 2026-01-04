/**
 * CardHeaderWithActions Component
 * 
 * Reusable card header with icon, title, and save/cancel buttons.
 * Shows buttons when any field in the card is being edited.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface CardHeaderWithActionsProps {
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  title: string;
  isEditing: boolean;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}

export const CardHeaderWithActions: React.FC<CardHeaderWithActionsProps> = ({
  icon: Icon,
  iconBgColor,
  iconColor,
  title,
  isEditing,
  onSave,
  onCancel,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2 mb-4 pb-3 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBgColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {isEditing && (
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
          <Button
            onClick={onSave}
            size="sm"
            className="h-9 sm:h-8 px-4 sm:px-3 text-xs sm:text-xs touch-manipulation"
          >
            <Save className="h-3.5 w-3.5 sm:h-3 sm:w-3 ml-1.5 sm:ml-1" />
            שמור
          </Button>
          <Button
            onClick={onCancel}
            size="sm"
            variant="outline"
            className="h-9 sm:h-8 px-4 sm:px-3 text-xs sm:text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground touch-manipulation"
          >
            <X className="h-3.5 w-3.5 sm:h-3 sm:w-3 ml-1.5 sm:ml-1" />
            ביטול
          </Button>
        </div>
      )}
    </div>
  );
};

