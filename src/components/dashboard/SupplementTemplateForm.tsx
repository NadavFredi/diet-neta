import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupplementTemplate } from '@/hooks/useSupplementTemplates';
import type { Supplement } from '@/store/slices/budgetSlice';

interface SupplementTemplateFormProps {
  initialData?: SupplementTemplate;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const SupplementTemplateForm = ({
  initialData,
  onSave,
  onCancel,
}: SupplementTemplateFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setSupplements(initialData.supplements || []);
    }
  }, [initialData]);

  const addSupplement = () => {
    setSupplements([...supplements, { name: '', dosage: '', timing: '', link1: '', link2: '' }]);
  };

  const removeSupplement = (index: number) => {
    setSupplements(supplements.filter((_, i) => i !== index));
  };

  const updateSupplement = (index: number, field: keyof Supplement, value: string) => {
    const updated = [...supplements];
    updated[index] = { ...updated[index], [field]: value };
    setSupplements(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Auto-generate name from first supplement if not provided
      const generatedName = name.trim() || (supplements.length > 0 ? supplements[0].name : 'תוסף חדש');
      
      const data = {
        name: generatedName,
        description,
        supplements: supplements.filter(s => s.name.trim() !== ''),
      };
      onSave(data);
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" dir="rtl">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-slate-50/50 min-h-0">
        <div className="grid grid-cols-1 gap-4 mb-4">
          <Card className="bg-white border-0 shadow-sm rounded-xl">
            <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">רשימת תוספים</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addSupplement}
                className="text-[#5B6FB9] hover:text-[#5B6FB9]/80 hover:bg-[#5B6FB9]/10"
              >
                <Plus className="h-4 w-4 ml-1" />
                הוסף תוסף
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {supplements.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-400">אין תוספים ברשימה</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supplements.map((supplement, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">שם התוסף</Label>
                            <Input
                              value={supplement.name}
                              onChange={(e) => updateSupplement(index, 'name', e.target.value)}
                              placeholder="שם התוסף"
                              className="h-8 bg-white border-0 text-sm"
                              dir="rtl"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSupplement(index)}
                          className="h-8 w-8 mt-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-200/50">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500 flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            קישור 1
                          </Label>
                          <Input
                            value={supplement.link1 || ''}
                            onChange={(e) => updateSupplement(index, 'link1', e.target.value)}
                            placeholder="https://..."
                            className="h-8 bg-white border-0 text-sm text-left"
                            dir="ltr"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500 flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            קישור 2
                          </Label>
                          <Input
                            value={supplement.link2 || ''}
                            onChange={(e) => updateSupplement(index, 'link2', e.target.value)}
                            placeholder="https://..."
                            className="h-8 bg-white border-0 text-sm text-left"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="border-t bg-white px-4 py-3 flex gap-3 flex-shrink-0" dir="rtl">
          <Button
            type="submit"
            className="h-9 text-sm bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-3xl font-semibold px-6"
            disabled={isSubmitting || supplements.length === 0}
          >
            {isSubmitting ? 'שומר...' : 'שמור תוסף'}
          </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-9 text-sm rounded-3xl font-semibold px-6"
        >
          ביטול
        </Button>
      </div>
    </form>
  );
};
