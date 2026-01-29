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
  formId: string;
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
  console.log('[Fillout] convertDbSubmissionToFilloutSubmission', { fillout_form_id: dbSubmission?.fillout_form_id, fillout_submission_id: dbSubmission?.fillout_submission_id });
  const submissionData = dbSubmission.submission_data || {};

  // Extract questions from submission_data
  // The webhook stores form fields in various formats, we need to reconstruct questions array
  const questions: FilloutQuestion[] = [];
  const questionKeys = new Set<string>(); // Track which keys we've already added

  // First, try to extract from submission_data.questions if it exists
  if (submissionData.questions && Array.isArray(submissionData.questions)) {
    submissionData.questions.forEach((q: any) => {
      const questionId = q.id || q.name || '';
      const questionName = q.name || q.id || '';
      if (questionId || questionName) {
        questions.push({
          id: questionId,
          name: questionName,
          type: q.type || 'text',
          value: q.value !== undefined ? q.value : null,
        });
        // Track that we've added this question
        questionKeys.add(questionId.toLowerCase());
        questionKeys.add(questionName.toLowerCase());
      }
    });
  }

  // Then, reconstruct questions from flat submission_data fields
  // This ensures we capture ALL fields, even if they weren't in the questions array
  // Skip metadata fields and fields we've already added
  Object.keys(submissionData).forEach((key) => {
    // Skip metadata fields
    if (key.startsWith('_') ||
      key === 'formId' ||
      key === 'submissionId' ||
      key === 'submissionTime' ||
      key === 'lastUpdatedAt' ||
      key === 'urlParameters' ||
      key === 'questions' ||
      key === '_rawWebhookPayload') {
      return;
    }

    // Skip if we've already added this field as a question
    if (questionKeys.has(key.toLowerCase())) {
      return;
    }

    // Skip if value is null, undefined, or empty object
    const value = submissionData[key];
    if (value === null || value === undefined) {
      return;
    }

    // Skip complex nested objects (but include arrays and primitives)
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
      // For nested objects, we might want to stringify them or skip them
      // For now, let's include them as stringified JSON
      questions.push({
        id: key,
        name: key,
        type: 'text',
        value: JSON.stringify(value, null, 2),
      });
    } else {
      // Add the field as a question
      questions.push({
        id: key,
        name: key,
        type: 'text',
        value: value,
      });
    }
  });

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

  console.log('[Fillout] convertDbSubmissionToFilloutSubmission result', { submissionId: dbSubmission.fillout_submission_id, formId: dbSubmission.fillout_form_id, questionsCount: questions.length });
  return {
    submissionId: dbSubmission.fillout_submission_id,
    formId: dbSubmission.fillout_form_id || '',
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

// Fallback form IDs when env vars are not set (e.g. production build without env)
// These match the forms used in the app so submissions still show
const FALLBACK_FORM_IDS = {
  INTRO: 'jHNYYKDSGpus',       // שאלון התאמה (priorcall)
  MEETING: 'n5VwsjFk5ous',      // פגישת התאמה
  CHARACTERIZATION: '23ggw4DEs7us',
};

/**
 * Get form submissions for a lead grouped by form type
 * Returns a map of form type keys ('details' | 'intro' | 'characterization' | 'meeting' | 'other_*') to submissions
 */
export const getFormSubmissionsByTypeForLead = async (
  leadId: string
): Promise<Record<string, FilloutSubmission>> => {
  try {
    console.log('[Fillout] getFormSubmissionsByTypeForLead called', { leadId });

    // Get form IDs from environment variables, with fallbacks so production still shows submissions
    const formIds = {
      DETAILS: import.meta.env.VITE_FILLOUT_FORM_ID_DETAILS || '',
      INTRO: import.meta.env.VITE_FILLOUT_FORM_ID_INTRO || FALLBACK_FORM_IDS.INTRO,
      CHARACTERIZATION: import.meta.env.VITE_FILLOUT_FORM_ID_CHARACTERIZATION || FALLBACK_FORM_IDS.CHARACTERIZATION,
      MEETING: import.meta.env.VITE_FILLOUT_FORM_ID_MEETING || FALLBACK_FORM_IDS.MEETING,
    };

    // Create a reverse map: formId -> formType key
    const formIdToTypeMap: Record<string, string> = {};
    if (formIds.DETAILS) formIdToTypeMap[formIds.DETAILS] = 'details';
    if (formIds.INTRO) formIdToTypeMap[formIds.INTRO] = 'intro';
    if (formIds.CHARACTERIZATION) formIdToTypeMap[formIds.CHARACTERIZATION] = 'characterization';
    if (formIds.MEETING) formIdToTypeMap[formIds.MEETING] = 'meeting';
    console.log('[Fillout] formIdToTypeMap', formIdToTypeMap);

    // Query database for all submissions for this lead
    const { data, error } = await supabase
      .from('fillout_submissions')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Fillout] getFormSubmissionsByTypeForLead error', { leadId, error: error.message });
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    console.log('[Fillout] fillout_submissions query result', { leadId, rowCount: data?.length ?? 0, rawIds: data?.map((r: any) => r.id) });

    if (!data || data.length === 0) {
      return {};
    }

    // Group submissions by form type; get the most recent one per type
    const submissionsByType: Record<string, FilloutSubmission> = {};

    for (const dbSubmission of data) {
      const formId = dbSubmission.fillout_form_id;
      const formType = formIdToTypeMap[formId] || `other_${formId}`;

      if (!submissionsByType[formType]) {
        submissionsByType[formType] = convertDbSubmissionToFilloutSubmission(dbSubmission);
        console.log('[Fillout] mapped submission to type', { formId, formType, submissionId: dbSubmission.fillout_submission_id });
      }
    }

    console.log('[Fillout] getFormSubmissionsByTypeForLead result keys', { leadId, keys: Object.keys(submissionsByType) });
    return submissionsByType;
  } catch (error: any) {
    console.error('[Fillout] getFormSubmissionsByTypeForLead throw', { leadId, message: error?.message });
    throw error;
  }
};
