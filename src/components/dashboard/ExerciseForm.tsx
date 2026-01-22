import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [repetitions, setRepetitions] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [image, setImage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setRepetitions(initialData.repetitions ?? null);
      setWeight(initialData.weight ?? null);
      setImage(initialData.image || '');
      setImagePreview(initialData.image || null);
      setVideoLink(initialData.video_link || '');
    } else {
      setName('');
      setRepetitions(null);
      setWeight(null);
      setImage('');
      setImagePreview(null);
      setVideoLink('');
    }
  }, [initialData]);

  const handleImageFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר קובץ תמונה תקין',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'קובץ גדול מדי',
        description: 'גודל הקובץ לא יכול לעלות על 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      
      // For new exercises, use temp path. For existing, use exercise ID
      const exerciseId = initialData?.id || `temp-${timestamp}`;
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `exercises/${exerciseId}/images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'שגיאה בהעלאת התמונה');
      }

      // Generate signed URL (valid for 1 year) since bucket is private
      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(filePath, 31536000); // 1 year expiration

      if (urlError) {
        throw new Error(urlError.message || 'לא ניתן לקבל קישור לתמונה');
      }

      if (urlData?.signedUrl) {
        setImage(urlData.signedUrl);
        setImagePreview(urlData.signedUrl);
        toast({
          title: 'הצלחה',
          description: 'התמונה הועלתה בהצלחה',
        });
      } else {
        throw new Error('לא ניתן לקבל קישור לתמונה');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'שגיאה בהעלאת התמונה';
      toast({
        title: 'שגיאה',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingImage(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setImage('');
    setImagePreview(null);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = '';
    }
  };

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
            תמונה
          </Label>
          <div className="space-y-2">
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="תצוגה מקדימה"
                  className="w-full h-48 object-cover rounded-lg border border-gray-300"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="absolute top-2 left-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">אין תמונה</p>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                ref={imageFileInputRef}
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                disabled={isUploadingImage}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => imageFileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="flex-1"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    מעלה...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {imagePreview ? 'החלף תמונה' : 'העלה תמונה'}
                  </>
                )}
              </Button>
              {imagePreview && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveImage}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  הסר תמונה
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">גודל מקסימלי: 10MB. פורמטים נתמכים: JPG, PNG, GIF, WebP</p>
          </div>
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
