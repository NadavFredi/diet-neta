/**
 * AddMeetingDialog Component
 * 
 * Dialog for creating a new meeting linked to a lead/customer.
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface AddMeetingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  customerId?: string | null;
  onMeetingCreated?: () => void | Promise<void>;
}

export const AddMeetingDialog = ({
  isOpen,
  onOpenChange,
  leadId,
  customerId,
  onMeetingCreated,
}: AddMeetingDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get today's date in YYYY-MM-DD format for default
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const defaultTime = format(today, 'HH:mm');

  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    lead_id: leadId || '',
    meeting_date: todayStr,
    meeting_time_start: defaultTime,
    meeting_time_end: '',
    status: 'פעיל',
    meeting_type: '',
  });

  // Reset form when dialog opens/closes or IDs change
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const defaultTime = format(today, 'HH:mm');
      
      setFormData({
        customer_id: customerId || '',
        lead_id: leadId || '',
        meeting_date: todayStr,
        meeting_time_start: defaultTime,
        meeting_time_end: '',
        status: 'פעיל',
        meeting_type: '',
      });
    }
  }, [isOpen, leadId, customerId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.customer_id && !formData.lead_id) {
      toast({
        title: 'שגיאה',
        description: 'יש לבחור לקוח או ליד',
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
          customer_id: formData.customer_id || null,
          lead_id: formData.lead_id || null,
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
      console.error('Error creating meeting:', error);
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
            צור פגישה חדשה המקושרת ללקוח/ליד
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meeting_date">תאריך פגישה *</Label>
            <Input
              id="meeting_date"
              type="date"
              value={formData.meeting_date}
              onChange={(e) => handleInputChange('meeting_date', e.target.value)}
              disabled={isSubmitting}
            />
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
                <SelectItem value="פגישת תקציב">פגישת תקציב</SelectItem>
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
