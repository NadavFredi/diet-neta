/**
 * Fillout Service (Edge Function Wrapper)
 * 
 * Frontend service that calls the fillout-api Edge Function
 * This keeps the API key secure on the server side
 */

import { supabase } from '@/lib/supabaseClient';

export interface FilloutSubmission {
  submissionId: string;
  submissionTime: string;
  lastUpdatedAt: string;
  questions: Array<{
    id: string;
    name: string;
    type: string;
    value: string | number | null;
  }>;
  urlParameters?: Array<{
    name: string;
    value: string;
  }>;
}

export interface FilloutFormSubmissionsResponse {
  responses: FilloutSubmission[];
  totalResponses: number;
  pageCount: number;
}

export interface FormSubmissionFilters {
  limit?: number;
  offset?: number;
  sort?: string;
}

/**
 * Get form submissions from Fillout API via Edge Function
 */
export const getFormSubmissions = async (
  formId: string,
  filters?: FormSubmissionFilters
): Promise<FilloutFormSubmissionsResponse> => {
  try {
    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated. Please log in to fetch form submissions.');
    }

    // Call Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/fillout-api`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'getFormSubmissions',
        formId,
        filters,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Failed to fetch form submissions: ${response.status}`);
    }

    return result.data;
  } catch (error: any) {
    console.error('[Fillout] Error fetching form submissions:', error);
    throw error;
  }
};

/**
 * Get a specific form submission by ID
 */
export const getFormSubmission = async (
  formId: string,
  submissionId: string
): Promise<FilloutSubmission | null> => {
  try {
    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated. Please log in to fetch form submission.');
    }

    // Call Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/fillout-api`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'getSubmission',
        formId,
        submissionId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Failed to fetch form submission: ${response.status}`);
    }

    return result.data;
  } catch (error: any) {
    console.error('[Fillout] Error fetching form submission:', error);
    throw error;
  }
};

/**
 * Find most recent submission matching criteria
 * Note: This function fetches all submissions and filters client-side
 * For better performance, consider implementing server-side filtering in the Edge Function
 */
export const findMostRecentSubmission = async (
  formId: string,
  criteria: {
    leadId?: string;
    email?: string;
    phone?: string;
  }
): Promise<FilloutSubmission | null> => {
  try {
    // Get all submissions and filter client-side
    const response = await getFormSubmissions(formId, { limit: 100 });
    
    // Filter submissions based on criteria
    for (const submission of response.responses) {
      // Check lead_id in urlParameters
      if (criteria.leadId) {
        const leadIdParam = submission.urlParameters?.find(p => p.name === 'lead_id' || p.name === 'leadId');
        if (leadIdParam && leadIdParam.value === criteria.leadId) {
          return submission;
        }
      }

      // Check email in questions
      if (criteria.email) {
        const normalizedEmail = criteria.email.toLowerCase().trim();
        const emailQuestion = submission.questions.find(q => 
          q.name?.toLowerCase().includes('email') || 
          q.type === 'EmailInput'
        );
        if (emailQuestion?.value && String(emailQuestion.value).toLowerCase().trim() === normalizedEmail) {
          return submission;
        }
      }

      // Check phone in questions
      if (criteria.phone) {
        const normalizedPhone = criteria.phone.replace(/\D/g, '');
        const phoneQuestion = submission.questions.find(q => 
          q.name?.toLowerCase().includes('phone') || 
          q.type === 'PhoneNumberInput'
        );
        if (phoneQuestion?.value) {
          const submissionPhone = String(phoneQuestion.value).replace(/\D/g, '');
          if (submissionPhone === normalizedPhone || submissionPhone.endsWith(normalizedPhone)) {
            return submission;
          }
        }
      }
    }

    return null;
  } catch (error: any) {
    console.error('[Fillout] Error finding submission:', error);
    throw error;
  }
};
