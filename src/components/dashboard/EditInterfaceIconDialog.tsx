/**
 * Dialog for editing interface icon
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUpdateInterfaceIconPreference } from '@/hooks/useInterfaceIconPreferences';
import { IconPicker } from './IconPicker';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

interface EditInterfaceIconDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceKey: string;
  interfaceLabel: string;
  currentIconName?: string | null;
  onSuccess?: () => void;
}

export const EditInterfaceIconDialog = ({
  isOpen,
  onOpenChange,
  interfaceKey,
  interfaceLabel,
  currentIconName,
  onSuccess,
}: EditInterfaceIconDialogProps) => {
  const updatePreference = useUpdateInterfaceIconPreference();
  const { toast } = useToast();
  const [selectedIconName, setSelectedIconName] = React.useState<string | null>(currentIconName || null);

  // Reset selected icon when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIconName(currentIconName || null);
    }
  }, [isOpen, currentIconName]);

  const handleSave = async () => {
    if (!selectedIconName) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר אייקון',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updatePreference.mutateAsync({
        interfaceKey,
        iconName: selectedIconName,
      });

      toast({
        title: 'הצלחה',
        description: 'האייקון עודכן בהצלחה',
      });

      onOpenChange(false);
        onSuccess?.();
    } catch (error: any) {
      console.error('Failed to update interface icon:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון האייקון. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && !updatePreference.isPending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl" onInteractOutside={(e) => {
        if (updatePreference.isPending) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>ערוך אייקון ממשק - {interfaceLabel}</DialogTitle>
          <DialogDescription>
            בחר אייקון חדש לממשק הראשי. האייקון יוצג בכל הדפים והתצוגות של ממשק זה (בתפריט הצד ובכותרת הדף)
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <IconPicker
            selectedIconName={selectedIconName}
            resourceKey={interfaceKey}
            onIconSelect={setSelectedIconName}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedIconName || updatePreference.isPending}
          >
            {updatePreference.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            שמור
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={updatePreference.isPending}
          >
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
