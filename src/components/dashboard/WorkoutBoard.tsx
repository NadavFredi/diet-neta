import { useMemo, useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  Plus,
  GripVertical,
  X,
  Target,
  FileText,
  Copy,
  Zap,
  Dumbbell,
  Edit,
  Footprints,
  Image,
  Video,
  PlayCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useWorkoutBoard, DAYS } from '@/hooks/useWorkoutBoard';
import type { Exercise, WeeklyWorkout } from '@/components/dashboard/WeeklyWorkoutBuilder';
import { SelectExerciseFromDatabase } from './SelectExerciseFromDatabase';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';

interface WorkoutBoardProps {
  mode: 'user' | 'template';
  initialData?: any;
  leadId?: string; // DEPRECATED: Use customerId instead
  customerId?: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}

interface ExerciseCardProps {
  exercise: Exercise;
  dayKey: string;
  onUpdate: (updates: Partial<Exercise>) => void;
  onRemove: () => void;
  isDragging?: boolean;
}

const ExerciseCard = ({ exercise, dayKey, onUpdate, onRemove, isDragging }: ExerciseCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `${dayKey}-${exercise.id}`,
  });

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);
  const [isVideoUrlDialogOpen, setIsVideoUrlDialogOpen] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleImageFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${exercise.id}-${Date.now()}.${fileExt}`;
      const filePath = `workout-exercises/${exercise.id}/images/${fileName}`;

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
        onUpdate({ image_url: urlData.signedUrl });
      } else {
        throw new Error('לא ניתן לקבל קישור לתמונה');
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error?.message || 'שגיאה בהעלאת התמונה';
      alert(`שגיאה בהעלאת התמונה: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    }
  };

  const handleVideoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('video/')) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${exercise.id}-${Date.now()}.${fileExt}`;
      const filePath = `workout-exercises/${exercise.id}/videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'שגיאה בהעלאת הווידאו');
      }

      // Generate signed URL (valid for 1 year) since bucket is private
      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(filePath, 31536000); // 1 year expiration

      if (urlError) {
        throw new Error(urlError.message || 'לא ניתן לקבל קישור לווידאו');
      }

      if (urlData?.signedUrl) {
        onUpdate({ video_url: urlData.signedUrl });
      } else {
        throw new Error('לא ניתן לקבל קישור לווידאו');
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error?.message || 'שגיאה בהעלאת הווידאו';
      alert(`שגיאה בהעלאת הווידאו: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
      }
    }
  };

  const handleImageUrlSubmit = () => {
    if (imageUrlInput.trim()) {
      onUpdate({ image_url: imageUrlInput.trim() });
      setImageUrlInput('');
      setIsImageUrlDialogOpen(false);
    }
  };

  const handleVideoUrlSubmit = () => {
    if (videoUrlInput.trim()) {
      onUpdate({ video_url: videoUrlInput.trim() });
      setVideoUrlInput('');
      setIsVideoUrlDialogOpen(false);
    }
  };

  const handleRemoveImage = () => {
    onUpdate({ image_url: undefined });
  };

  const handleRemoveVideo = () => {
    onUpdate({ video_url: undefined });
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'p-3 mb-2 bg-white border border-gray-200 hover:border-blue-400 hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm',
          isDragging && 'opacity-50'
        )}
        dir="rtl"
      >
        <div className="flex items-start gap-3 pr-1">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
              <div className="flex-1 min-w-0 overflow-hidden">
                <Input
                  value={exercise.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  className="h-7 text-sm font-semibold border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-gray-900 placeholder:text-gray-400 w-full"
                  placeholder="שם התרגיל"
                  dir="rtl"
                  style={{
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    textOverflow: 'clip'
                  }}
                  onFocus={(e) => {
                    // For RTL, ensure we can see the full text by scrolling to start
                    const input = e.target as HTMLInputElement;
                    // Set selection to end to ensure cursor is visible
                    setTimeout(() => {
                      input.setSelectionRange(0, input.value.length);
                      // For RTL, scroll to show the beginning of text
                      if (input.dir === 'rtl') {
                        input.scrollLeft = 0;
                      }
                    }, 0);
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Image Upload Button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      disabled={isUploading}
                    >
                      <Image className={cn('h-3.5 w-3.5', exercise.image_url && 'text-blue-600')} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          imageFileInputRef.current?.click();
                        }}
                        disabled={isUploading}
                      >
                        <Image className="h-3 w-3 ml-1" />
                        העלה תמונה
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setIsImageUrlDialogOpen(true)}
                        disabled={isUploading}
                      >
                        <Image className="h-3 w-3 ml-1" />
                        הוסף קישור תמונה
                      </Button>
                      {exercise.image_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs text-red-600 hover:text-red-700"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-3 w-3 ml-1" />
                          הסר תמונה
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Video Upload Button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                      disabled={isUploading}
                    >
                      <Video className={cn('h-3.5 w-3.5', exercise.video_url && 'text-blue-600')} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          videoFileInputRef.current?.click();
                        }}
                        disabled={isUploading}
                      >
                        <Video className="h-3 w-3 ml-1" />
                        העלה וידאו
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setIsVideoUrlDialogOpen(true)}
                        disabled={isUploading}
                      >
                        <PlayCircle className="h-3 w-3 ml-1" />
                        הוסף קישור וידאו
                      </Button>
                      {exercise.video_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs text-red-600 hover:text-red-700"
                          onClick={handleRemoveVideo}
                        >
                          <X className="h-3 w-3 ml-1" />
                          הסר וידאו
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  onClick={onRemove}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-700 flex-wrap">
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                <Input
                  type="number"
                  value={exercise.sets}
                  onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 0 })}
                  className="h-6 w-12 text-center border-gray-300 text-xs font-medium bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  dir="ltr"
                />
                <span className="text-xs font-medium whitespace-nowrap">סטים</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                <Input
                  type="number"
                  value={exercise.reps}
                  onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
                  className="h-6 w-12 text-center border-gray-300 text-xs font-medium bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  dir="ltr"
                />
                <span className="text-xs font-medium whitespace-nowrap">חזרות</span>
              </div>
            </div>

            {/* Media Thumbnails */}
            {(exercise.image_url || exercise.video_url) && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {exercise.image_url && (
                  <div className="relative group">
                    <img
                      src={exercise.image_url}
                      alt={exercise.name}
                      className="h-14 w-14 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 hover:opacity-90 transition-all shadow-sm"
                      onClick={() => setIsImageModalOpen(true)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {exercise.video_url && (
                  <div className="relative group">
                    <div
                      className="h-14 w-14 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 hover:opacity-90 transition-all bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-sm"
                      onClick={() => setIsVideoModalOpen(true)}
                    >
                      <PlayCircle className="h-6 w-6 text-gray-700" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveVideo();
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={imageFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileUpload}
        />
        <input
          ref={videoFileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleVideoFileUpload}
        />
      </Card>

      {/* Image URL Input Dialog */}
      <Dialog open={isImageUrlDialogOpen} onOpenChange={setIsImageUrlDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-url" className="text-sm font-medium mb-2 block">
                קישור תמונה
              </Label>
              <Input
                id="image-url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full"
                dir="ltr"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleImageUrlSubmit();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImageUrlSubmit} className="flex-1" disabled={!imageUrlInput.trim()}>
                שמור
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsImageUrlDialogOpen(false);
                  setImageUrlInput('');
                }}
                className="flex-1"
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video URL Input Dialog */}
      <Dialog open={isVideoUrlDialogOpen} onOpenChange={setIsVideoUrlDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-url" className="text-sm font-medium mb-2 block">
                קישור וידאו (YouTube/Vimeo/כל קישור)
              </Label>
              <Input
                id="video-url"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full"
                dir="ltr"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleVideoUrlSubmit();
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleVideoUrlSubmit} className="flex-1" disabled={!videoUrlInput.trim()}>
                שמור
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsVideoUrlDialogOpen(false);
                  setVideoUrlInput('');
                }}
                className="flex-1"
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0" dir="rtl">
          <div className="relative w-full h-full flex items-center justify-center bg-black/90">
            <img
              src={exercise.image_url}
              alt={exercise.name}
              className="max-w-full max-h-[95vh] object-contain"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 left-2 text-white hover:bg-white/20"
              onClick={() => setIsImageModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Lightbox Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0" dir="rtl">
          <div className="relative w-full h-full flex items-center justify-center bg-black/90">
            <div className="w-full max-w-4xl aspect-video">
              {exercise.video_url?.includes('youtube.com') || exercise.video_url?.includes('youtu.be') ? (
                <iframe
                  src={exercise.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : exercise.video_url?.includes('vimeo.com') ? (
                <iframe
                  src={exercise.video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={exercise.video_url}
                  controls
                  className="w-full h-full"
                  autoPlay
                />
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 left-2 text-white hover:bg-white/20"
              onClick={() => setIsVideoModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ExerciseRow = ({ exercise, dayKey, onUpdate, onRemove, isDragging }: ExerciseCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `${dayKey}-${exercise.id}`,
  });

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);
  const [isVideoUrlDialogOpen, setIsVideoUrlDialogOpen] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleImageFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${exercise.id}-${Date.now()}.${fileExt}`;
      const filePath = `workout-exercises/${exercise.id}/images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'שגיאה בהעלאת התמונה');
      }

      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(filePath, 31536000);

      if (urlError) {
        throw new Error(urlError.message || 'לא ניתן לקבל קישור לתמונה');
      }

      if (urlData?.signedUrl) {
        onUpdate({ image_url: urlData.signedUrl });
      } else {
        throw new Error('לא ניתן לקבל קישור לתמונה');
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error?.message || 'שגיאה בהעלאת התמונה';
      alert(`שגיאה בהעלאת התמונה: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = '';
      }
    }
  };

  const handleVideoFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('video/')) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${exercise.id}-${Date.now()}.${fileExt}`;
      const filePath = `workout-exercises/${exercise.id}/videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'שגיאה בהעלאת הווידאו');
      }

      const { data: urlData, error: urlError } = await supabase.storage
        .from('client-assets')
        .createSignedUrl(filePath, 31536000);

      if (urlError) {
        throw new Error(urlError.message || 'לא ניתן לקבל קישור לווידאו');
      }

      if (urlData?.signedUrl) {
        onUpdate({ video_url: urlData.signedUrl });
      } else {
        throw new Error('לא ניתן לקבל קישור לווידאו');
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.error?.message || 'שגיאה בהעלאת הווידאו';
      alert(`שגיאה בהעלאת הווידאו: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = '';
      }
    }
  };

  const handleImageUrlSubmit = () => {
    if (imageUrlInput.trim()) {
      onUpdate({ image_url: imageUrlInput.trim() });
      setImageUrlInput('');
      setIsImageUrlDialogOpen(false);
    }
  };

  const handleVideoUrlSubmit = () => {
    if (videoUrlInput.trim()) {
      onUpdate({ video_url: videoUrlInput.trim() });
      setVideoUrlInput('');
      setIsVideoUrlDialogOpen(false);
    }
  };

  const handleRemoveImage = () => {
    onUpdate({ image_url: undefined });
  };

  const handleRemoveVideo = () => {
    onUpdate({ video_url: undefined });
  };

  return (
    <>
      <TableRow
        ref={setNodeRef}
        style={style}
        className={cn(
          'hover:bg-gray-50',
          isDragging && 'opacity-50'
        )}
        dir="rtl"
      >
        <TableCell className="w-[40px]">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </TableCell>
        <TableCell>
          <Input
            value={exercise.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 text-sm border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            placeholder="שם התרגיל"
            dir="rtl"
          />
        </TableCell>
        <TableCell className="w-[100px]">
          <Input
            type="number"
            value={exercise.sets}
            onChange={(e) => onUpdate({ sets: parseInt(e.target.value) || 0 })}
            className="h-8 w-16 text-center border-gray-300 text-xs font-medium focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            dir="ltr"
          />
        </TableCell>
        <TableCell className="w-[100px]">
          <Input
            type="number"
            value={exercise.reps}
            onChange={(e) => onUpdate({ reps: parseInt(e.target.value) || 0 })}
            className="h-8 w-16 text-center border-gray-300 text-xs font-medium focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            dir="ltr"
          />
        </TableCell>
        <TableCell className="w-[120px]">
          <div className="flex items-center justify-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isUploading}
                >
                  <Image className={cn('h-3.5 w-3.5', exercise.image_url && 'text-blue-600')} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      imageFileInputRef.current?.click();
                    }}
                    disabled={isUploading}
                  >
                    <Image className="h-3 w-3 ml-1" />
                    העלה תמונה
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setIsImageUrlDialogOpen(true)}
                    disabled={isUploading}
                  >
                    <Image className="h-3 w-3 ml-1" />
                    הוסף קישור תמונה
                  </Button>
                  {exercise.image_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-red-600 hover:text-red-700"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3 ml-1" />
                      הסר תמונה
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={(e) => e.stopPropagation()}
                  disabled={isUploading}
                >
                  <Video className={cn('h-3.5 w-3.5', exercise.video_url && 'text-blue-600')} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" dir="rtl" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      videoFileInputRef.current?.click();
                    }}
                    disabled={isUploading}
                  >
                    <Video className="h-3 w-3 ml-1" />
                    העלה וידאו
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setIsVideoUrlDialogOpen(true)}
                    disabled={isUploading}
                  >
                    <PlayCircle className="h-3 w-3 ml-1" />
                    הוסף קישור וידאו
                  </Button>
                  {exercise.video_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs text-red-600 hover:text-red-700"
                      onClick={handleRemoveVideo}
                    >
                      <X className="h-3 w-3 ml-1" />
                      הסר וידאו
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {(exercise.image_url || exercise.video_url) && (
              <div className="flex items-center gap-1">
                {exercise.image_url && (
                  <img
                    src={exercise.image_url}
                    alt={exercise.name}
                    className="h-6 w-6 object-cover rounded border border-gray-200 cursor-pointer hover:border-blue-400"
                    onClick={() => setIsImageModalOpen(true)}
                  />
                )}
                {exercise.video_url && (
                  <div
                    className="h-6 w-6 rounded border border-gray-200 cursor-pointer hover:border-blue-400 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
                    onClick={() => setIsVideoModalOpen(true)}
                  >
                    <PlayCircle className="h-3 w-3 text-gray-700" />
                  </div>
                )}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="w-[50px]">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Hidden file inputs */}
      <input
        ref={imageFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageFileUpload}
      />
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoFileUpload}
      />

      {/* Image URL Input Dialog */}
      <Dialog open={isImageUrlDialogOpen} onOpenChange={setIsImageUrlDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-url" className="text-right">
                קישור תמונה
              </Label>
              <Input
                id="image-url"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div className="flex justify-start gap-2">
              <Button onClick={handleImageUrlSubmit}>הוסף</Button>
              <Button variant="outline" onClick={() => setIsImageUrlDialogOpen(false)}>
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video URL Input Dialog */}
      <Dialog open={isVideoUrlDialogOpen} onOpenChange={setIsVideoUrlDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-url" className="text-right">
                קישור וידאו
              </Label>
              <Input
                id="video-url"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div className="flex justify-start gap-2">
              <Button onClick={handleVideoUrlSubmit}>הוסף</Button>
              <Button variant="outline" onClick={() => setIsVideoUrlDialogOpen(false)}>
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <div className="relative w-full h-[80vh] flex items-center justify-center bg-black rounded-lg overflow-hidden">
            {exercise.image_url && (
              <img
                src={exercise.image_url}
                alt={exercise.name}
                className="max-w-full max-h-full object-contain"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 left-2 text-white hover:bg-white/20"
              onClick={() => setIsImageModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <div className="relative w-full h-[80vh] flex items-center justify-center bg-black rounded-lg overflow-hidden">
            {exercise.video_url && (
              <video
                src={exercise.video_url}
                controls
                className="w-full h-full"
                autoPlay
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 left-2 text-white hover:bg-white/20"
              onClick={() => setIsVideoModalOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface ManualExerciseInputProps {
  onAdd: (name: string) => void;
}

const ManualExerciseInput = ({ onAdd }: ManualExerciseInputProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling up to parent forms/dialogs
    if (exerciseName.trim()) {
      onAdd(exerciseName.trim());
      setExerciseName('');
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setExerciseName('');
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full border-2 border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 h-10"
          dir="rtl"
        >
          <Edit className="h-4 w-4 ml-2" />
          הוסף תרגיל ידני
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" dir="rtl">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="manual-exercise-name" className="text-sm font-medium mb-2 block">
              שם התרגיל
            </Label>
            <Input
              id="manual-exercise-name"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  // Manually trigger submit with a synthetic event
                  const syntheticEvent = {
                    preventDefault: () => { },
                    stopPropagation: () => { },
                  } as React.FormEvent;
                  handleSubmit(syntheticEvent);
                }
              }}
              placeholder="הזן שם תרגיל..."
              className="w-full"
              dir="rtl"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              className="flex-1"
              disabled={!exerciseName.trim()}
            >
              הוסף
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};

interface DayColumnProps {
  dayKey: string;
  dayLabel: string;
  dayShort: string;
  dayData: {
    day: string;
    isActive: boolean;
    exercises: Exercise[];
  };
  onAddExercise: (exercise: Exercise) => void;
  onUpdateExercise: (exerciseId: string, updates: Partial<Exercise>) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onActivateDay: () => void;
  onCopyTemplate: (template: 'push' | 'pull' | 'legs' | 'upper' | 'lower') => void;
  onDuplicateDay: (targetDay: keyof WeeklyWorkout['days']) => void;
  activeId: string | null;
}

const DayColumn = ({
  dayKey,
  dayLabel,
  dayShort,
  dayData,
  onAddExercise,
  onUpdateExercise,
  onRemoveExercise,
  onActivateDay,
  onCopyTemplate,
  onDuplicateDay,
  activeId,
}: DayColumnProps) => {
  const exerciseIds = (dayData?.exercises || []).map((ex) => `${dayKey}-${ex.id}`);
  const totalSets = (dayData?.exercises || []).reduce((sum, ex) => sum + ex.sets, 0);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [selectedTargetDay, setSelectedTargetDay] = useState<string>('');

  const { setNodeRef, isOver } = useDroppable({
    id: `${dayKey}-column`,
  });

  const handleDuplicateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDuplicateDialogOpen(true);
    setSelectedTargetDay('');
  };

  const handleDuplicateConfirm = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (selectedTargetDay && selectedTargetDay !== dayKey) {
      onDuplicateDay(selectedTargetDay as keyof WeeklyWorkout['days']);
      setIsDuplicateDialogOpen(false);
      setSelectedTargetDay('');
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col bg-gray-50 border-2 transition-colors',
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
        )}
        dir="rtl"
      >
        {/* Day Actions */}
        <div className="p-2 bg-white border-b border-gray-200 flex-shrink-0">
          {dayData?.isActive && (dayData?.exercises?.length || 0) > 0 && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDuplicateClick}
                type="button"
                className="flex-1 text-xs h-7"
              >
                <Copy className="h-3 w-3 ml-1" />
                שכפל יום
              </Button>
            </div>
          )}
          {!dayData?.isActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onActivateDay}
              className="w-full text-xs h-7"
            >
              <Plus className="h-3 w-3 ml-1" />
              הפעל יום
            </Button>
          )}
        </div>

        {/* Exercises Table */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {dayData?.isActive ? (
            (dayData?.exercises?.length || 0) > 0 ? (
              <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
                <Table dir="rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="text-right">שם התרגיל</TableHead>
                      <TableHead className="w-[100px] text-center">סטים</TableHead>
                      <TableHead className="w-[100px] text-center">חזרות</TableHead>
                      <TableHead className="w-[120px] text-center">מדיה</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dayData?.exercises || []).map((exercise) => (
                      <ExerciseRow
                        key={exercise.id}
                        exercise={exercise}
                        dayKey={dayKey}
                        onUpdate={(updates) => onUpdateExercise(exercise.id, updates)}
                        onRemove={() => onRemoveExercise(exercise.id)}
                        isDragging={activeId === `${dayKey}-${exercise.id}`}
                      />
                    ))}
                  </TableBody>
                </Table>
              </SortableContext>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg m-4">
                <p className="text-sm mb-2">אין תרגילים</p>
                <p className="text-xs">גרור לכאן או לחץ למטה להוספה</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
              <Dumbbell className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm mb-2">יום מנוחה</p>
              <p className="text-xs">לחץ על "הפעל יום" למעלה</p>
              <p className="text-xs">או הוסף תרגיל למטה</p>
            </div>
          )}
        </div>

        {/* Quick Add Footer */}
        {dayData?.isActive && (
          <div className="p-2 border-t border-gray-200 bg-white flex-shrink-0 space-y-2">
            <SelectExerciseFromDatabase
              onSelect={(exercise) => {
                onAddExercise({
                  id: `${Date.now()}-${Math.random()}`,
                  name: exercise.name,
                  sets: 3,
                  reps: exercise.repetitions || 10,
                  image_url: exercise.image || undefined,
                  video_url: exercise.video_link || undefined,
                });
              }}
            />

            <ManualExerciseInput
              onAdd={(name) => {
                if (name.trim()) {
                  onAddExercise({
                    id: `${Date.now()}-${Math.random()}`,
                    name: name.trim(),
                    sets: 3,
                    reps: 10,
                  });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Duplicate Day Dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          dir="rtl"
          onInteractOutside={(e) => {
            // Prevent closing when clicking outside - only close via explicit action
            e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Allow escape to close
            // Don't prevent default
          }}
        >
          <DialogHeader>
            <DialogTitle>שכפל יום - {dayLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target-day" className="text-right">
                בחר יום יעד לשכפול
              </Label>
              <Select value={selectedTargetDay} onValueChange={setSelectedTargetDay}>
                <SelectTrigger id="target-day" className="text-right">
                  <SelectValue placeholder="בחר יום" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.filter((day) => day.key !== dayKey).map((day) => (
                    <SelectItem key={day.key} value={day.key}>
                      {day.label} ({day.short})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-start gap-2 pt-2">
              <Button
                type="button"
                onClick={handleDuplicateConfirm}
                disabled={!selectedTargetDay || selectedTargetDay === dayKey}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
              >
                <Copy className="h-4 w-4 ml-2" />
                שכפל
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDuplicateDialogOpen(false);
                  setSelectedTargetDay('');
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const WorkoutBoard = ({ mode, initialData, leadId, customerId, onSave, onCancel }: WorkoutBoardProps) => {
  const {
    startDate,
    description,
    generalGoals,
    stepsGoal,
    goalTags,
    weeklyWorkout,
    activeId,
    setStartDate,
    setDescription,
    setGeneralGoals,
    setStepsGoal,
    setGoalTags,
    addExercise,
    updateExercise,
    removeExercise,
    updateDay,
    copyFromTemplate,
    duplicateDay,
    getWorkoutData,
    getDndContext,
  } = useWorkoutBoard(mode, initialData, customerId || leadId); // Use customerId, fallback to leadId for backward compatibility

  // Local state for tags input to allow typing commas freely
  const [tagsInput, setTagsInput] = useState(goalTags.join(', '));

  // Sync tagsInput with goalTags when goalTags change (e.g., when editing existing template)
  useEffect(() => {
    setTagsInput(goalTags.join(', '));
  }, [goalTags]);

  const dndContext = getDndContext();
  const activeDaysCount = Object.values(weeklyWorkout?.days || {}).filter((d) => d.isActive).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent forms
    try {
      const data = getWorkoutData();
      if (mode === 'user') {
        onSave(data.planData!);
      } else {
        onSave(data.templateData!);
      }
    } catch (error: any) {
      alert(error.message || 'שגיאה בשמירת התוכנית');
    }
  };

  const activeExercise = useMemo(() => {
    if (!activeId || !weeklyWorkout?.days) return null;
    const [dayKey, exerciseId] = activeId.split('-');
    if (!dayKey || !exerciseId || dayKey === 'column') return null;
    const day = weeklyWorkout.days[dayKey as keyof typeof weeklyWorkout.days];
    return day?.exercises.find((ex) => ex.id === exerciseId) || null;
  }, [activeId, weeklyWorkout]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0" dir="rtl">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b-2 border-slate-200 shadow-sm">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="start_date" className="text-sm font-semibold text-slate-700">
                תאריך התחלה:
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 justify-start text-right font-normal"
                    disabled={mode === 'template'}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={he}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {activeDaysCount} ימים פעילים
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                {mode === 'template' ? 'שם התבנית' : 'תיאור כללי'}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={mode === 'template' ? 'שם התבנית...' : 'תיאור קצר של התוכנית...'}
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="generalGoals" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                {mode === 'template' ? 'תיאור התבנית' : 'מטרות כלליות'}
              </Label>
              <Textarea
                id="generalGoals"
                value={generalGoals}
                onChange={(e) => setGeneralGoals(e.target.value)}
                placeholder={mode === 'template' ? 'תיאור התבנית...' : 'מטרות התוכנית...'}
                className="min-h-[60px] resize-none"
                rows={2}
              />
            </div>
          </div>
          {mode === 'user' && (
            <div>
              <Label htmlFor="stepsGoal" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <Footprints className="h-4 w-4" />
                יעד צעדים יומי
              </Label>
              <Input
                id="stepsGoal"
                type="number"
                value={stepsGoal || ''}
                onChange={(e) => setStepsGoal(parseInt(e.target.value) || 0)}
                placeholder="לדוגמה: 7000"
                className="max-w-xs"
                dir="ltr"
              />
            </div>
          )}
          {mode === 'template' && (
            <div>
              <Label htmlFor="goalTags" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" />
                תגיות (מופרדות בפסיק)
              </Label>
              <div className="space-y-2">
                <Input
                  id="goalTags"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                  }}
                  onBlur={() => {
                    // Parse tags when user finishes typing
                    const tags = tagsInput
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(tag => tag.length > 0);
                    setGoalTags(tags);
                    setTagsInput(tags.join(', '));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Parse tags when user presses Enter
                      const tags = tagsInput
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);
                      setGoalTags(tags);
                      setTagsInput(tags.join(', '));
                    }
                  }}
                  placeholder="לדוגמה: חיטוב, כוח, סיבולת"
                  className="w-full"
                  dir="rtl"
                />
                {goalTags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {goalTags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Days Accordion List */}
      <div className="flex-1 min-h-0" style={{ flexGrow: 1, minHeight: 0 }}>
        <DndContext
          sensors={dndContext.sensors}
          collisionDetection={dndContext.collisionDetection}
          onDragStart={dndContext.onDragStart}
          onDragEnd={dndContext.onDragEnd}
        >
          <Accordion type="multiple" className="w-full" dir="rtl">
            {DAYS.map((day) => {
              const dayKey = day.key;
              const dayData = weeklyWorkout?.days?.[dayKey as keyof typeof weeklyWorkout.days] || {
                day: dayKey,
                isActive: false,
                exercises: [],
              };

              return (
                <AccordionItem key={day.key} value={day.key} className="border-b">
                  <AccordionTrigger className="hover:no-underline px-4 py-3 bg-gray-50 hover:bg-gray-100">
                    <div className="flex items-center justify-between w-full mr-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm text-right">{day.label}</h3>
                          <p className="text-xs text-gray-500 text-right">{day.short}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {dayData?.exercises?.length || 0}
                          </Badge>
                          {(dayData?.exercises || []).reduce((sum, ex) => sum + ex.sets, 0) > 0 && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {(dayData?.exercises || []).reduce((sum, ex) => sum + ex.sets, 0)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-4">
                    <DayColumn
                      dayKey={day.key}
                      dayLabel={day.label}
                      dayShort={day.short}
                      dayData={dayData}
                      onAddExercise={(exercise) => addExercise(dayKey, exercise)}
                      onUpdateExercise={(exerciseId, updates) => updateExercise(dayKey, exerciseId, updates)}
                      onRemoveExercise={(exerciseId) => removeExercise(dayKey, exerciseId)}
                      onActivateDay={() => updateDay(dayKey, { isActive: true })}
                      onCopyTemplate={(template) => copyFromTemplate(dayKey, template)}
                      onDuplicateDay={(targetDay) => duplicateDay(dayKey, targetDay)}
                      activeId={activeId}
                    />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          <DragOverlay>
            {activeExercise && (
              <Card className="p-3 bg-white border-2 border-blue-400 w-64">
                <div className="font-medium text-sm">{activeExercise.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {activeExercise.sets} סטים × {activeExercise.reps} חזרות
                </div>
              </Card>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 flex gap-3" dir="rtl">
        <Button
          type="submit"
          className="flex-1 bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
        >
          שמור {mode === 'user' ? 'תוכנית' : 'תבנית'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          <X className="h-4 w-4 ml-2" />
          ביטול
        </Button>
      </div>
    </form>
  );
};

