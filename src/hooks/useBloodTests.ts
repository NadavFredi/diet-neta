/**
 * Blood Tests Hooks
 * 
 * React Query hooks for blood test file uploads and management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAppSelector } from '@/store/hooks';

// =====================================================
// Types
// =====================================================

export interface BloodTest {
  id: string;
  lead_id: string;
  file_url: string; // Storage path
  file_name: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
}

export interface BloodTestWithUrl extends BloodTest {
  signedUrl: string; // Signed URL for viewing/downloading
}

// =====================================================
// Hooks
// =====================================================

// Fetch blood tests for a lead
export const useBloodTests = (leadId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['bloodTests', leadId, user?.id],
    queryFn: async () => {
      if (!leadId) return [];
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('blood_tests')
        .select('*')
        .eq('lead_id', leadId)
        .order('upload_date', { ascending: false });

      if (error) throw error;

      // Get signed URLs for each file
      const testsWithUrls: BloodTestWithUrl[] = await Promise.all(
        (data || []).map(async (test) => {
          // Extract customer_id from file_url (format: customer_id/blood-tests/filename.pdf)
          const pathParts = test.file_url.split('/');
          if (pathParts.length < 3) {
            return { ...test, signedUrl: '' };
          }

          const { data: urlData } = await supabase.storage
            .from('client-assets')
            .createSignedUrl(test.file_url, 3600);

          return {
            ...test,
            signedUrl: urlData?.signedUrl || '',
          };
        })
      );

      return testsWithUrls;
    },
    enabled: !!leadId && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch blood tests for all leads of a customer
export const useBloodTestsForCustomer = (customerId: string | null) => {
  const { user } = useAppSelector((state) => state.auth);

  return useQuery({
    queryKey: ['bloodTestsCustomer', customerId, user?.id],
    queryFn: async () => {
      if (!customerId) return [];
      if (!user?.id) throw new Error('User not authenticated');

      // First, get all lead IDs for this customer
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .eq('customer_id', customerId);

      if (leadsError) throw leadsError;
      if (!leads || leads.length === 0) return [];

      const leadIds = leads.map(lead => lead.id);

      // Fetch all blood tests for all leads
      const { data, error } = await supabase
        .from('blood_tests')
        .select('*')
        .in('lead_id', leadIds)
        .order('upload_date', { ascending: false });

      if (error) throw error;

      // Get signed URLs for each file
      const testsWithUrls: BloodTestWithUrl[] = await Promise.all(
        (data || []).map(async (test) => {
          // Extract customer_id from file_url (format: customer_id/blood-tests/filename.pdf)
          const pathParts = test.file_url.split('/');
          if (pathParts.length < 3) {
            return { ...test, signedUrl: '' };
          }

          const { data: urlData } = await supabase.storage
            .from('client-assets')
            .createSignedUrl(test.file_url, 3600);

          return {
            ...test,
            signedUrl: urlData?.signedUrl || '',
          };
        })
      );

      return testsWithUrls;
    },
    enabled: !!customerId && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Upload a blood test PDF
export const useUploadBloodTest = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async ({
      leadId,
      file,
      customerId,
    }: {
      leadId: string;
      file: File;
      customerId: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Validate file type (PDF only)
      if (file.type !== 'application/pdf') {
        throw new Error('רק קבצי PDF נתמכים');
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('גודל הקובץ לא יכול לעלות על 10MB');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${customerId}/blood-tests/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('client-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert record in database
      const { data, error } = await supabase
        .from('blood_tests')
        .insert({
          lead_id: leadId,
          file_url: filePath,
          file_name: file.name,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) {
        // If database insert fails, try to delete the uploaded file
        await supabase.storage.from('client-assets').remove([filePath]);
        throw error;
      }

      return data as BloodTest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bloodTests', data.lead_id] });
      // Also invalidate customer-level queries
      queryClient.invalidateQueries({ queryKey: ['bloodTestsCustomer'] });
    },
  });
};

// Delete a blood test
export const useDeleteBloodTest = () => {
  const queryClient = useQueryClient();
  const { user } = useAppSelector((state) => state.auth);

  return useMutation({
    mutationFn: async (testId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get the test record to get file_url and lead_id
      const { data: test, error: fetchError } = await supabase
        .from('blood_tests')
        .select('file_url, lead_id')
        .eq('id', testId)
        .single();

      if (fetchError) throw fetchError;
      if (!test) throw new Error('Blood test not found');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('client-assets')
        .remove([test.file_url]);

      if (storageError) {
        // Continue with database delete even if storage delete fails
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('blood_tests')
        .delete()
        .eq('id', testId);

      if (deleteError) throw deleteError;

      return { testId, leadId: test.lead_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bloodTests', data.leadId] });
      // Also invalidate customer-level queries
      queryClient.invalidateQueries({ queryKey: ['bloodTestsCustomer'] });
    },
  });
};
