/**
 * MeetingDialog Component
 * 
 * Dialog for creating or editing a meeting linked to a lead.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Pencil } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { format, differenceInMinutes, parseISO, isValid } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Meeting } from '@/hooks/useMeetings';

interface MeetingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  meeting?: Meeting | null; // Provide this for edit mode
  onMeetingSaved?: () => void | Promise<void>;
  initialDate?: Date | null;
}

export const MeetingDialog = ({
  isOpen,
  onOpenChange,
  leadId,
  meeting,
  onMeetingSaved,
  initialDate,
}: MeetingDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!meeting;

  // Fetch leads for selection (only when not pre-filled and not in edit mode)
  const [leads, setLeads] = useState<Array<{ id: string; customer_id: string; customer?: { full_name: string; phone?: string } }>>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  useEffect(() => {
    if (isOpen && !leadId && !isEditMode) {
      setIsLoadingLeads(true);
      supabase
        .from('leads')
        .select('id, customer_id, customer:customers(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(1000)
        .then(({ data, error }) => {
          if (!error && data) {
            setLeads(data as any);
          }
          setIsLoadingLeads(false);
        });
    }
  }, [isOpen, leadId, isEditMode]);

  const [formData, setFormData] = useState({
    lead_id: leadId || '',
    meeting_date: '',
    meeting_time_start: '',
    meeting_time_end: '',
    status: 'פעיל',
    meeting_type: '',
    notes: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Initialize form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (meeting) {
        const mData = meeting.meeting_data || {};
        
        let mDate = mData.date || mData.meeting_date || mData['תאריך'] || format(new Date(), 'yyyy-MM-dd');
        let startTime = mData.time_start || mData.meeting_time_start || '';
        let endTime = mData.time_end || mData.meeting_time_end || '';

        // Try to get from eventStartTime if available
        if (mData.eventStartTime) {
          const startDate = parseISO(mData.eventStartTime);
          if (isValid(startDate)) {
            mDate = format(startDate, 'yyyy-MM-dd');
            startTime = format(startDate, 'HH:mm');
          }
        }
        if (mData.eventEndTime) {
          const endDate = parseISO(mData.eventEndTime);
          if (isValid(endDate)) {
            endTime = format(endDate, 'HH:mm');
          }
        }

        setFormData({
          lead_id: meeting.lead_id || '',
          meeting_date: mDate,
          meeting_time_start: startTime,
          meeting_time_end: endTime,
          status: mData.status || mData['סטטוס'] || 'פעיל',
          meeting_type: mData.meeting_type || mData['סוג פגישה'] || '',
          notes: mData.notes || mData['הערות'] || '',
        });
        setSelectedDate(parseISO(mDate));
      } else {
        const dateToUse = initialDate ? new Date(initialDate) : new Date();
        const dateStr = format(dateToUse, 'yyyy-MM-dd');
        const defaultTime = format(dateToUse, 'HH:mm');
        
        setFormData({
          lead_id: leadId || '',
          meeting_date: dateStr,
          meeting_time_start: defaultTime,
          meeting_time_end: '',
          status: 'פעיל',
          meeting_type: '',
          notes: '',
        });
        setSelectedDate(dateToUse);
      }
    }
  }, [isOpen, leadId, initialDate, meeting]);

  useEffect(() => {
    if (selectedDate && isValid(selectedDate)) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setFormData((prev) => ({ ...prev, meeting_date: dateStr }));
    }
  }, [selectedDate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const duration = formData.meeting_time_start && formData.meeting_time_end 
    ? (() => {
        const start = new Date(`${formData.meeting_date}T${formData.meeting_time_start}`);
        const end = new Date(`${formData.meeting_date}T${formData.meeting_time_end}`);
        if (isValid(start) && isValid(end)) {
          const mins = differenceInMinutes(end, start);
          if (mins < 0) return null;
          const hrs = Math.floor(mins / 60);
          const remainingMins = mins % 60;
          return hrs > 0 ? `${hrs} שעות ו-${remainingMins} דקות` : `${remainingMins} דקות`;
        }
        return null;
      })()
    : null;

  const handleSubmit = async () => {
    if (!formData.lead_id && !isEditMode) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור ליד',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.meeting_date) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין תאריך פגישה',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const existingData = meeting?.meeting_data || {};
      const meetingData: Record<string, any> = {
        ...existingData,
        'תאריך': formData.meeting_date,
        'תאריך פגישה': formData.meeting_date,
        date: formData.meeting_date,
        meeting_date: formData.meeting_date,
        'סטטוס': formData.status,
        status: formData.status,
        notes: formData.notes,
        'הערות': formData.notes,
      };

      if (formData.meeting_type) {
        meetingData['סוג פגישה'] = formData.meeting_type;
        meetingData.meeting_type = formData.meeting_type;
        meetingData.type = formData.meeting_type;
      }

      if (formData.meeting_time_start) {
        const [hours, minutes] = formData.meeting_time_start.split(':');
        const startDateTime = new Date(`${formData.meeting_date}T${hours}:${minutes}:00`);
        const startDateTimeISO = startDateTime.toISOString();
        
        meetingData['שעה'] = formData.meeting_time_end 
          ? `${formData.meeting_time_start} - ${formData.meeting_time_end}`
          : formData.meeting_time_start;
        meetingData.meeting_time = formData.meeting_time_end 
          ? `${formData.meeting_time_start} - ${formData.meeting_time_end}`
          : formData.meeting_time_start;
        
        meetingData.time_start = formData.meeting_time_start;
        meetingData.meeting_time_start = formData.meeting_time_start;
        meetingData.event_start_time = startDateTimeISO;
        meetingData.eventStartTime = startDateTimeISO;
        meetingData['שעת התחלה'] = formData.meeting_time_start;
        
        if (formData.meeting_time_end) {
          const [endHours, endMinutes] = formData.meeting_time_end.split(':');
          const endDateTime = new Date(`${formData.meeting_date}T${endHours}:${endMinutes}:00`);
          const endDateTimeISO = endDateTime.toISOString();
          
          meetingData.time_end = formData.meeting_time_end;
          meetingData.meeting_time_end = formData.meeting_time_end;
          meetingData.event_end_time = endDateTimeISO;
          meetingData.eventEndTime = endDateTimeISO;
          meetingData['שעת סיום'] = formData.meeting_time_end;
        }
      }

      if (isEditMode && meeting) {
        const { error } = await supabase
          .from('meetings')
          .update({
            meeting_data: meetingData,
            lead_id: formData.lead_id || null,
          })
          .eq('id', meeting.id);

        if (error) throw error;
        
        toast({
          title: 'הצלחה',
          description: 'הפגישה עודכנה בהצלחה',
        });
      } else {
        const { error } = await supabase
          .from('meetings')
          .insert({
            lead_id: formData.lead_id || null,
            meeting_data: meetingData,
            created_by: user?.id || null,
          });

        if (error) throw error;

        toast({
          title: 'הצלחה',
          description: 'הפגישה נוצרה בהצלחה',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', meeting?.id] });

      if (onMeetingSaved) {
        await onMeetingSaved();
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'פעולה נכשלה. אנא נסה שוב.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {isEditMode ? 'עריכת פגישה' : 'צור פגישה חדשה'}
          </DialogTitle>
          <DialogDescription className="text-right">
            {isEditMode ? 'עדכן את פרטי הפגישה הקיימת' : 'צור פגישה חדשה המקושרת לליד'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!leadId && !isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="lead_id" className="block text-right">ליד *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      !formData.lead_id && "text-muted-foreground"
                    )}
                    disabled={isSubmitting || isLoadingLeads}
                  >
                    {isLoadingLeads
                      ? "טוען לידים..."
                      : formData.lead_id
                      ? leads.find((lead) => lead.id === formData.lead_id)?.customer?.full_name || `ליד #${formData.lead_id.slice(0, 8)}`
                      : "בחר ליד *"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" dir="rtl">
                  <Command>
                    <CommandInput placeholder="חפש ליד..." dir="rtl" />
                    <CommandList>
                      <CommandEmpty>לא נמצאו לידים</CommandEmpty>
                      <CommandGroup>
                        {leads.map((lead) => (
                          <CommandItem
                            key={lead.id}
                            value={`${lead.customer?.full_name || ''} ${lead.customer?.phone || ''} ${lead.id}`}
                            onSelect={() => {
                              handleInputChange('lead_id', lead.id);
                            }}
                          >
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4",
                                formData.lead_id === lead.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {lead.customer?.full_name || `ליד #${lead.id.slice(0, 8)}`}
                            {lead.customer?.phone ? ` - ${lead.customer.phone}` : ''}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="meeting_date" className="block text-right">תאריך פגישה *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-right font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="ml-2 h-4 w-4 text-[#5B6FB9]" />
                  {selectedDate ? (
                    format(selectedDate, 'dd/MM/yyyy', { locale: he })
                  ) : (
                    <span>בחר תאריך</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" dir="rtl">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={he}
                  className="rounded-lg border-0 shadow-lg"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_type" className="block text-right">סוג פגישה</Label>
            <Select
              value={formData.meeting_type}
              onValueChange={(value) => handleInputChange('meeting_type', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="text-right">
                <SelectValue placeholder="בחר סוג פגישה" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="פגישת הכרות">פגישת הכרות</SelectItem>
                <SelectItem value="פגישת מעקב">פגישת מעקב</SelectItem>
                <SelectItem value="פגישת ביקורת חודשית">פגישת ביקורת חודשית</SelectItem>
                <SelectItem value="פגישת תזונה">פגישת תזונה</SelectItem>
                <SelectItem value="תיאום תקציב">תיאום תכנית פעולה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting_time_start" className="block text-right">שעת התחלה</Label>
              <Input
                id="meeting_time_start"
                type="time"
                value={formData.meeting_time_start}
                onChange={(e) => handleInputChange('meeting_time_start', e.target.value)}
                disabled={isSubmitting}
                className="text-right"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_time_end" className="block text-right">שעת סיום</Label>
              <Input
                id="meeting_time_end"
                type="time"
                value={formData.meeting_time_end}
                onChange={(e) => handleInputChange('meeting_time_end', e.target.value)}
                disabled={isSubmitting}
                className="text-right"
              />
            </div>
          </div>

          {duration && (
            <div className="bg-blue-50 p-2 rounded-md border border-blue-100 text-blue-700 text-xs font-medium text-center">
              משך הפגישה: {duration}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status" className="block text-right">סטטוס</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="פעיל">פעיל</SelectItem>
                <SelectItem value="מתוכנן">מתוכנן</SelectItem>
                <SelectItem value="הושלם">הושלם</SelectItem>
                <SelectItem value="בוטל">בוטל</SelectItem>
                <SelectItem value="מבוטל">מבוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="block text-right">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="הוסף הערות לפגישה..."
              className="text-right min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90"
          >
            {isSubmitting ? 'שומר...' : isEditMode ? 'עדכן פגישה' : 'צור פגישה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};