/**
 * AssignPageToFolderDialog Component
 * 
 * Dialog for assigning a page to a folder or moving it out of a folder.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFolders } from '@/hooks/useFolders';
import { useUpdatePageFolder } from '@/hooks/useSavedViews';
import { useToast } from '@/hooks/use-toast';
import type { SavedView } from '@/hooks/useSavedViews';

interface AssignPageToFolderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  page: SavedView;
  onSuccess?: () => void;
}

export const AssignPageToFolderDialog: React.FC<AssignPageToFolderDialogProps> = ({
  isOpen,
  onOpenChange,
  page,
  onSuccess,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(page.folder_id || null);
  const { data: folders = [] } = useFolders(page.resource_key);
  const updatePageFolder = useUpdatePageFolder();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updatePageFolder.mutateAsync({
        viewId: page.id,
        folderId: selectedFolderId === 'none' ? null : selectedFolderId,
      });
      
      toast({
        title: 'דף עודכן',
        description: selectedFolderId === 'none' 
          ? 'הדף הוסר מהתיקייה.' 
          : 'הדף הועבר לתיקייה.',
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן לעדכן את הדף. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>העבר דף לתיקייה</DialogTitle>
          <DialogDescription>
            בחר תיקייה להעברת הדף "{page.view_name}"
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Select
                value={selectedFolderId === null ? 'none' : selectedFolderId}
                onValueChange={(value) => setSelectedFolderId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תיקייה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא תיקייה</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={updatePageFolder.isPending}>
              {updatePageFolder.isPending ? 'מעדכן...' : 'שמור'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
