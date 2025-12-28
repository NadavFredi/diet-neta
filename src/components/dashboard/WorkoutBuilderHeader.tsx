import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Target, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface WorkoutBuilderHeaderProps {
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  description: string;
  setDescription: (desc: string) => void;
  generalGoals: string;
  setGeneralGoals: (goals: string) => void;
  activeDaysCount: number;
}

export const WorkoutBuilderHeader = ({
  startDate,
  setStartDate,
  description,
  setDescription,
  generalGoals,
  setGeneralGoals,
  activeDaysCount,
}: WorkoutBuilderHeaderProps) => {
  return (
    <div className="bg-white border-b-2 border-slate-200 shadow-sm" style={{ flexShrink: 0 }}>
      <div className="p-4 space-y-4">
        {/* First Row: Date and Active Days */}
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

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {activeDaysCount} ימים פעילים
            </Badge>
          </div>
        </div>

        {/* Second Row: Description and Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" />
              תיאור כללי
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תיאור קצר של התוכנית..."
              className="min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="generalGoals" className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" />
              מטרות כלליות
            </Label>
            <Textarea
              id="generalGoals"
              value={generalGoals}
              onChange={(e) => setGeneralGoals(e.target.value)}
              placeholder="מטרות התוכנית..."
              className="min-h-[60px] resize-none"
              rows={2}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

