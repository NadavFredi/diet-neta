import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateSavedView, type FilterConfig } from '@/hooks/useSavedViews';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SaveViewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  resourceKey: string;
  filterConfig: FilterConfig;
  onSuccess?: () => void;
}

export const SaveViewModal = ({
  isOpen,
  onOpenChange,
  resourceKey,
  filterConfig,
  onSuccess,
}: SaveViewModalProps) => {
  const [viewName, setViewName] = useState('');
  const createView = useCreateSavedView();
  const { toast } = useToast();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setViewName('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!viewName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן שם לתצוגה',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Saving view with:', { resourceKey, viewName: viewName.trim(), filterConfig });
      
      await createView.mutateAsync({
        resourceKey,
        viewName: viewName.trim(),
        filterConfig,
        isDefault: false, // Always false - default view is always the one with all filters and columns
      });
      
      toast({
        title: 'הצלחה',
        description: 'התצוגה נשמרה בהצלחה',
      });
      
      setViewName('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to save view:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת התצוגה. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && !createView.isPending) {
      setViewName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl" onInteractOutside={(e) => {
        if (createView.isPending) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>שמור תצוגה חדשה</DialogTitle>
          <DialogDescription>
            שמור את המסננים וההגדרות הנוכחיים כתצוגה מותאמת אישית
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="view-name">שם התצוגה</Label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="לדוגמה: לידים חדשים"
                disabled={createView.isPending}
                dir="rtl"
                className="text-right"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!viewName.trim() || createView.isPending}
            >
              {createView.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              שמור
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={createView.isPending}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

