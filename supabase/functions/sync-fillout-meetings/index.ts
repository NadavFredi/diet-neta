// Supabase Edge Function to sync Fillout meeting submissions to database
// This can be called manually to import existing meetings or sync recent submissions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';

interface FilloutSubmission {
  submissionId: string;
  submissionTime: string;
  lastUpdatedAt: string;
  questions: Array<{
    id?: string;
    name?: string;
    type?: string;
    value?: string | number | boolean | null;
  }>;
  urlParameters?: Array<{
    id?: string;
    name?: string;
    value?: string;
  }>;
}

interface FilloutFormSubmissionsResponse {
  responses: FilloutSubmission[];
  totalResponses: number;
  pageCount: number;
}

serve(async (req) => {

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Get form ID from request body, query parameter, or environment variable
    let formId = '';
    
    // Try to get from request body (for POST requests)
    if (req.method === 'POST') {
      try {
        const bodyText = await req.text();
        if (bodyText) {
          const body = JSON.parse(bodyText);
          formId = body.form_id || '';
        }
        // Recreate request for further use (if needed)
        req = new Request(req.url, {
          method: req.method,
          headers: req.headers,
          body: bodyText,
        });
      } catch (e) {
      }
    }
    
    // Try query parameters
    const url = new URL(req.url);
    if (!formId) {
      formId = url.searchParams.get('form_id') || '';
    }
    
    // Try environment variable
    if (!formId) {
      formId = Deno.env.get('FILLOUT_FORM_ID_MEETING') || Deno.env.get('VITE_FILLOUT_FORM_ID_MEETING') || '';
    }
    
    // Default to the known form ID if not provided (from the form editor URL)
    if (!formId) {
      formId = 'n5VwsjFk5ous'; // Default form ID for open-meeting form
    }
    
    // Always sync both meeting forms (open-meeting and budget-meeting)
    const formIdsToSync: string[] = [];
    
    // Add open-meeting form
    if (formId && !formId.startsWith('-')) {
      formIdsToSync.push(formId);
    }
    
    // Add budget-meeting form
    const budgetFormId = Deno.env.get('FILLOUT_FORM_ID_BUDGET_MEETING') || 
                        Deno.env.get('VITE_FILLOUT_FORM_ID_BUDGET_MEETING') || 
                        'veY7bX8Uajus';
    if (budgetFormId && budgetFormId !== formId && !budgetFormId.startsWith('-')) {
      formIdsToSync.push(budgetFormId);
    }
    
    // If formId starts with "-", it's likely a slug, not an ID
    // Fillout form IDs are typically alphanumeric strings, not starting with "-"
    if (formId.startsWith('-')) {
      formId = 'n5VwsjFk5ous'; // Use the actual form ID
      if (!formIdsToSync.includes(formId)) {
        formIdsToSync.unshift(formId); // Add to beginning
      }
    }
    
    if (formIdsToSync.length === 0) {
      return errorResponse('Missing form_id parameter. Please provide the Fillout form ID. You can find it in your Fillout form editor URL (the part after /editor/).', 400);
    }
    

    // Try multiple possible environment variable names
    // Note: VITE_ prefix is typically stripped in edge functions, but we check both
    const filloutApiKey = Deno.env.get('FILLOUT_API_KEY') || 
                         Deno.env.get('VITE_FILLOUT_API_KEY') ||
                         Deno.env.get('FILLOUT_API_KEY');
    
    if (!filloutApiKey) {
      const envKeys = Object.keys(Deno.env.toObject());
      const filloutKeys = envKeys.filter(k => k.toUpperCase().includes('FILLOUT'));

      return errorResponse('Missing FILLOUT_API_KEY. Make sure it\'s in .env.local as FILLOUT_API_KEY or VITE_FILLOUT_API_KEY and restart functions with: npm run functions:local', 500);
    }

    const supabase = createSupabaseAdmin();
    let totalSynced = 0;
    let totalSkipped = 0;
    const allErrors: string[] = [];

    // Process each form ID
    for (const currentFormId of formIdsToSync) {

      // Fetch submissions from Fillout API
      const filloutUrl = `https://api.fillout.com/v1/api/forms/${currentFormId}/submissions?limit=100`;
      
      let filloutResponse;
      try {
        filloutResponse = await fetch(filloutUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${filloutApiKey}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (fetchError: any) {
        allErrors.push(`Network error for form ${currentFormId}: ${fetchError.message}`);
        continue; // Skip this form and continue with next
      }

      if (!filloutResponse.ok) {
        const errorText = await filloutResponse.text();

        allErrors.push(`Fillout API error for form ${currentFormId} (${filloutResponse.status}): ${errorText}`);
        continue; // Skip this form and continue with next
      }

      const filloutData: FilloutFormSubmissionsResponse = await filloutResponse.json();
      
      // Log the first submission structure to understand the format
      if (filloutData.responses && filloutData.responses.length > 0) {


        if (filloutData.responses[0].questions) {

        }
      }

      if (!filloutData.responses || filloutData.responses.length === 0) {
        continue; // Skip this form and continue with next
      }

      // Check if this is the budget meeting form
      const budgetFormId = Deno.env.get('FILLOUT_FORM_ID_BUDGET_MEETING') || 
                          Deno.env.get('VITE_FILLOUT_FORM_ID_BUDGET_MEETING') || 
                          'veY7bX8Uajus';
      const isBudgetForm = currentFormId.trim().toLowerCase() === budgetFormId.trim().toLowerCase();

      // Process each submission
      for (const submission of filloutData.responses) {
      try {
        // Check if meeting already exists
        const { data: existing } = await supabase
          .from('meetings')
          .select('id, meeting_data')
          .eq('fillout_submission_id', submission.submissionId)
          .maybeSingle();

        if (existing) {
          
          // Check if meeting_data only has metadata (needs backfill)
          const existingData = existing.meeting_data || {};
          const hasOnlyMetadata = Object.keys(existingData).every(key => 
            key.startsWith('_') || 
            key === 'formId' || 
            key === 'submissionId' || 
            key === 'submissionTime' ||
            key === 'lastUpdatedAt'
          );
          
          if (hasOnlyMetadata) {
          } else {
            totalSkipped++;
            continue;
          }
        }

        // Extract lead_id and customer_id from URL parameters
        let leadId: string | null = null;
        let customerId: string | null = null;

        if (submission.urlParameters && Array.isArray(submission.urlParameters)) {
          const leadIdParam = submission.urlParameters.find((param: any) => 
            param.name === 'lead_id' || param.id === 'lead_id'
          );
          if (leadIdParam) {
            leadId = leadIdParam.value || null;
          }

          const customerIdParam = submission.urlParameters.find((param: any) => 
            param.name === 'customer_id' || param.id === 'customer_id'
          );
          if (customerIdParam) {
            customerId = customerIdParam.value || null;
          }
        }

        // If we have lead_id, get customer_id from the lead
        if (leadId && !customerId) {
          const { data: leadData } = await supabase
            .from('leads')
            .select('customer_id')
            .eq('id', leadId)
            .single();

          if (leadData) {
            customerId = leadData.customer_id;
          }
        }

        // Build meeting_data from questions
        const meetingData: Record<string, any> = {};
        
        // Log submission structure for debugging


        // Helper function to recursively extract all fields from nested objects
        const extractNestedFields = (obj: any, prefix: string = '', depth: number = 0): void => {
          if (depth > 5) return; // Prevent infinite recursion
          
          if (obj === null || obj === undefined) return;
          
          // If it's an array, process each element
          if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
              extractNestedFields(item, `${prefix}[${index}]`, depth + 1);
            });
            return;
          }
          
          // If it's not an object, it's a primitive value - skip
          if (typeof obj !== 'object') return;
          
          // Process object properties
          Object.keys(obj).forEach((key) => {
            const value = obj[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            // Skip metadata fields
            if (key.startsWith('_') || 
                key === 'formId' || key === 'form_id' ||
                key === 'submissionId' || key === 'submission_id' ||
                key === 'submissionTime' || key === 'submission_time' ||
                key === 'lastUpdatedAt' || key === 'last_updated_at' ||
                key === 'eventId' || key === 'event_id' ||
                key === 'eventType' || key === 'event_type' ||
                key === 'urlParameters' || key === 'url_parameters') {
              // Skip but continue to nested objects
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                extractNestedFields(value, fullKey, depth + 1);
              }
              return;
            }
            
            // If value is a primitive (string, number, boolean), store it
            if (value !== null && value !== undefined && 
                (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
              // Use the key without prefix for top-level fields, or with prefix for nested
              const storageKey = depth === 0 ? key : fullKey;
              if (!meetingData[storageKey] || depth === 0) { // Prefer top-level values
                meetingData[storageKey] = value;

              }
            } else if (typeof value === 'object' && value !== null) {
              // Recursively process nested objects
              extractNestedFields(value, fullKey, depth + 1);
            }
          });
        };
        
        // Helper function to extract question data
        const extractQuestions = (questions: any[], source: string) => {
          questions.forEach((question: any, index: number) => {

            // Try multiple possible field names for the key
            const key = question.name || 
                       question.id || 
                       question.key || 
                       question.field || 
                       question.label ||
                       question.title ||
                       question.question ||
                       `question_${question.id || question.key || index}`;
            
            // Try multiple possible field names for the value
            const value = question.value !== undefined ? question.value :
                         question.answer !== undefined ? question.answer :
                         question.response !== undefined ? question.response :
                         question.data !== undefined ? question.data :
                         question.text !== undefined ? question.text :
                         question.answerText !== undefined ? question.answerText :
                         null;
            
            if (key && value !== null && value !== undefined) {
              meetingData[key] = value;

            } else {
              // If question object has nested structure, extract it recursively
              if (typeof question === 'object' && question !== null) {
                extractNestedFields(question, key, 0);
              }
            }
          });
        };
        
        // Try questions array at top level (most common Fillout format)
        if (submission.questions && Array.isArray(submission.questions)) {
          extractQuestions(submission.questions, 'submission.questions');
        }
        
        // Try data.questions or response.questions
        if (submission.data) {
          const questions = submission.data.questions || submission.data.response?.questions;
          if (questions && Array.isArray(questions)) {
            extractQuestions(questions, 'submission.data.questions');
          }
        }
        
        // Try response.questions
        if (submission.response && submission.response.questions && Array.isArray(submission.response.questions)) {
          extractQuestions(submission.response.questions, 'submission.response.questions');
        }
        
        // Try direct data object (if questions are properties of data - flat structure)
        if (submission.data && typeof submission.data === 'object' && !Array.isArray(submission.data)) {
          Object.keys(submission.data).forEach((key) => {
            // Skip metadata fields and arrays (already processed)
            if (!key.startsWith('_') && 
                key === 'formId' && 
                key === 'submissionId' && 
                key === 'submissionTime' && 
                key === 'lastUpdatedAt' &&
                key === 'questions' &&
                !Array.isArray(submission.data[key]) &&
                typeof submission.data[key] !== 'object') {
              meetingData[key] = submission.data[key];

            }
          });
        }
        
        // Try all top-level properties that aren't metadata (Fillout might use flat structure)
        Object.keys(submission).forEach((key) => {
          // Skip known metadata fields
          if (key !== 'submissionId' && 
              key !== 'submissionTime' && 
              key !== 'lastUpdatedAt' &&
              key !== 'questions' &&
              key !== 'urlParameters' &&
              key !== 'data' &&
              key !== 'response' &&
              !Array.isArray(submission[key]) &&
              typeof submission[key] !== 'object' &&
              submission[key] !== null &&
              submission[key] !== undefined) {
            meetingData[key] = submission[key];

          }
        });
        
        // Final pass: Recursively extract ALL fields from the entire submission (except metadata)
        // This catches any nested structures we might have missed
        extractNestedFields(submission, '', 0);


        // Add metadata
        meetingData._formId = currentFormId;
        meetingData._submissionTime = submission.submissionTime;
        meetingData._lastUpdatedAt = submission.lastUpdatedAt;
        
        // Set meeting type based on form ID
        if (isBudgetForm) {
          // Set meeting type to "תיאום תקציב" for budget meeting form
          meetingData['סוג פגישה'] = 'תיאום תקציב';
          meetingData['פגישת הכרות'] = 'תיאום תקציב'; // Also set the common field name
          meetingData.meeting_type = 'תיאום תקציב';
        } else {
          // Keep default for open-meeting form
          if (!meetingData['סוג פגישה'] && !meetingData['פגישת הכרות']) {
            meetingData['סוג פגישה'] = 'פגישת הכרות';
            meetingData['פגישת הכרות'] = 'פגישת הכרות';
          }
        }

        if (existing) {
          // Update existing meeting with full data
          const { error: updateError } = await supabase
            .from('meetings')
            .update({
              meeting_data: meetingData,
              lead_id: leadId,
              customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) {
            allErrors.push(`Failed to update meeting for submission ${submission.submissionId}: ${updateError.message}`);
          } else {
            totalSynced++;
          }
        } else {
          // Create new meeting
          const { error: insertError } = await supabase
            .from('meetings')
            .insert({
              fillout_submission_id: submission.submissionId,
              meeting_data: meetingData,
              lead_id: leadId,
              customer_id: customerId,
            });

          if (insertError) {
            allErrors.push(`Failed to create meeting for submission ${submission.submissionId}: ${insertError.message}`);
          } else {
            totalSynced++;
          }
        }
      } catch (error: any) {
        allErrors.push(`Error processing submission ${submission.submissionId}: ${error.message}`);
      }
    } // End of submissions loop
    } // End of forms loop

    return successResponse({
      message: 'Sync completed',
      synced: totalSynced,
      skipped: totalSkipped,
      formsSynced: formIdsToSync.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error: any) {
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});
