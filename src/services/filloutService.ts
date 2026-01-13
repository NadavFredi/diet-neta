/**
 * Fillout API Service
 * 
 * ⚠️ DEPRECATED: This service is kept for backward compatibility only.
 * 
 * All API calls now go through filloutServiceEdge.ts which calls Edge Functions.
 * This keeps API keys secure on the server side - NO keys are ever exposed to frontend.
 */

export interface FilloutConfig {
  apiKey: string;
}

export interface FilloutQuestion {
  id: string;
  name: string;
  type: string;
  value: string | number | boolean | null;
}

export interface FilloutUrlParameter {
  id: string;
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
  email?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Fillout API key from environment variables
 * ⚠️ DEPRECATED: This function should not be used - all API calls go through Edge Functions
 */
export const getFilloutConfig = (): FilloutConfig | null => {
  console.warn('[Fillout] getFilloutConfig is deprecated. All API calls should go through Edge Functions.');
  return null;
};

/**
 * Get form submissions from Fillout API via Edge Function
 */
export const getFormSubmissions = async (
  formId: string,
  filters?: FormSubmissionFilters
): Promise<FilloutFormSubmissionsResponse> => {
  // Always use Edge Function - never access API keys from frontend
  const { getFormSubmissions: getViaEdgeFunction } = await import('./filloutServiceEdge');
  return getViaEdgeFunction(formId, filters);
};

/**
 * Get a specific form submission by ID via Edge Function
 */
export const getFormSubmissionById = async (
  formId: string,
  submissionId: string
): Promise<FilloutSubmission | null> => {
  // Always use Edge Function - never access API keys from frontend
  const { getFormSubmission: getViaEdgeFunction } = await import('./filloutServiceEdge');
  return getViaEdgeFunction(formId, submissionId);
};

/**
 * Find the most recent submission for a lead via Edge Function
 */
export const findMostRecentSubmission = async (
  formId: string,
  email?: string,
  phoneNumber?: string,
  leadId?: string
): Promise<FilloutSubmission | null> => {
  // Always use Edge Function - never access API keys from frontend
  const { findMostRecentSubmission: findViaEdgeFunction } = await import('./filloutServiceEdge');
  return findViaEdgeFunction(formId, { leadId, email, phone: phoneNumber });
};
