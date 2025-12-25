/**
 * Fillout API Service
 * 
 * Service for fetching form submissions from Fillout API
 * Uses environment variables for configuration
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

export interface FilloutSubmission {
  submissionId: string;
  submissionTime: string;
  lastUpdatedAt: string;
  questions: FilloutQuestion[];
}

export interface FilloutFormSubmissionsResponse {
  responses: FilloutSubmission[];
  totalResponses: number;
  pageCount: number;
}

export interface FormSubmissionFilters {
  email?: string; // Filter by email to match with lead
  limit?: number;
  offset?: number;
}

/**
 * Get Fillout API key from environment variables
 */
export const getFilloutConfig = (): FilloutConfig | null => {
  const apiKey = import.meta.env.VITE_FILLOUT_API_KEY;

  if (!apiKey) {
    console.warn('[Fillout] Missing VITE_FILLOUT_API_KEY environment variable');
    return null;
  }

  return { apiKey };
};

/**
 * Get form submissions from Fillout API
 * @param formId - The Fillout form ID
 * @param filters - Optional filters including email to match submissions
 */
export const getFormSubmissions = async (
  formId: string,
  filters?: FormSubmissionFilters
): Promise<FilloutFormSubmissionsResponse> => {
  try {
    const config = getFilloutConfig();
    
    if (!config) {
      throw new Error('Fillout API configuration not found. Please check environment variables.');
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.offset) {
      params.append('offset', filters.offset.toString());
    }
    
    // Note: Fillout API doesn't have direct email filtering in the API
    // We'll filter by email client-side after fetching
    const queryString = params.toString();
    const url = `https://api.fillout.com/v1/api/forms/${formId}/submissions${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: FilloutFormSubmissionsResponse = await response.json();
    
    // Note: Email filtering is handled in findMostRecentSubmission function
    // This function doesn't filter by email to allow fetching all submissions

    return data;
  } catch (error: any) {
    console.error('[Fillout] Error fetching form submissions:', error);
    throw error;
  }
};

/**
 * Get a specific form submission by ID
 */
export const getFormSubmissionById = async (
  formId: string,
  submissionId: string
): Promise<FilloutSubmission | null> => {
  try {
    const config = getFilloutConfig();
    
    if (!config) {
      throw new Error('Fillout API configuration not found');
    }

    const url = `https://api.fillout.com/v1/api/forms/${formId}/submissions/${submissionId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[Fillout] Error fetching form submission:', error);
    throw error;
  }
};

/**
 * Find the most recent submission for a lead (by email)
 */
export const findMostRecentSubmission = async (
  formId: string,
  email: string
): Promise<FilloutSubmission | null> => {
  try {
    if (!email) {
      return null;
    }

    // Fetch multiple submissions (up to 50) to filter by email
    // Fillout API returns submissions sorted by date (most recent first)
    const response = await getFormSubmissions(formId, {
      limit: 50,
      offset: 0,
    });

    if (!response.responses || response.responses.length === 0) {
      return null;
    }

    // Filter submissions by email (check all email fields in questions)
    const matchingSubmissions = response.responses.filter((submission) => {
      return submission.questions.some((question) => {
        // Check if this is an email field and matches the lead's email
        const isEmailField = 
          question.type === 'Email' || 
          question.name.toLowerCase().includes('email') ||
          question.name.toLowerCase().includes('אימייל');
        
        if (isEmailField && question.value) {
          return String(question.value).toLowerCase().trim() === email.toLowerCase().trim();
        }
        return false;
      });
    });

    // Return the most recent matching submission (first in the filtered array)
    return matchingSubmissions.length > 0 ? matchingSubmissions[0] : null;
  } catch (error: any) {
    console.error('[Fillout] Error finding most recent submission:', error);
    throw error;
  }
};

