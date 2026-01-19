/**
 * Dialog for editing interface icon
 */

import {
  Dialog,
  DialogContent,
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
      <DialogContent className="sm:max-w-[480px] !grid grid-rows-[auto_1fr_auto] max-h-[75vh] p-4" dir="rtl" onInteractOutside={(e) => {
        if (updatePreference.isPending) {
          e.preventDefault();
        }
      }}>
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="text-base">ערוך אייקון ממשק</DialogTitle>
        </DialogHeader>
        
        {/* Scrollable icon picker area */}
        <div className="overflow-hidden py-2 min-h-0">
          <IconPicker
            selectedIconName={selectedIconName}
            resourceKey={interfaceKey}
            onIconSelect={setSelectedIconName}
          />
        </div>

        {/* Sticky footer */}
        <DialogFooter className="flex-shrink-0 border-t pt-3 mt-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedIconName || updatePreference.isPending}
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
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


