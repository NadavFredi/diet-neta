/**
 * Fillout Service
 * 
 * Queries Fillout form submissions from the database (stored via webhook)
 * All submissions are stored in fillout_submissions table by receive-fillout-webhook
 */

import { supabase } from '@/lib/supabaseClient';

export interface FilloutQuestion {
  id: string;
  name: string;
  type: string;
  value: string | number | boolean | null;
}

export interface FilloutUrlParameter {
  id?: string;
  name: string;
  value: string;
}

export interface FilloutSubmission {
  submissionId: string;
  submissionTime: string;
  lastUpdatedAt: string;
  questions: FilloutQuestion[];
  urlParameters?: FilloutUrlParameter[];
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
 * Convert database submission to FilloutSubmission format
 */
function convertDbSubmissionToFilloutSubmission(dbSubmission: any): FilloutSubmission {
  const submissionData = dbSubmission.submission_data || {};

  // Extract questions from submission_data
  // The webhook stores form fields in various formats, we need to reconstruct questions array
  const questions: FilloutQuestion[] = [];

  // Try to extract from submission_data.questions if it exists
  if (submissionData.questions && Array.isArray(submissionData.questions)) {
    submissionData.questions.forEach((q: any) => {
      questions.push({
        id: q.id || q.name || '',
        name: q.name || q.id || '',
        type: q.type || 'text',
        value: q.value !== undefined ? q.value : null,
      });
    });
  } else {
    // Reconstruct questions from flat submission_data fields
    // Skip metadata fields
    Object.keys(submissionData).forEach((key) => {
      if (!key.startsWith('_') &&
        key !== 'formId' &&
        key !== 'submissionId' &&
        key !== 'submissionTime' &&
        key !== 'lastUpdatedAt' &&
        key !== 'urlParameters' &&
        key !== 'questions') {
        questions.push({
          id: key,
          name: key,
          type: 'text',
          value: submissionData[key],
        });
      }
    });
  }

  // Extract URL parameters
  const urlParameters: FilloutUrlParameter[] = [];
  if (submissionData.urlParameters && Array.isArray(submissionData.urlParameters)) {
    submissionData.urlParameters.forEach((param: any) => {
      urlParameters.push({
        id: param.id,
        name: param.name || param.id || '',
        value: param.value || '',
      });
    });
  }

  return {
    submissionId: dbSubmission.fillout_submission_id,
    submissionTime: dbSubmission.created_at || submissionData._submissionTime || submissionData.submissionTime || '',
    lastUpdatedAt: dbSubmission.updated_at || submissionData.lastUpdatedAt || '',
    questions,
    urlParameters: urlParameters.length > 0 ? urlParameters : undefined,
  };
}

/**
 * Get form submissions from database
 */
export const getFormSubmissions = async (
  formId: string,
  filters?: FormSubmissionFilters
): Promise<FilloutFormSubmissionsResponse> => {
  try {
    let query = supabase
      .from('fillout_submissions')
      .select('*', { count: 'exact' })
      .eq('fillout_form_id', formId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch form submissions: ${error.message}`);
    }

    const responses = (data || []).map(convertDbSubmissionToFilloutSubmission);

    return {
      responses,
      totalResponses: count || 0,
      pageCount: filters?.limit ? Math.ceil((count || 0) / filters.limit) : 1,
    };
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get a specific form submission by ID from database
 */
export const getFormSubmissionById = async (
  formId: string,
  submissionId: string
): Promise<FilloutSubmission | null> => {
  try {
    const { data, error } = await supabase
      .from('fillout_submissions')
      .select('*')
      .eq('fillout_form_id', formId)
      .eq('fillout_submission_id', submissionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch form submission: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return convertDbSubmissionToFilloutSubmission(data);
  } catch (error: any) {
    throw error;
  }
};

/**
 * Find most recent submission matching criteria
 * 
 * Matching priority:
 * 1. lead_id (most reliable) - if provided, searches all forms for that lead
 * 2. formId + lead_id (if both provided)
 * 3. phone number in form questions
 */
export const findMostRecentSubmission = async (
  formId: string,
  criteria: {
    leadId?: string;
    phone?: string;
    email?: string; // Kept for backward compatibility but not used
  }
): Promise<FilloutSubmission | null> => {
  try {
    let query = supabase
      .from('fillout_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Priority 1: Match by lead_id (if provided, search all forms for that lead)
    if (criteria.leadId) {
      query = query.eq('lead_id', criteria.leadId);
      // If formId is also provided, filter by it too
      if (formId && formId.trim() !== '') {
        query = query.eq('fillout_form_id', formId);
      }
    } else {
      // If no leadId, filter by formId
      query = query.eq('fillout_form_id', formId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find submission: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    // If leadId was provided, return the first match (already filtered)
    if (criteria.leadId) {
      // If formId was also provided, prefer exact match, otherwise return first
      if (formId && formId.trim() !== '') {
        const exactMatch = data.find(s => s.fillout_form_id === formId);
        if (exactMatch) {
          return convertDbSubmissionToFilloutSubmission(exactMatch);
        }
      }
      return convertDbSubmissionToFilloutSubmission(data[0]);
    }

    // Priority 2: Match by phone number in submission_data
    if (criteria.phone) {
      const searchPhone = String(criteria.phone).replace(/\D/g, '');

      for (const submission of data) {
        const submissionData = submission.submission_data || {};

        // Check all fields for phone number
        for (const key in submissionData) {
          const value = submissionData[key];
          if (typeof value === 'string') {
            const submissionPhone = value.replace(/\D/g, '');
            if (submissionPhone === searchPhone ||
              submissionPhone.endsWith(searchPhone) ||
              searchPhone.endsWith(submissionPhone)) {
              return convertDbSubmissionToFilloutSubmission(submission);
            }
          }
        }

        // Also check questions array
        if (submissionData.questions && Array.isArray(submissionData.questions)) {
          for (const q of submissionData.questions) {
            const name = String(q.name || '').toLowerCase();
            const value = String(q.value || '');
            if ((name.includes('phone') || name.includes('טלפון')) && value) {
              const submissionPhone = value.replace(/\D/g, '');
              if (submissionPhone === searchPhone ||
                submissionPhone.endsWith(searchPhone) ||
                searchPhone.endsWith(submissionPhone)) {
                return convertDbSubmissionToFilloutSubmission(submission);
              }
            }
          }
        }
      }
    }

    // If no match found, return null
    return null;
  } catch (error: any) {
    throw error;
  }
};

/**
 * Get all submissions for a lead (regardless of form ID)
 * Useful for displaying all form submissions for a lead
 */
export const getAllSubmissionsForLead = async (
  leadId: string
): Promise<FilloutSubmission[]> => {
  try {
    const { data, error } = await supabase
      .from('fillout_submissions')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    return (data || []).map(convertDbSubmissionToFilloutSubmission);
  } catch (error: any) {
    throw error;
  }
};
