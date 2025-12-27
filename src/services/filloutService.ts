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

    console.log('[Fillout] API Request:', {
      url,
      formId,
      hasApiKey: !!config.apiKey,
      apiKeyLength: config.apiKey?.length,
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
      console.error('[Fillout] API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url,
      });
      throw new Error(errorMessage);
    }

    const data: FilloutFormSubmissionsResponse = await response.json();
    
    console.log('[Fillout] API Response received:', {
      totalResponses: data.totalResponses,
      pageCount: data.pageCount,
      responsesCount: data.responses?.length || 0,
    });
    
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
 * Normalize phone number for comparison (remove spaces, dashes, parentheses, country codes)
 */
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  // Remove leading country code if present (972 for Israel)
  if (cleaned.startsWith('972') && cleaned.length > 9) {
    cleaned = cleaned.substring(3);
  }
  // Remove leading 0 if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
};

/**
 * Find the most recent submission for a lead (by email OR phone number)
 * Prioritizes phone number matching if both are provided
 */
export const findMostRecentSubmission = async (
  formId: string,
  email?: string,
  phoneNumber?: string
): Promise<FilloutSubmission | null> => {
  try {
    if (!email && !phoneNumber) {
      console.log('[Fillout] No email or phone provided for form:', formId);
      return null;
    }

    // Normalize phone number and email for comparison (do this first!)
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    console.log('[Fillout] Searching for submission:', {
      formId,
      email,
      phoneNumber,
      normalizedPhone,
      normalizedEmail,
    });

    // Fetch multiple submissions (up to 50) to filter
    // Fillout API returns submissions sorted by date (most recent first)
    const response = await getFormSubmissions(formId, {
      limit: 50,
      offset: 0,
    });

    console.log('[Fillout] API Response:', {
      totalResponses: response.totalResponses,
      receivedCount: response.responses?.length || 0,
    });

    if (!response.responses || response.responses.length === 0) {
      console.log('[Fillout] No submissions found for form:', formId);
      return null;
    }

    // Debug: Log all phone numbers found in submissions
    if (phoneNumber) {
      console.log('[Fillout] Checking submissions for phone:', {
        original: phoneNumber,
        normalized: normalizedPhone,
      });
      
      // Log ALL submissions to see what we have
      console.log(`[Fillout] Total submissions to check: ${response.responses.length}`);
      
      response.responses.forEach((submission, idx) => {
        const allValues = submission.questions.map(q => ({
          name: q.name,
          type: q.type,
          value: q.value,
          normalized: q.value ? normalizePhoneNumber(String(q.value)) : null,
        }));
        const hasMatchingPhone = allValues.some(q => 
          q.normalized === normalizedPhone && q.normalized && q.normalized.length > 0
        );
        console.log(`[Fillout] Submission ${idx + 1} (${hasMatchingPhone ? '✅ MATCH' : '❌ no match'}):`, {
          submissionId: submission.submissionId,
          submissionTime: submission.submissionTime,
          hasMatchingPhone,
          questions: allValues,
        });
      });
    }
    
    // Also log email matching if provided
    if (email && !normalizedPhone) {
      console.log('[Fillout] Checking submissions for email:', normalizedEmail);
      response.responses.slice(0, 3).forEach((submission, idx) => {
        const emailValues = submission.questions
          .filter(q => 
            q.type === 'Email' || 
            q.name.toLowerCase().includes('email') ||
            q.name.toLowerCase().includes('אימייל')
          )
          .map(q => ({
            name: q.name,
            type: q.type,
            value: q.value,
          }));
        console.log(`[Fillout] Submission ${idx + 1} email fields:`, emailValues);
      });
    }

    console.log('[Fillout] Normalized values:', {
      originalPhone: phoneNumber,
      normalizedPhone,
      normalizedEmail,
    });

    // Filter submissions by phone number (priority) or email
    const matchingSubmissions = response.responses.filter((submission) => {
      // First, try to match by phone number if provided
      if (normalizedPhone && normalizedPhone.length > 0) {
        // Strategy 1: Check all phone-named fields first (more efficient)
        let phoneMatch = submission.questions.some((question) => {
          // Check if this is a phone field
          const isPhoneField = 
            question.type === 'PhoneNumber' ||
            question.type === 'Phone' ||
            question.name.toLowerCase().includes('phone') ||
            question.name.toLowerCase().includes('טלפון') ||
            question.name.toLowerCase().includes('mobile') ||
            question.name.toLowerCase().includes('נייד');
          
          if (isPhoneField && question.value) {
            const submissionPhone = normalizePhoneNumber(String(question.value));
            const matches = submissionPhone === normalizedPhone && submissionPhone.length > 0;
            if (matches) {
              console.log('[Fillout] Phone match found in phone field:', {
                fieldName: question.name,
                fieldType: question.type,
                originalValue: question.value,
                normalized: submissionPhone,
              });
            }
            return matches;
          }
          return false;
        });
        
        // Strategy 2: If no phone field match, check ALL question values
        // This handles cases where URL parameters pre-fill any field (hidden fields, etc.)
        if (!phoneMatch && normalizedPhone.length >= 7) {
          phoneMatch = submission.questions.some((question) => {
            if (!question.value) return false;
            const questionValue = String(question.value);
            // Skip obviously non-phone values (emails, very long text, etc.)
            if (questionValue.includes('@') || questionValue.length > 25) {
              return false;
            }
            // Normalize and compare
            const submissionPhone = normalizePhoneNumber(questionValue);
            const matches = submissionPhone === normalizedPhone && submissionPhone.length >= 7;
            if (matches) {
              console.log('[Fillout] Phone match found in generic field:', {
                fieldName: question.name,
                fieldType: question.type,
                originalValue: question.value,
                normalized: submissionPhone,
              });
            }
            return matches;
          });
        }
        
        if (phoneMatch) {
          return true;
        }
      }

      // Fallback to email matching if no phone match found
      if (normalizedEmail) {
        return submission.questions.some((question) => {
          // Check if this is an email field
          const isEmailField = 
            question.type === 'Email' || 
            question.name.toLowerCase().includes('email') ||
            question.name.toLowerCase().includes('אימייל');
          
          if (isEmailField && question.value) {
            return String(question.value).toLowerCase().trim() === normalizedEmail;
          }
          return false;
        });
      }

      return false;
    });

    // Return the most recent matching submission (first in the filtered array)
    console.log('[Fillout] Matching results:', {
      totalSubmissions: response.responses.length,
      matchingCount: matchingSubmissions.length,
      hasMatch: matchingSubmissions.length > 0,
    });
    
    return matchingSubmissions.length > 0 ? matchingSubmissions[0] : null;
  } catch (error: any) {
    console.error('[Fillout] Error finding most recent submission:', error);
    throw error;
  }
};


