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
 * 
 * Matching priority:
 * 1. lead_id in URL parameters (most reliable)
 * 2. phone number in form questions
 * Email matching is disabled - only lead_id and phone are used
 */
export const findMostRecentSubmission = async (
  formId: string,
  criteria: {
    leadId?: string;
    phone?: string;
    // email parameter kept for backward compatibility but not used for matching
    email?: string;
  }
): Promise<FilloutSubmission | null> => {
  try {
    // Get all submissions and filter client-side
    console.log('[findMostRecentSubmission] Starting search:', { formId, criteria });
    const response = await getFormSubmissions(formId, { limit: 100 });
    console.log('[findMostRecentSubmission] Received submissions:', {
      totalResponses: response.totalResponses,
      responsesCount: response.responses?.length || 0,
      firstSubmission: response.responses?.[0] ? {
        submissionId: response.responses[0].submissionId,
        urlParameters: response.responses[0].urlParameters,
        questionCount: response.responses[0].questions?.length || 0,
      } : null,
    });
    
    // Filter submissions based on criteria
    // Priority: leadId (most reliable) > phone (email matching removed)
    console.log('[findMostRecentSubmission] Searching for submission:', {
      formId,
      criteria: {
        leadId: criteria.leadId ? 'provided' : 'not provided',
        phone: criteria.phone ? 'provided' : 'not provided',
        email: 'ignored (matching disabled)',
      },
      totalSubmissions: response.responses.length,
    });

    for (const submission of response.responses) {
      // Priority 1: Check lead_id in urlParameters (most reliable)
      if (criteria.leadId) {
        const leadIdParam = submission.urlParameters?.find(
          p => p.name === 'lead_id' || p.name === 'leadId' || p.name === 'lead-id'
        );
        if (leadIdParam && leadIdParam.value === criteria.leadId) {
          console.log('[findMostRecentSubmission] ✅ Found match by leadId:', {
            submissionId: submission.submissionId,
            leadId: criteria.leadId,
            matchedParam: leadIdParam.name,
          });
          return submission;
        }
      }

      // Priority 2: Check phone in questions (email matching removed)
      if (criteria.phone) {
        const normalizedPhone = criteria.phone.replace(/\D/g, '');
        const phoneQuestion = submission.questions.find(q => 
          q.name?.toLowerCase().includes('phone') || 
          q.name?.toLowerCase().includes('טלפון') ||
          q.name?.toLowerCase().includes('נייד') ||
          q.type === 'PhoneNumberInput' ||
          q.id?.toLowerCase().includes('phone') ||
          q.id?.toLowerCase().includes('tel')
        );
        if (phoneQuestion?.value) {
          const submissionPhone = String(phoneQuestion.value).replace(/\D/g, '');
          // Match if exact match, or one ends with the other (handles country code variations)
          if (submissionPhone === normalizedPhone || 
              submissionPhone.endsWith(normalizedPhone) || 
              normalizedPhone.endsWith(submissionPhone) ||
              // Also check if last 9 digits match (Israeli phone numbers)
              (submissionPhone.length >= 9 && normalizedPhone.length >= 9 && 
               submissionPhone.slice(-9) === normalizedPhone.slice(-9))) {
            console.log('[findMostRecentSubmission] ✅ Found match by phone:', {
              submissionId: submission.submissionId,
              phone: criteria.phone,
              normalizedPhone,
              submissionPhone,
            });
            return submission;
          }
        }
      }
    }

    console.log('[findMostRecentSubmission] ❌ No matching submission found:', {
      formId,
      criteria,
      checkedSubmissions: response.responses.length,
    });

    return null;
  } catch (error: any) {
    console.error('[Fillout] Error finding submission:', error);
    throw error;
  }
};
