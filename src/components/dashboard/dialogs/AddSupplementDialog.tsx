import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Plus } from 'lucide-react';
import type { Supplement } from '@/store/slices/budgetSlice';
import { useCreateSupplementTemplate } from '@/hooks/useSupplementTemplates';
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
  supplementTemplates = [],
}: AddSupplementDialogProps) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [timing, setTiming] = useState('');
  const [link1, setLink1] = useState('');
  const [link2, setLink2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedSupplementName, setSelectedSupplementName] = useState<string>('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  
  const { toast } = useToast();
  const createSupplementTemplate = useCreateSupplementTemplate();

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
      } else {
        // Reset form when opening for new supplement
        setName('');
        setDosage('');
        setTiming('');
        setLink1('');
        setLink2('');
        setSelectedTemplateId('');
        setSelectedSupplementName('');
        setShowCreateNew(false);
      }
    }
  }, [initialData, isOpen]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = supplementTemplates.find(t => t.id === templateId);
    if (template && template.supplements && template.supplements.length > 0) {
      const sup = template.supplements[0];
      setName(sup.name || '');
      setDosage(sup.dosage || '');
      setTiming(sup.timing || '');
      setLink1(sup.link1 || '');
      setLink2(sup.link2 || '');
    }
  };

  const handleSupplementSelect = (supplementName: string) => {
    if (!supplementName) {
      setSelectedSupplementName('');
      setShowCreateNew(false);
      return;
    }
    
    setSelectedSupplementName(supplementName);
    const supplement = allSupplements.find(s => s.name === supplementName);
    if (supplement) {
      setName(supplement.name || '');
      setDosage(supplement.dosage || '');
      setTiming(supplement.timing || '');
      setLink1(supplement.link1 || '');
      setLink2(supplement.link2 || '');
      setShowCreateNew(false);
    } else {
      // Supplement not found - show option to create new
      setShowCreateNew(true);
    }
  };

  const handleCreateNewSupplementTemplate = async () => {
    if (!name.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן שם תוסף',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createSupplementTemplate.mutateAsync({
        name: `תבנית: ${name.trim()}`,
        supplements: [{
          name: name.trim(),
          dosage: dosage.trim(),
          timing: timing.trim(),
          link1: link1.trim() || undefined,
          link2: link2.trim() || undefined,
        }],
        is_public: false,
      });
      
      toast({
        title: 'הצלחה',
        description: 'תבנית תוסף חדשה נוצרה',
      });
      
      setShowCreateNew(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל ביצירת תבנית תוסף',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const supplement: Supplement = {
        name: name.trim(),
        dosage: dosage.trim(),
        timing: timing.trim(),
        link1: link1.trim() || undefined,
        link2: link2.trim() || undefined,
      };
      onSave(supplement);
      // Reset form after saving
      setName('');
      setDosage('');
      setTiming('');
      setLink1('');
      setLink2('');
      setSelectedTemplateId('');
      setSelectedSupplementName('');
      setShowCreateNew(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving supplement:', error);
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
    setSelectedTemplateId('');
    setSelectedSupplementName('');
    setShowCreateNew(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-xl" dir="rtl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{initialData ? 'ערוך תוסף' : 'הוסף תוסף'}</DialogTitle>
          <DialogDescription className="sr-only">
            {initialData ? 'עריכת תוסף קיים' : 'טופס להוספת תוסף חדש'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
            <div className="px-6 py-6 space-y-4">
              {/* Supplement Selection - PRIMARY METHOD */}
              {!initialData && allSupplements.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">בחר תוסף מהרשימה *</Label>
                  <select
                    value={selectedSupplementName}
                    onChange={(e) => handleSupplementSelect(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] focus:border-[#5B6FB9]"
                    dir="rtl"
                    required={!initialData}
                  >
                    <option value="">-- בחר תוסף --</option>
                    {allSupplements.map((sup, idx) => (
                      <option key={`${sup.name}-${idx}`} value={sup.name}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                  {showCreateNew && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-800 mb-2">התוסף לא נמצא ברשימה</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCreateNewSupplementTemplate}
                        disabled={createSupplementTemplate.isPending || !name.trim()}
                        className="w-full text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        <Plus className="h-3 w-3 ml-1" />
                        {createSupplementTemplate.isPending ? 'יוצר...' : 'צור תוסף חדש ברשימה'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Supplement Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">שם התוסף *</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (selectedSupplementName && e.target.value !== selectedSupplementName) {
                      setSelectedSupplementName('');
                      setShowCreateNew(false);
                    }
                  }}
                  placeholder="שם התוסף"
                  className="bg-white"
                  dir="rtl"
                  required
                  disabled={!!selectedSupplementName && !showCreateNew}
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
