/**
 * CreateFolderDialog Component
 * 
 * Dialog for creating a new folder under an interface.
 */

import React, { useState } from 'react';
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
import { useCreateFolder } from '@/hooks/useFolders';
import { useToast } from '@/hooks/use-toast';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceKey: string;
  onSuccess?: () => void;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  isOpen,
  onOpenChange,
  interfaceKey,
  onSuccess,
}) => {
  const [folderName, setFolderName] = useState('');
  const createFolder = useCreateFolder();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא הכנס שם תיקייה.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createFolder.mutateAsync({
        name: folderName.trim(),
        interfaceKey,
      });
      
      toast({
        title: 'תיקייה נוצרה',
        description: `תיקייה "${folderName.trim()}" נוצרה בהצלחה.`,
      });
      
      setFolderName('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן ליצור תיקייה. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>צור תיקייה חדשה</DialogTitle>
          <DialogDescription>
            הכנס שם לתיקייה החדשה
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">שם התיקייה</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="הכנס שם תיקייה"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFolderName('');
                onOpenChange(false);
              }}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={createFolder.isPending}>
              {createFolder.isPending ? 'יוצר...' : 'צור'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
