import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link as LinkIcon, Plus } from 'lucide-react';
import type { Supplement } from '@/store/slices/budgetSlice';
import { useSupplementTemplates, useCreateSupplementTemplate } from '@/hooks/useSupplementTemplates';
import { useToast } from '@/hooks/use-toast';

interface AddSupplementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (supplement: Supplement) => void;
  initialData?: Supplement | null;
  supplementTemplates?: Array<{ id: string; name: string; supplements: Supplement[] }>;
}

export const AddSupplementDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
  supplementTemplates: propSupplementTemplates = [],
}: AddSupplementDialogProps) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [timing, setTiming] = useState('');
  const [link1, setLink1] = useState('');
  const [link2, setLink2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSupplementName, setSelectedSupplementName] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [shouldCreateInInterface, setShouldCreateInInterface] = useState(true);
  
  const { toast } = useToast();
  const createSupplementTemplate = useCreateSupplementTemplate();

  // Fetch supplement templates from the supplements interface
  const { data: fetchedTemplatesData } = useSupplementTemplates();
  const fetchedTemplates = fetchedTemplatesData?.data || [];
  
  // Use fetched templates if available, otherwise fall back to prop templates
  const supplementTemplates = fetchedTemplates.length > 0 ? fetchedTemplates : propSupplementTemplates;

  // Extract all individual supplements from templates and get unique supplements by name
  const allSupplements = useMemo(() => {
    const supplementsMap = new Map<string, Supplement>();
    supplementTemplates.forEach(template => {
      (template.supplements || []).forEach(sup => {
        if (sup.name && !supplementsMap.has(sup.name)) {
          supplementsMap.set(sup.name, sup);
        }
      });
    });
    return Array.from(supplementsMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [supplementTemplates]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setDosage(initialData.dosage || '');
        setTiming(initialData.timing || '');
        setLink1(initialData.link1 || '');
        setLink2(initialData.link2 || '');
        setSelectedSupplementName('');
        setIsCreatingNew(false);
      } else {
        // Reset form when opening for new supplement
        setName('');
        setDosage('');
        setTiming('');
        setLink1('');
        setLink2('');
        setSelectedSupplementName('');
        setIsCreatingNew(false);
        setShouldCreateInInterface(true);
      }
    }
  }, [initialData, isOpen]);

  const handleSupplementSelect = (supplementName: string) => {
    if (!supplementName) {
      setSelectedSupplementName('');
      setIsCreatingNew(false);
      setName('');
      setDosage('');
      setTiming('');
      setLink1('');
      setLink2('');
      return;
    }
    
    setSelectedSupplementName(supplementName);
    setIsCreatingNew(false);
    const supplement = allSupplements.find(s => s.name === supplementName);
    if (supplement) {
      setName(supplement.name || '');
      setDosage(supplement.dosage || '');
      setTiming(supplement.timing || '');
      setLink1(supplement.link1 || '');
      setLink2(supplement.link2 || '');
    }
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedSupplementName('');
    setName('');
    setDosage('');
    setTiming('');
    setLink1('');
    setLink2('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent form

    // Validate name
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן שם תוסף',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare supplement object
      const supplement: Supplement = {
        name: trimmedName,
        dosage: dosage.trim() || '',
        timing: timing.trim() || '',
        link1: link1.trim() || undefined,
        link2: link2.trim() || undefined,
      };

      // Save to action plan first - this is critical and must succeed
      try {
        onSave(supplement);
      } catch (saveError: any) {
        throw saveError; // Re-throw to be caught by outer catch
      }

      // If we get here, save was successful
      // Now optionally create in supplements interface (non-blocking)
      if (isCreatingNew && shouldCreateInInterface) {
        // Fire and forget - don't block on this
        createSupplementTemplate.mutateAsync({
          name: trimmedName,
          supplements: [supplement],
          is_public: false,
        }).catch(() => {
          // Silent fail - supplement is already in action plan
        });
      }
      
      // Show success message
      toast({
        title: 'הצלחה',
        description: isCreatingNew && shouldCreateInInterface 
          ? 'התוסף נוסף לתכנית הפעולה ולממשק התוספים'
          : 'התוסף נוסף לתכנית הפעולה',
      });
      
      // Reset form
      setName('');
      setDosage('');
      setTiming('');
      setLink1('');
      setLink2('');
      setSelectedSupplementName('');
      setIsCreatingNew(false);
      
      // Close dialog after a short delay to ensure state is updated
      // Use setTimeout to allow React to process the state update first
      setTimeout(() => {
        onOpenChange(false);
      }, 200);
      
    } catch (error: any) {
      // Error handling - onSave threw an error
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בשמירת התוסף לתכנית הפעולה',
        variant: 'destructive',
      });
      // Keep dialog open so user can fix and retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form when canceling
    setName('');
    setDosage('');
    setTiming('');
    setLink1('');
    setLink2('');
    setSelectedSupplementName('');
    setIsCreatingNew(false);
    setShouldCreateInInterface(true);
    onOpenChange(false);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onOpenChange}
      modal={true}
    >
      <DialogContent 
        className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl z-[60]" 
        dir="rtl"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{initialData ? 'ערוך תוסף' : 'הוסף תוסף'}</DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? 'עריכת תוסף קיים' : 'טופס להוספת תוסף חדש'}
          </DialogDescription>
        </DialogHeader>
        <form 
          onSubmit={handleSubmit} 
          className="flex flex-col h-full min-h-0"
          onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to parent
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <div className="px-6 py-6 space-y-4">
              {/* Dropdown to select from list - Only show if not editing and there are supplements available */}
              {!initialData && allSupplements.length > 0 && !isCreatingNew && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">בחר תוסף מהרשימה</Label>
                      <Select
                        value={selectedSupplementName}
                        onValueChange={handleSupplementSelect}
                        dir="rtl"
                      >
                        <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900 hover:border-[#5B6FB9] focus:ring-[#5B6FB9]">
                          <SelectValue placeholder="-- בחר תוסף --" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] z-[70]" dir="rtl">
                          {allSupplements.map((sup, idx) => (
                            <SelectItem 
                              key={`${sup.name}-${idx}`} 
                              value={sup.name}
                              className="cursor-pointer"
                            >
                              {sup.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="text-center py-2">
                    <span className="text-sm text-slate-500">או</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateNew}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    צור תוסף חדש
                  </Button>
                </div>
              )}

              {/* Show create new button if no supplements available */}
              {!initialData && allSupplements.length === 0 && !isCreatingNew && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateNew}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  צור תוסף חדש
                </Button>
              )}

              {/* Form fields - Show when supplement is selected or creating new */}
              {(selectedSupplementName || isCreatingNew || initialData) && (
                <>
                <>
                  {/* Supplement Name */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">שם התוסף *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="שם התוסף"
                      className="bg-white"
                      dir="rtl"
                      required
                      disabled={!!selectedSupplementName && !isCreatingNew}
                    />
                  </div>

                  {/* Dosage and Timing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">מינון</Label>
                      <Input
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        placeholder="לדוגמה: 1 כמוסה"
                        className="bg-white"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700">זמן נטילה</Label>
                      <Input
                        value={timing}
                        onChange={(e) => setTiming(e.target.value)}
                        placeholder="לדוגמה: בבוקר, בערב"
                        className="bg-white"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  {/* Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <LinkIcon className="h-3.5 w-3.5 text-slate-400" />
                        קישור 1
                      </Label>
                      <Input
                        value={link1}
                        onChange={(e) => setLink1(e.target.value)}
                        placeholder="https://..."
                        className="bg-white text-left"
                        dir="ltr"
                        type="url"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                        <LinkIcon className="h-3.5 w-3.5 text-slate-400" />
                        קישור 2
                      </Label>
                      <Input
                        value={link2}
                        onChange={(e) => setLink2(e.target.value)}
                        placeholder="https://..."
                        className="bg-white text-left"
                        dir="ltr"
                        type="url"
                      />
                    </div>
                  </div>

                  {/* Option to create in supplements interface - Only show when creating new (not selected) */}
                  {!initialData && isCreatingNew && (
                    <div className="flex items-center space-x-2 space-x-reverse pt-2">
                      <input
                        type="checkbox"
                        id="createInInterface"
                        checked={shouldCreateInInterface}
                        onChange={(e) => setShouldCreateInInterface(e.target.checked)}
                        className="h-4 w-4 text-[#5B6FB9] border-slate-300 rounded focus:ring-[#5B6FB9]"
                      />
                      <Label htmlFor="createInInterface" className="text-sm text-slate-700 cursor-pointer">
                        הוסף גם לממשק התוספים (כדי שיהיה זמין בעתיד)
                      </Label>
                    </div>
                  )}
                </>
                </>
              )}
            </div>
          </div>

          <div className="px-6 pb-6 pt-2 flex gap-3 flex-shrink-0" dir="rtl">
            <Button
              type="submit"
              className="h-10 text-sm bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-lg font-medium px-8 min-w-[100px]"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'שומר...' : initialData ? 'שמור שינויים' : 'הוסף תוסף'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="h-10 text-sm rounded-lg font-medium px-6 text-slate-600 hover:text-slate-800"
            >
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
