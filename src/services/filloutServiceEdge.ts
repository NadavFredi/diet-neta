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

    // The Edge Function returns { success: true, data: {...} }
    // The data contains the Fillout API response directly
    const filloutResponse = result.data;
    
    return filloutResponse;
  } catch (error: any) {
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
    // Normalize criteria object - handle any weird structure issues
    const normalizedCriteria = {
      leadId: typeof criteria === 'object' && criteria !== null 
        ? (criteria.leadId || (criteria as any).email?.leadId || undefined)
        : undefined,
      phone: typeof criteria === 'object' && criteria !== null
        ? (criteria.phone || (criteria as any).email?.phone || undefined)
        : undefined,
    };
    
    const response = await getFormSubmissions(formId, { limit: 100 });
    
    // SIMPLE MATCHING: If leadId is provided, match by leadId only
    if (normalizedCriteria.leadId) {
      const searchLeadId = String(normalizedCriteria.leadId).trim();
      
      for (const submission of response.responses) {
        // Check all URL parameters for lead_id
        if (submission.urlParameters && Array.isArray(submission.urlParameters)) {
          for (const param of submission.urlParameters) {
            const paramName = String(param.name || '').toLowerCase().trim();
            const paramId = String(param.id || '').toLowerCase().trim();
            const paramValue = String(param.value || '').trim();
            
            // Check if this parameter is lead_id (any variation)
            const isLeadIdParam = paramName === 'lead_id' || 
                                 paramName === 'leadid' || 
                                 paramName === 'lead-id' ||
                                 paramId === 'lead_id' ||
                                 paramId === 'leadid' ||
                                 paramId === 'lead-id';
            
            if (isLeadIdParam && paramValue === searchLeadId) {
              return submission;
            }
          }
        }
      }
    }
    
    // Fallback to phone matching if leadId didn't match
    if (normalizedCriteria.phone && !normalizedCriteria.leadId) {
      const searchPhone = String(normalizedCriteria.phone).replace(/\D/g, '');
      
      for (const submission of response.responses) {
        // Phone matching logic (simplified)
        if (submission.questions && Array.isArray(submission.questions)) {
          const phoneQuestion = submission.questions.find(q => {
            const name = String(q.name || '').toLowerCase();
            const type = String(q.type || '').toLowerCase();
            return name.includes('phone') || name.includes('טלפון') || type === 'phonenumber';
          });
          
          if (phoneQuestion) {
            const submissionPhone = String(phoneQuestion.value || '').replace(/\D/g, '');
            if (submissionPhone === searchPhone || 
                submissionPhone.endsWith(searchPhone) || 
                searchPhone.endsWith(submissionPhone)) {
              return submission;
            }
          }
        }
      }
    }

    return null;
  } catch (error: any) {
    throw error;
  }
};
