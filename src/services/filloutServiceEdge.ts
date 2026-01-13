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
    
    console.log('[Fillout] Edge Function response structure:', {
      hasResponses: !!filloutResponse?.responses,
      responsesCount: filloutResponse?.responses?.length || 0,
      totalResponses: filloutResponse?.totalResponses,
      firstResponseSample: filloutResponse?.responses?.[0] ? {
        submissionId: filloutResponse.responses[0].submissionId,
        questionsCount: filloutResponse.responses[0].questions?.length || 0,
        questions: filloutResponse.responses[0].questions?.map((q: any) => ({
          id: q.id,
          name: q.name,
          type: q.type,
          value: q.value,
        })) || [],
      } : null,
    });
    
    return filloutResponse;
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
    // Normalize criteria object - handle any weird structure issues
    const normalizedCriteria = {
      leadId: typeof criteria === 'object' && criteria !== null 
        ? (criteria.leadId || (criteria as any).email?.leadId || undefined)
        : undefined,
      phone: typeof criteria === 'object' && criteria !== null
        ? (criteria.phone || (criteria as any).email?.phone || undefined)
        : undefined,
    };
    
    console.log('[findMostRecentSubmission] ========== FUNCTION CALLED ==========');
    console.log('[findMostRecentSubmission] Original criteria:', JSON.stringify(criteria, null, 2));
    console.log('[findMostRecentSubmission] Normalized criteria:', JSON.stringify(normalizedCriteria, null, 2));
    console.log('[findMostRecentSubmission] leadId to search for:', normalizedCriteria.leadId || 'NOT PROVIDED');
    console.log('[findMostRecentSubmission] phone to search for:', normalizedCriteria.phone || 'NOT PROVIDED');
    const response = await getFormSubmissions(formId, { limit: 100 });
    console.log('[findMostRecentSubmission] Received submissions:', {
      totalResponses: response.totalResponses,
      responsesCount: response.responses?.length || 0,
      allSubmissions: response.responses?.map((s: any) => ({
        submissionId: s.submissionId,
        urlParameters: s.urlParameters,
        leadIdInParams: s.urlParameters?.find((p: any) => 
          p.name === 'lead_id' || p.id === 'lead_id' || p.name?.toLowerCase() === 'lead_id'
        )?.value || 'NO LEAD_ID',
        phoneQuestion: s.questions?.find((q: any) => 
          q.name?.toLowerCase().includes('טלפון') || 
          q.type === 'PhoneNumber' ||
          q.type?.toLowerCase() === 'phonenumber'
        )?.value || 'NO PHONE',
      })) || [],
    });
    
    // Filter submissions based on criteria
    // Priority: leadId (most reliable) > phone (email matching removed)
    console.log('[findMostRecentSubmission] Searching for submission:', {
      formId,
      criteria: {
        leadId: criteria.leadId || 'NOT PROVIDED',
        phone: criteria.phone || 'NOT PROVIDED',
        email: 'ignored (matching disabled)',
      },
      totalSubmissions: response.responses.length,
      submissionLeadIds: response.responses.map((s: any) => {
        const leadIdParam = s.urlParameters?.find((p: any) => 
          p.name === 'lead_id' || p.id === 'lead_id' || p.name?.toLowerCase() === 'lead_id'
        );
        return {
          submissionId: s.submissionId,
          leadId: leadIdParam?.value || 'NO LEAD_ID',
          urlParams: s.urlParameters,
        };
      }),
      submissionPhones: response.responses.map((s: any) => {
        const phoneQ = s.questions?.find((q: any) => 
          q.name?.toLowerCase().includes('טלפון') || 
          q.type === 'PhoneNumber' ||
          q.type?.toLowerCase() === 'phonenumber'
        );
        return {
          submissionId: s.submissionId,
          phone: phoneQ?.value || 'NO PHONE',
        };
      }),
    });

    console.log('[findMostRecentSubmission] ========== STARTING TO CHECK SUBMISSIONS ==========');
    console.log('[findMostRecentSubmission] Total submissions to check:', response.responses.length);
    
    // SIMPLE MATCHING: If leadId is provided, match by leadId only
    if (normalizedCriteria.leadId) {
      const searchLeadId = String(normalizedCriteria.leadId).trim();
      console.log('[findMostRecentSubmission] Searching for leadId:', searchLeadId);
      
      for (const submission of response.responses) {
        console.log(`[findMostRecentSubmission] Checking submission ${submission.submissionId}`);
        
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
            
            if (isLeadIdParam) {
              console.log('[findMostRecentSubmission] Found lead_id parameter:', {
                paramName: param.name,
                paramId: param.id,
                paramValue,
                searchLeadId,
                match: paramValue === searchLeadId,
              });
              
              if (paramValue === searchLeadId) {
                console.log('[findMostRecentSubmission] ✅ MATCH FOUND by leadId!', {
                  submissionId: submission.submissionId,
                  leadId: searchLeadId,
                });
                return submission;
              }
            }
          }
        }
      }
    }
    
    // Fallback to phone matching if leadId didn't match
    if (normalizedCriteria.phone && !normalizedCriteria.leadId) {
      const searchPhone = String(normalizedCriteria.phone).replace(/\D/g, '');
      console.log('[findMostRecentSubmission] No leadId match, trying phone:', searchPhone);
      
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
              console.log('[findMostRecentSubmission] ✅ MATCH FOUND by phone!', {
                submissionId: submission.submissionId,
                phone: searchPhone,
              });
              return submission;
            }
          }
        }
      }
    }
    

    console.log('[findMostRecentSubmission] ❌ No matching submission found');
    console.log('[findMostRecentSubmission] Searched for leadId:', normalizedCriteria.leadId || 'NOT PROVIDED');
    console.log('[findMostRecentSubmission] Searched for phone:', normalizedCriteria.phone || 'NOT PROVIDED');
    console.log('[findMostRecentSubmission] Checked submissions:', response.responses.length);
    
    // Log all lead_ids found in submissions for debugging
    const allLeadIds = response.responses.map((s: any) => {
      if (s.urlParameters && Array.isArray(s.urlParameters)) {
        for (const param of s.urlParameters) {
          const paramName = String(param.name || '').toLowerCase().trim();
          const paramId = String(param.id || '').toLowerCase().trim();
          if (paramName === 'lead_id' || paramId === 'lead_id' || 
              paramName === 'leadid' || paramId === 'leadid') {
            return {
              submissionId: s.submissionId,
              leadId: param.value,
              paramName: param.name,
              paramId: param.id,
            };
          }
        }
      }
      return null;
    }).filter(Boolean);
    
    console.log('[findMostRecentSubmission] All lead_ids found in submissions:', allLeadIds);

    return null;
  } catch (error: any) {
    console.error('[Fillout] Error finding submission:', error);
    throw error;
  }
};
