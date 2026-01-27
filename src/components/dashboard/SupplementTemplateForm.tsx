import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon } from 'lucide-react';
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
  const [supplementName, setSupplementName] = useState('');
  const [link1, setLink1] = useState('');
  const [link2, setLink2] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description || '');
      if (initialData.supplements && initialData.supplements.length > 0) {
        const s = initialData.supplements[0];
        setSupplementName(s.name || '');
        setLink1(s.link1 || '');
        setLink2(s.link2 || '');
      } else {
        setSupplementName(initialData.name || '');
      }
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const supplement: Supplement = {
        name: supplementName,
        dosage: '',
        timing: '',
        link1,
        link2
      };

      const data = {
        name: supplementName,
        description,
        supplements: [supplement],
      };
      onSave(data);
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" dir="rtl">
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div className="px-6 py-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">שם התוסף</Label>
            <Input
              value={supplementName}
              onChange={(e) => setSupplementName(e.target.value)}
              placeholder="שם התוסף"
              className="bg-white"
              dir="rtl"
              required
            />
          </div>

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
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 flex gap-3 flex-shrink-0" dir="rtl">
        <Button
          type="submit"
          className="h-10 text-sm bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white rounded-lg font-medium px-8 min-w-[100px]"
          disabled={isSubmitting || !supplementName.trim()}
        >
          {isSubmitting ? 'שומר...' : 'שמור תוסף'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-10 text-sm rounded-lg font-medium px-6 text-slate-600 hover:text-slate-800"
        >
          ביטול
        </Button>
      </div>
    </form>
  );
};
