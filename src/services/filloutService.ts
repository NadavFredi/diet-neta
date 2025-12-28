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
  urlParameters?: FilloutUrlParameter[]; // URL parameters from form URL (e.g., ?lead_id=xxx)
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
 * Convert error to user-friendly message
 * Detects network errors and provides appropriate messages
 */
const getErrorMessage = (error: any): string => {
  // Get error message as string
  const errorMessage = error?.message || String(error || 'Unknown error');
  const errorString = typeof errorMessage === 'string' ? errorMessage : String(error);
  
  // Check for network errors (TypeError: Failed to fetch, etc.)
  if (error instanceof TypeError && errorMessage === 'Failed to fetch') {
    return 'שגיאת חיבור לאינטרנט. אנא בדוק את החיבור שלך ונסה שוב.';
  }
  
  // Check for common network error patterns in the error message
  const lowerErrorMessage = errorString.toLowerCase();
  if (
    lowerErrorMessage.includes('failed to fetch') ||
    lowerErrorMessage.includes('network') ||
    lowerErrorMessage.includes('err_internet_disconnected') ||
    lowerErrorMessage.includes('err_network_changed') ||
    lowerErrorMessage.includes('err_connection_refused') ||
    lowerErrorMessage.includes('networkerror') ||
    lowerErrorMessage.includes('network request failed')
  ) {
    return 'שגיאת חיבור לאינטרנט. אנא בדוק את החיבור שלך ונסה שוב.';
  }
  
  // If error message is already in Hebrew or looks user-friendly, return as-is
  // Otherwise return generic error message
  if (errorString && typeof errorString === 'string' && errorString.length > 0) {
    // Check if message contains Hebrew characters (might be already translated)
    if (/[\u0590-\u05FF]/.test(errorString)) {
      return errorString;
    }
    // If it's a technical error message, return generic Hebrew message
    if (errorString.includes('TypeError') || errorString.includes('Error:')) {
      return 'שגיאה בטעינת הטופס. אנא נסה שוב מאוחר יותר.';
    }
    return errorString;
  }
  
  return 'שגיאה בטעינת הטופס. אנא נסה שוב מאוחר יותר.';
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
      firstSubmissionStructure: data.responses?.[0] ? {
        hasUrlParameters: !!data.responses[0].urlParameters,
        urlParametersCount: data.responses[0].urlParameters?.length || 0,
        urlParameters: data.responses[0].urlParameters || [],
        questionsCount: data.responses[0].questions?.length || 0,
      } : null,
    });
    
    // Note: Email filtering is handled in findMostRecentSubmission function
    // This function doesn't filter by email to allow fetching all submissions

    return data;
  } catch (error: any) {
    console.error('[Fillout] Error fetching form submissions:', error);
    // Convert to user-friendly error message
    const friendlyError = new Error(getErrorMessage(error));
    friendlyError.name = error?.name || 'FetchError';
    throw friendlyError;
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
    // Convert to user-friendly error message
    const friendlyError = new Error(getErrorMessage(error));
    friendlyError.name = error?.name || 'FetchError';
    throw friendlyError;
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
 * Find the most recent submission for a lead (by lead_id, email OR phone number)
 * Prioritizes lead_id matching (most reliable), then phone number, then email
 */
export const findMostRecentSubmission = async (
  formId: string,
  email?: string,
  phoneNumber?: string,
  leadId?: string
): Promise<FilloutSubmission | null> => {
  try {
    if (!leadId && !email && !phoneNumber) {
      console.log('[Fillout] No lead_id, email, or phone provided for form:', formId);
      return null;
    }

    // Normalize phone number and email for comparison (do this first!)
    const normalizedPhone = phoneNumber ? normalizePhoneNumber(phoneNumber) : null;
    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    console.log('[Fillout] Searching for submission:', {
      formId,
      leadId,
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

    // Debug: Log all submissions structure to understand what Fillout returns
    console.log('[Fillout] 📋 Sample submission structure:', {
      totalSubmissions: response.responses.length,
      firstSubmission: response.responses[0] ? {
        submissionId: response.responses[0].submissionId,
        submissionTime: response.responses[0].submissionTime,
        hasUrlParameters: !!response.responses[0].urlParameters,
        urlParametersCount: response.responses[0].urlParameters?.length || 0,
        urlParameters: response.responses[0].urlParameters || [],
        questionsCount: response.responses[0].questions?.length || 0,
        questionIds: response.responses[0].questions?.map(q => q.id) || [],
        questionNames: response.responses[0].questions?.map(q => q.name) || [],
        questionTypes: response.responses[0].questions?.map(q => q.type) || [],
        sampleValues: response.responses[0].questions?.slice(0, 5).map(q => ({
          id: q.id,
          name: q.name,
          value: q.value,
        })) || [],
        // Full structure for debugging
        fullStructure: Object.keys(response.responses[0]),
      } : null,
    });

    // Debug: Log all phone numbers found in submissions
    if (phoneNumber) {
      console.log('[Fillout] Checking submissions for phone:', {
        original: phoneNumber,
        normalized: normalizedPhone,
      });
      
      // Log ALL submissions to see what we have
      console.log(`[Fillout] Total submissions to check: ${response.responses.length}`);
      
      response.responses.forEach((submission, idx) => {
        const allValues = submission.questions.map(q => {
          const value = q.value ? String(q.value) : '';
          const normalized = q.value ? normalizePhoneNumber(value) : null;
          return {
            name: q.name,
            type: q.type,
            value: value,
            normalized: normalized,
            matchesPhone: normalized === normalizedPhone && normalized && normalized.length >= 7,
          };
        });
        const hasMatchingPhone = allValues.some(q => q.matchesPhone);
        console.log(`[Fillout] Submission ${idx + 1} (${hasMatchingPhone ? '✅ MATCH' : '❌ no match'}):`, {
          submissionId: submission.submissionId,
          submissionTime: submission.submissionTime,
          hasMatchingPhone,
          targetPhone: phoneNumber,
          targetNormalized: normalizedPhone,
          allQuestions: allValues,
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

    // Filter submissions by lead_id (priority), phone number, or email
    const matchingSubmissions = response.responses.filter((submission) => {
      // Strategy 1: Match by lead_id (most reliable - from URL parameter)
      // IMPORTANT: URL parameters are stored in urlParameters array, not in questions!
      if (leadId && leadId.trim().length > 0) {
        // First, check urlParameters array (where Fillout stores URL params)
        if (submission.urlParameters && submission.urlParameters.length > 0) {
          const urlParamMatch = submission.urlParameters.some((param) => {
            const paramName = param.name?.toLowerCase() || '';
            const paramValue = String(param.value || '').trim();
            
            // Check if this is the lead_id parameter
            if ((paramName === 'lead_id' || paramName === 'leadid') && paramValue === leadId) {
              console.log('[Fillout] ✅ Lead ID match found in urlParameters:', {
                leadId,
                paramName: param.name,
                paramValue: paramValue,
                submissionId: submission.submissionId,
                allUrlParams: submission.urlParameters,
              });
              return true;
            }
            return false;
          });
          
          if (urlParamMatch) {
            return true;
          }
          
          // Log urlParameters for debugging
          console.log('[Fillout] Checking urlParameters:', {
            submissionId: submission.submissionId,
            targetLeadId: leadId,
            urlParameters: submission.urlParameters,
          });
        }
        
        // Fallback: Also check questions array (in case lead_id was pre-filled into a field)
        const leadIdMatch = submission.questions.some((question) => {
          if (!question.value) return false;
          
          const questionValue = String(question.value).trim();
          const questionName = question.name?.toLowerCase() || '';
          const questionId = question.id?.toLowerCase() || '';
          
          // Check if this is a lead_id field (by name or ID)
          const isLeadIdField = 
            questionName.includes('lead_id') || 
            questionName.includes('leadid') ||
            questionId.includes('lead_id') ||
            questionId.includes('leadid');
          
          // Check if the value matches the lead_id
          const valueMatches = questionValue === leadId;
          
          // Also check if the field name suggests it's a lead_id field and value matches
          if (isLeadIdField && valueMatches) {
            console.log('[Fillout] ✅ Lead ID match found in question field:', {
              leadId,
              fieldName: question.name,
              fieldId: question.id,
              fieldValue: questionValue,
              submissionId: submission.submissionId,
            });
            return true;
          }
          
          // Also check if ANY field value matches (URL params can go to any field)
          if (valueMatches) {
            console.log('[Fillout] ✅ Lead ID match found in question value:', {
              leadId,
              fieldName: question.name,
              fieldId: question.id,
              fieldType: question.type,
              fieldValue: questionValue,
              submissionId: submission.submissionId,
            });
            return true;
          }
          
          return false;
        });
        
        if (leadIdMatch) {
          return true;
        } else {
          // Debug: Log all fields for lead_id search
          console.log('[Fillout] ❌ No lead_id match found. Submission details:', {
            submissionId: submission.submissionId,
            targetLeadId: leadId,
            hasUrlParameters: !!submission.urlParameters,
            urlParametersCount: submission.urlParameters?.length || 0,
            urlParameters: submission.urlParameters || [],
            questionsCount: submission.questions?.length || 0,
            sampleQuestions: submission.questions?.slice(0, 3).map(q => ({
              id: q.id,
              name: q.name,
              type: q.type,
              value: q.value,
            })) || [],
          });
        }
      }
      
      // Strategy 2: Match by phone number if provided
      if (normalizedPhone && normalizedPhone.length > 0) {
        // Check ALL question values (URL parameters can pre-fill any field)
        // This is more important than checking phone-named fields first
        const phoneMatch = submission.questions.some((question) => {
          if (!question.value) return false;
          
          const questionValue = String(question.value);
          
          // Skip obviously non-phone values (emails, very long text, etc.)
          if (questionValue.includes('@') || questionValue.length > 25) {
            return false;
          }
          
          // Normalize and compare - try multiple normalization strategies
          const submissionPhone = normalizePhoneNumber(questionValue);
          const matches = submissionPhone === normalizedPhone && submissionPhone.length >= 7;
          
          // Also try matching without normalization in case formats are very similar
          const directMatch = questionValue.includes(phoneNumber?.replace(/[\s\-\(\)]/g, '') || '') ||
                             (phoneNumber && questionValue.replace(/\D/g, '') === phoneNumber.replace(/\D/g, ''));
          
          if (matches || directMatch) {
            console.log('[Fillout] ✅ Phone match found:', {
              fieldName: question.name,
              fieldType: question.type,
              originalValue: question.value,
              normalized: submissionPhone,
              targetNormalized: normalizedPhone,
              matchType: matches ? 'normalized' : 'direct',
            });
            return true;
          }
          
          return false;
        });
        
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
    // Convert to user-friendly error message
    const friendlyError = new Error(getErrorMessage(error));
    friendlyError.name = error?.name || 'SubmissionError';
    throw friendlyError;
  }
};


