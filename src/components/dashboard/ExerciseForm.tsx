import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X } from 'lucide-react';
import type { Exercise } from '@/hooks/useExercises';

interface ExerciseFormProps {
  mode: 'create' | 'edit';
  initialData?: Exercise | null;
  onSave: (data: { name: string; repetitions?: number | null; weight?: number | null; image?: string | null; video_link?: string | null }) => void;
  onCancel: () => void;
}

export const ExerciseForm = ({
  mode,
  initialData,
  onSave,
  onCancel,
}: ExerciseFormProps) => {
  const [name, setName] = useState('');
  const [repetitions, setRepetitions] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [image, setImage] = useState('');
  const [videoLink, setVideoLink] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setRepetitions(initialData.repetitions ?? null);
      setWeight(initialData.weight ?? null);
      setImage(initialData.image || '');
      setVideoLink(initialData.video_link || '');
    } else {
      setName('');
      setRepetitions(null);
      setWeight(null);
      setImage('');
      setVideoLink('');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      repetitions: repetitions || null,
      weight: weight || null,
      image: image.trim() || null,
      video_link: videoLink.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium mb-2 block">
            שם התרגיל *
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הכנס שם תרגיל"
            required
            dir="rtl"
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="repetitions" className="text-sm font-medium mb-2 block">
              חזרות
            </Label>
            <Input
              id="repetitions"
              type="number"
              min="0"
              value={repetitions ?? ''}
              onChange={(e) => setRepetitions(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="מספר חזרות"
              dir="rtl"
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="weight" className="text-sm font-medium mb-2 block">
              משקל (ק״ג)
            </Label>
            <Input
              id="weight"
              type="number"
              min="0"
              step="0.1"
              value={weight ?? ''}
              onChange={(e) => setWeight(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="משקל בק״ג"
              dir="rtl"
              className="w-full"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="image" className="text-sm font-medium mb-2 block">
            קישור לתמונה
          </Label>
          <Input
            id="image"
            type="url"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://example.com/image.jpg"
            dir="rtl"
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="video_link" className="text-sm font-medium mb-2 block">
            קישור לוידאו
          </Label>
          <Input
            id="video_link"
            type="url"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            dir="rtl"
            className="w-full"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          ביטול
        </Button>
        <Button
          type="submit"
          disabled={!name.trim()}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {mode === 'create' ? 'צור תרגיל' : 'שמור שינויים'}
        </Button>
      </div>
    </form>
  );
};
