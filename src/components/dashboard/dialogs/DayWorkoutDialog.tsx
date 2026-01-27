import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dumbbell } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  order?: string;
  notes?: string;
  image_url?: string;
  video_url?: string;
}

interface DayWorkoutDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dayName: string;
  exercises: Exercise[];
}

export const DayWorkoutDialog = ({
  isOpen,
  onOpenChange,
  dayName,
  exercises,
}: DayWorkoutDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-[#5B6FB9]" />
            אימון ליום {dayName}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {exercises.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              אין תרגילים ליום זה
            </div>
          ) : (
            <div className="space-y-4">
              {exercises.map((exercise, index) => (
                <div 
                  key={exercise.id || index} 
                  className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{exercise.name}</h4>
                    <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                      #{index + 1}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-white p-2 rounded border border-slate-100 flex flex-col items-center">
                      <span className="text-xs text-gray-500">סטים</span>
                      <span className="font-bold text-[#5B6FB9]">{exercise.sets}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-100 flex flex-col items-center">
                      <span className="text-xs text-gray-500">חזרות</span>
                      <span className="font-bold text-[#5B6FB9]">{exercise.reps}</span>
                    </div>
                  </div>
                  
                  {exercise.notes && (
                    <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-slate-100">
                      <span className="font-medium ml-1">הערות:</span>
                      {exercise.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
