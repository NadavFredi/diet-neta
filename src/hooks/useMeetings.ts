import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface Meeting {
  id: string;
  lead_id: string | null;
  customer_id: string | null;
  fillout_submission_id: string | null;
  meeting_data: Record<string, any>; // JSONB data from Fillout
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  lead?: {
    id: string;
    customer_id: string;
  } | null;
  customer?: {
    id: string;
    full_name: string;
    phone: string;
    email: string | null;
  } | null;
}

// Fetch all meetings with joined lead and customer data
export const useMeetings = () => {
  return useQuery({
    queryKey: ['meetings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          lead:leads(id, customer_id),
          customer:customers(id, full_name, phone, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Meeting[];
    },
  });
};

// Fetch a single meeting by ID
export const useMeeting = (meetingId: string | null) => {
  return useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;

      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          lead:leads(id, customer_id),
          customer:customers(id, full_name, phone, email)
        `)
        .eq('id', meetingId)
        .single();

      if (error) throw error;
      return data as Meeting;
    },
    enabled: !!meetingId,
  });
};

