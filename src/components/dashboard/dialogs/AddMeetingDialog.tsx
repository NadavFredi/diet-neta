/**
 * AddMeetingDialog Component
 * 
 * Dialog for creating a new meeting linked to a lead.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AddMeetingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  onMeetingCreated?: () => void | Promise<void>;
  initialDate?: Date | null;
}

export const AddMeetingDialog = ({
  isOpen,
  onOpenChange,
  leadId,
  onMeetingCreated,
  initialDate,
}: AddMeetingDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch leads for selection (only when not pre-filled)
  const [leads, setLeads] = useState<Array<{ id: string; customer_id: string; customer?: { full_name: string; phone?: string } }>>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Fetch leads when dialog opens and no leadId is provided
  useEffect(() => {
    if (isOpen && !leadId) {
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
  }, [isOpen, leadId]);

  // Get today's date in YYYY-MM-DD format for default
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight
  const todayStr = format(today, 'yyyy-MM-dd');
  const defaultTime = format(today, 'HH:mm');

  const [formData, setFormData] = useState({
    lead_id: leadId || '',
    meeting_date: todayStr,
    meeting_time_start: defaultTime,
    meeting_time_end: '',
    status: 'פעיל',
    meeting_type: '',
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);

  // Reset form when dialog opens/closes or IDs change
  useEffect(() => {
    if (isOpen) {
      const dateToUse = initialDate ? new Date(initialDate) : new Date();
      // Only reset hours if initialDate wasn't provided (preserve hour from click)
      if (!initialDate) {
        dateToUse.setHours(0, 0, 0, 0);
      }
      const dateStr = format(dateToUse, 'yyyy-MM-dd');
      const defaultTime = format(dateToUse, 'HH:mm');
      
      setFormData({
        lead_id: leadId || '',
        meeting_date: dateStr,
        meeting_time_start: defaultTime,
        meeting_time_end: '',
        status: 'פעיל',
        meeting_type: '',
      });
      setSelectedDate(dateToUse);
    }
  }, [isOpen, leadId, initialDate]);

  // Update formData when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setFormData((prev) => ({ ...prev, meeting_date: dateStr }));
    }
  }, [selectedDate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.lead_id) {
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
      // Build meeting_data JSONB object
      const meetingData: Record<string, any> = {
        'תאריך': formData.meeting_date,
        'תאריך פגישה': formData.meeting_date,
        date: formData.meeting_date,
        meeting_date: formData.meeting_date,
        'סטטוס': formData.status,
        status: formData.status,
      };

      // Add meeting type if provided
      if (formData.meeting_type) {
        meetingData['סוג פגישה'] = formData.meeting_type;
        meetingData.meeting_type = formData.meeting_type;
        meetingData.type = formData.meeting_type;
      }

      // Always create eventStartTime from date (for MeetingDetailView compatibility)
      // If no time is provided, use 00:00:00 (midnight)
      if (formData.meeting_date) {
        if (formData.meeting_time_start) {
          // Parse the time (HH:mm format)
          const [hours, minutes] = formData.meeting_time_start.split(':');
          const startDateTime = new Date(`${formData.meeting_date}T${hours}:${minutes}:00`);
          const startDateTimeISO = startDateTime.toISOString();
          
          meetingData['שעה'] = formData.meeting_time_end 
            ? `${formData.meeting_time_start} - ${formData.meeting_time_end}`
            : formData.meeting_time_start;
          meetingData.meeting_time = formData.meeting_time_end 
            ? `${formData.meeting_time_start} - ${formData.meeting_time_end}`
            : formData.meeting_time_start;
          
          // Add structured time fields (for backward compatibility)
          meetingData.time_start = formData.meeting_time_start;
          
          // Add ISO date-time strings (for MeetingDetailView compatibility)
          meetingData.event_start_time = startDateTimeISO;
          meetingData.eventStartTime = startDateTimeISO;
          
          if (formData.meeting_time_end) {
            const [endHours, endMinutes] = formData.meeting_time_end.split(':');
            const endDateTime = new Date(`${formData.meeting_date}T${endHours}:${endMinutes}:00`);
            const endDateTimeISO = endDateTime.toISOString();
            
            meetingData.time_end = formData.meeting_time_end;
            meetingData.event_end_time = endDateTimeISO;
            meetingData.eventEndTime = endDateTimeISO;
          }
        } else {
          // No time provided, use midnight (00:00:00) for the date
          const startDateTime = new Date(`${formData.meeting_date}T00:00:00`);
          const startDateTimeISO = startDateTime.toISOString();
          
          meetingData.event_start_time = startDateTimeISO;
          meetingData.eventStartTime = startDateTimeISO;
        }
      }

      const { data, error } = await supabase
        .from('meetings')
        .insert({
          lead_id: formData.lead_id,
          meeting_data: meetingData,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'הצלחה',
        description: 'הפגישה נוצרה בהצלחה',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['meetings'] });

      // Call callback if provided
      if (onMeetingCreated) {
        await onMeetingCreated();
      }

      // Close dialog
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error?.message || 'לא ניתן ליצור את הפגישה. אנא נסה שוב.',
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>צור פגישה חדשה</DialogTitle>
          <DialogDescription>
            צור פגישה חדשה המקושרת לליד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lead selection - show when not pre-filled from props */}
          {!leadId && (
            <div className="space-y-2">
              <Label htmlFor="lead_id">ליד *</Label>
              {leads.length > 5 ? (
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
                          {leads.length === 0 && !isLoadingLeads ? (
                            <CommandItem value="no-leads" disabled>אין לידים זמינים</CommandItem>
                          ) : (
                            leads.map((lead) => (
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
                            ))
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Select
                  value={formData.lead_id || 'none'}
                  onValueChange={(value) => handleInputChange('lead_id', value === 'none' ? '' : value)}
                  disabled={isSubmitting || isLoadingLeads}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingLeads ? "טוען לידים..." : "בחר ליד"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא ליד</SelectItem>
                    {leads.length === 0 && !isLoadingLeads ? (
                      <SelectItem value="no-leads" disabled>אין לידים זמינים</SelectItem>
                    ) : (
                      leads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.customer?.full_name || `ליד #${lead.id.slice(0, 8)}`}
                          {lead.customer?.phone ? ` - ${lead.customer.phone}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              {isLoadingLeads && (
                <p className="text-xs text-muted-foreground">טוען רשימת לידים...</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="meeting_date">תאריך פגישה *</Label>
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
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4 p-4",
                    caption: "flex justify-center pt-1 relative items-center mb-4",
                    caption_label: "text-sm font-semibold text-gray-900",
                    nav: "space-x-1 flex items-center",
                    nav_button: cn(
                      "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-gray-100 rounded-md transition-colors"
                    ),
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex mb-2",
                    head_cell: "text-gray-500 rounded-md w-10 font-medium text-xs",
                    row: "flex w-full mt-1",
                    cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                    day: cn(
                      "h-10 w-10 p-0 font-normal rounded-md transition-all hover:bg-gray-100 aria-selected:opacity-100"
                    ),
                    day_range_end: "day-range-end",
                    day_selected:
                      "!bg-[#5B6FB9] !text-white hover:!bg-[#5B6FB9]/90 hover:!text-white focus:!bg-[#5B6FB9] focus:!text-white font-semibold shadow-md",
                    day_today: "bg-blue-50 text-[#5B6FB9] font-semibold",
                    day_outside:
                      "day-outside text-gray-400 opacity-50 aria-selected:bg-gray-100 aria-selected:text-gray-500 aria-selected:opacity-30",
                    day_disabled: "text-gray-300 opacity-50 cursor-not-allowed",
                    day_range_middle:
                      "aria-selected:bg-blue-100 aria-selected:text-blue-900",
                    day_hidden: "invisible",
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_type">סוג פגישה</Label>
            <Select
              value={formData.meeting_type}
              onValueChange={(value) => handleInputChange('meeting_type', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג פגישה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="פגישת התאמה">פגישת התאמה</SelectItem>
                <SelectItem value="פגישת תכנית פעולה">פגישת תכנית פעולה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meeting_time_start">שעת התחלה</Label>
              <Input
                id="meeting_time_start"
                type="time"
                value={formData.meeting_time_start}
                onChange={(e) => handleInputChange('meeting_time_start', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting_time_end">שעת סיום</Label>
              <Input
                id="meeting_time_end"
                type="time"
                value={formData.meeting_time_end}
                onChange={(e) => handleInputChange('meeting_time_end', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">סטטוס</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange('status', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="פעיל">פעיל</SelectItem>
                <SelectItem value="מתוכנן">מתוכנן</SelectItem>
                <SelectItem value="הושלם">הושלם</SelectItem>
                <SelectItem value="בוטל">בוטל</SelectItem>
                <SelectItem value="מבוטל">מבוטל</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
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
          >
            {isSubmitting ? 'יוצר...' : 'צור פגישה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
