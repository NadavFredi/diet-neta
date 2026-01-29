// Supabase Edge Function to receive Fillout webhooks
// This handles incoming form submissions and creates meeting records

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';
import { stripHtmlForWhatsApp } from '../_shared/utils.ts';

interface FilloutWebhookBody {
  eventId?: string;
  eventType?: string;
  formId?: string;
  formName?: string;
  submissionId?: string;
  submissionTime?: string;
  questions?: Array<{
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
  [key: string]: any;
}

serve(async (req) => {

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Handle GET requests (for webhook verification)
  if (req.method === 'GET') {
    return new Response('Webhook endpoint is active', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  }

  try {
    // Parse request body
    const rawBody = await req.text();

    let body: FilloutWebhookBody;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return errorResponse('Invalid JSON in request body', 400);
    }


    // Extract form ID - try multiple possible field names and locations (including bracket notation)
    const formIdBracket = (body as any)['formId'] ?? (body as any)['form_id'];
    const formId = formIdBracket ||
      body.formId ||
      body.form_id ||
      body.form?.id ||
      body.data?.formId ||
      body.data?.form_id ||
      body.response?.formId ||
      body.submission?.formId ||
      body.event?.formId ||
      body.formName ||
      body.form_name;

    // Extract submission ID - try MANY possible field names and locations
    // Use bracket notation as fallback in case property access doesn't work
    const submissionIdBracket = (body as any)['submission_id'];
    const submissionIdCamel = (body as any)['submissionId'];
    const bodyId = (body as any)['id'];
    // Try bracket notation first since that's what's actually in the JSON
    // The JSON has "submission_id" with underscore, so bracket notation should work
    let submissionId = submissionIdBracket ||
      submissionIdCamel ||
      bodyId ||
      body.submissionId ||
      body.submission_id ||
      body.id ||
      body.data?.submissionId ||
      body.data?.submission_id ||
      body.data?.id ||
      body.response?.submissionId ||
      body.response?.submission_id ||
      body.response?.id ||
      body.submission?.submissionId ||
      body.submission?.submission_id ||
      body.submission?.id ||
      body.event?.submissionId ||
      body.event?.submission_id ||
      body.event?.id ||
      body.payload?.submissionId ||
      body.payload?.id;

    // Also try to extract from formName if it contains the form ID
    // Fillout sometimes sends formName like "open-meeting" or the actual form ID
    const formName = body.formName || body.form_name || body.form?.name || body.data?.formName || '';

    // Get the open-meeting form ID from environment variable
    // Try both VITE_ and non-VITE_ versions for compatibility
    // Default to n5VwsjFk5ous if not set
    const openMeetingFormId = Deno.env.get('VITE_FILLOUT_FORM_ID_MEETING') ||
      Deno.env.get('FILLOUT_FORM_ID_MEETING') ||
      Deno.env.get('VITE_FILLOUT_FORM_ID_OPEN_MEETING') ||
      Deno.env.get('FILLOUT_FORM_ID_OPEN_MEETING') ||
      'n5VwsjFk5ous'; // Default form ID for meeting form

    // Get the budget meeting form ID from environment variable
    const budgetMeetingFormId = Deno.env.get('VITE_FILLOUT_FORM_ID_BUDGET_MEETING') ||
      Deno.env.get('FILLOUT_FORM_ID_BUDGET_MEETING') ||
      'veY7bX8Uajus'; // Default form ID for budget meeting form

    // Also check if formName contains "open-meeting", "open_meeting", "priorcall", or "meeting" as a fallback
    const formNameLower = formName ? String(formName).toLowerCase() : '';
    const isOpenMeetingForm = formNameLower.includes('open-meeting') ||
      formNameLower.includes('open_meeting') ||
      formNameLower.includes('open meeting') ||
      formNameLower.includes('priorcall') ||
      formNameLower.includes('prior-call') ||
      formNameLower.includes('פגישה') ||
      formNameLower.includes('meeting');

    // Compare form IDs (case-insensitive, trim whitespace)
    const normalizedFormId = formId ? String(formId).trim().toLowerCase() : '';
    const normalizedOpenMeetingFormId = openMeetingFormId ? String(openMeetingFormId).trim().toLowerCase() : '';
    const normalizedBudgetMeetingFormId = budgetMeetingFormId ? String(budgetMeetingFormId).trim().toLowerCase() : '';

    // Check if form ID matches OR if form name indicates it's the open-meeting form
    const shouldTriggerAutomation = (normalizedOpenMeetingFormId &&
      normalizedFormId &&
      normalizedFormId === normalizedOpenMeetingFormId) ||
      isOpenMeetingForm;

    // Check if this is a budget meeting form
    const isBudgetMeetingForm = normalizedBudgetMeetingFormId &&
      normalizedFormId &&
      normalizedFormId === normalizedBudgetMeetingFormId;

    // Accept any event type for now (Fillout might send different event types)
    // We'll process it if we have a submissionId
    if (!submissionId) {

      // Try to find submission ID in deeply nested structures
      // Check arrays and nested objects
      const deepSearch = (obj: any, depth: number = 0, path: string = ''): string | null => {
        if (depth > 5) return null; // Prevent infinite recursion
        if (!obj || typeof obj !== 'object') return null;

        // Check if this object has an ID field that looks like a submission ID
        if (obj.id && typeof obj.id === 'string' && obj.id.length > 10) {
          return obj.id;
        }
        if (obj.submissionId && typeof obj.submissionId === 'string') {
          return obj.submissionId;
        }
        if (obj.submission_id && typeof obj.submission_id === 'string') {
          return obj.submission_id;
        }

        // Recursively search nested objects and arrays
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const result = deepSearch(obj[key], depth + 1, path ? `${path}.${key}` : key);
            if (result) return result;
          }
        }

        return null;
      };

      submissionId = deepSearch(body);

      if (!submissionId) {
        // For webhook verification, return success instead of error
        // Some webhook providers send verification requests without submission data
        if (body.type === 'webhook_verification' || body.eventType === 'webhook.verify' || req.method === 'GET') {
          return successResponse({ message: 'Webhook verified', verified: true });
        }

        // Try to extract lead_id first to see if we can still process this
        // Sometimes Fillout sends webhooks without submissionId but with other data
        let leadIdFromUrl: string | null = null;
        if (body.urlParameters && Array.isArray(body.urlParameters)) {
          const leadIdParam = body.urlParameters.find((param: any) =>
            param.name === 'lead_id' || param.id === 'lead_id' || param.key === 'lead_id'
          );
          if (leadIdParam) {
            leadIdFromUrl = leadIdParam.value || leadIdParam.val || null;
          }
        }

        // If we have lead_id, we can still trigger automation even without submissionId
        // Generate a temporary submissionId based on timestamp
        if (leadIdFromUrl) {
          submissionId = `temp_${Date.now()}_${leadIdFromUrl.substring(0, 8)}`;
        } else {
          return errorResponse('Missing submissionId in webhook body. Please check Fillout webhook configuration. Full payload logged for debugging.', 400);
        }
      }
    }

    const finalSubmissionId = submissionId;

    // Extract lead_id from URL parameters - try multiple locations
    let leadId: string | null = null;
    let customerId: string | null = null;

    // Try urlParameters array
    if (body.urlParameters && Array.isArray(body.urlParameters)) {
      const leadIdParam = body.urlParameters.find((param: any) =>
        param.name === 'lead_id' || param.id === 'lead_id' || param.key === 'lead_id'
      );
      if (leadIdParam) {
        leadId = leadIdParam.value || leadIdParam.val || null;
      }

      const customerIdParam = body.urlParameters.find((param: any) =>
        param.name === 'customer_id' || param.id === 'customer_id' || param.key === 'customer_id'
      );
      if (customerIdParam) {
        customerId = customerIdParam.value || customerIdParam.val || null;
      }
    }

    // Try direct properties
    if (!leadId && (body.lead_id || body.leadId || body.data?.lead_id)) {
      leadId = body.lead_id || body.leadId || body.data?.lead_id || null;
    }

    if (!customerId && (body.customer_id || body.customerId || body.data?.customer_id)) {
      customerId = body.customer_id || body.customerId || body.data?.customer_id || null;
    }

    // Try extracting from questions (sometimes URL params are in questions)
    if (!leadId && body.questions && Array.isArray(body.questions)) {
      const leadIdQuestion = body.questions.find((q: any) =>
        q.name?.toLowerCase().includes('lead_id') ||
        q.id?.toLowerCase().includes('lead_id') ||
        q.value?.toString().match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      );
      if (leadIdQuestion && leadIdQuestion.value) {
        const potentialLeadId = leadIdQuestion.value.toString();
        if (potentialLeadId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          leadId = potentialLeadId;
        }
      }
    }

    // If we have lead_id, get customer_id from the lead
    if (leadId && !customerId) {
      const supabase = createSupabaseAdmin();
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('customer_id')
        .eq('id', leadId)
        .single();

      if (!leadError && leadData) {
        customerId = leadData.customer_id;
      }
    }

    // Fallback: Try to find customer by phone or email from form submission
    if (!customerId && !leadId) {
      const supabase = createSupabaseAdmin();

      // Try to extract phone or email from meeting_data (will be populated later)
      // For now, we'll check if we can find it in questions
      let phoneFromForm: string | null = null;
      let emailFromForm: string | null = null;

      if (body.questions && Array.isArray(body.questions)) {
        for (const q of body.questions) {
          const key = (q.name || q.id || '').toLowerCase();
          const value = q.value?.toString() || '';

          if ((key.includes('phone') || key.includes('tel') || key.includes('mobile')) && value) {
            phoneFromForm = value.replace(/[^0-9+]/g, '');
          }
          if ((key.includes('email') || key.includes('mail')) && value && value.includes('@')) {
            emailFromForm = value;
          }
        }
      }

      // Try to find customer by phone
      if (phoneFromForm) {
        const { data: customerByPhone } = await supabase
          .from('customers')
          .select('id')
          .or(`phone.eq.${phoneFromForm},phone.eq.${phoneFromForm.replace(/^\+/, '')},phone.eq.0${phoneFromForm.replace(/^972/, '')}`)
          .limit(1)
          .maybeSingle();

        if (customerByPhone) {
          customerId = customerByPhone.id;
        }
      }

      // Try to find customer by email if phone didn't work
      if (!customerId && emailFromForm) {
        const { data: customerByEmail } = await supabase
          .from('customers')
          .select('id')
          .eq('email', emailFromForm)
          .limit(1)
          .maybeSingle();

        if (customerByEmail) {
          customerId = customerByEmail.id;
        }
      }
    }


    // Build meeting_data from questions - try multiple formats
    const meetingData: Record<string, any> = {};

    // Store the complete raw body for debugging (will be stored in meeting_data)
    const rawWebhookPayload = body;

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
          // But prefer simple keys (without dots) for readability
          const storageKey = depth === 0 ? key : (fullKey.includes('.') ? fullKey.replace(/\./g, '_') : fullKey);
          // Only store if we don't already have this key, or if it's a top-level value (prefer top-level)
          if (!meetingData[storageKey] || depth === 0) {
            meetingData[storageKey] = value;
          }
        } else if (typeof value === 'object' && value !== null) {
          // For objects, check if it's a simple key-value structure we should flatten
          // If it has common form field patterns, extract directly
          if (Array.isArray(value)) {
            // Arrays are handled above, but if we get here, process each element
            value.forEach((item, idx) => {
              extractNestedFields(item, `${fullKey}[${idx}]`, depth + 1);
            });
          } else {
            // Recursively process nested objects
            extractNestedFields(value, fullKey, depth + 1);
          }
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
    if (body.questions && Array.isArray(body.questions)) {
      extractQuestions(body.questions, 'body.questions');
    }

    // Try data.questions or response.questions
    if (body.data) {
      const questions = body.data.questions || body.data.response?.questions;
      if (questions && Array.isArray(questions)) {
        extractQuestions(questions, 'body.data.questions');
      }
    }

    // Try response.questions
    if (body.response && body.response.questions && Array.isArray(body.response.questions)) {
      extractQuestions(body.response.questions, 'body.response.questions');
    }

    // Try submission.questions
    if (body.submission && body.submission.questions && Array.isArray(body.submission.questions)) {
      extractQuestions(body.submission.questions, 'body.submission.questions');
    }

    // Try submission.data (Fillout often stores form fields directly in submission.data as key-value pairs)
    if (body.submission && body.submission.data && typeof body.submission.data === 'object' && !Array.isArray(body.submission.data)) {

      Object.keys(body.submission.data).forEach((key) => {
        // Skip metadata fields
        if (!key.startsWith('_') &&
          key !== 'formId' &&
          key !== 'submissionId' &&
          key !== 'submissionTime' &&
          key !== 'lastUpdatedAt' &&
          key !== 'questions') {
          const value = body.submission.data[key];
          // Store the value regardless of type (could be string, number, object, etc.)
          meetingData[key] = value;
        }
      });
    }

    // Try event.data (some webhook formats use event.data)
    if (body.event && body.event.data && typeof body.event.data === 'object' && !Array.isArray(body.event.data)) {
      Object.keys(body.event.data).forEach((key) => {
        if (!key.startsWith('_') &&
          key !== 'formId' &&
          key !== 'submissionId') {
          meetingData[key] = body.event.data[key];
        }
      });
    }

    // Try direct data object (if questions are properties of data - flat structure)
    if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      Object.keys(body.data).forEach((key) => {
        // Skip metadata fields and arrays (already processed)
        if (!key.startsWith('_') &&
          key !== 'formId' &&
          key !== 'submissionId' &&
          key !== 'submissionTime' &&
          key !== 'lastUpdatedAt' &&
          key !== 'questions' &&
          !Array.isArray(body.data[key]) &&
          typeof body.data[key] !== 'object') {
          meetingData[key] = body.data[key];
        }
      });
    }

    // Try response object (if questions are properties of response)
    if (body.response && typeof body.response === 'object' && !Array.isArray(body.response)) {
      Object.keys(body.response).forEach((key) => {
        // Skip metadata fields and arrays
        if (!key.startsWith('_') &&
          key !== 'formId' &&
          key !== 'submissionId' &&
          key !== 'submissionTime' &&
          key !== 'lastUpdatedAt' &&
          key !== 'questions' &&
          !Array.isArray(body.response[key]) &&
          typeof body.response[key] !== 'object') {
          meetingData[key] = body.response[key];
        }
      });
    }

    // Try submission object (if questions are properties of submission)
    if (body.submission && typeof body.submission === 'object' && !Array.isArray(body.submission)) {
      Object.keys(body.submission).forEach((key) => {
        // Skip metadata fields and arrays
        if (!key.startsWith('_') &&
          key !== 'formId' &&
          key !== 'submissionId' &&
          key !== 'submissionTime' &&
          key !== 'lastUpdatedAt' &&
          key !== 'questions' &&
          !Array.isArray(body.submission[key]) &&
          typeof body.submission[key] !== 'object') {
          meetingData[key] = body.submission[key];
        }
      });
    }

    // Try all top-level properties that aren't metadata (Fillout might use flat structure)
    // This is IMPORTANT for Fillout webhook body fields like lead_id, age, weight, height, period, etc.
    Object.keys(body).forEach((key) => {
      // Skip known metadata fields
      if (key !== 'formId' &&
        key !== 'form_id' &&
        key !== 'formName' &&
        key !== 'form_name' &&
        key !== 'submissionId' &&
        key !== 'submission_id' &&
        key !== 'submissionTime' &&
        key !== 'submission_time' &&
        key !== 'lastUpdatedAt' &&
        key !== 'last_updated_at' &&
        key !== 'eventId' &&
        key !== 'event_id' &&
        key !== 'eventType' &&
        key !== 'event_type' &&
        key !== 'questions' &&
        key !== 'urlParameters' &&
        key !== 'url_parameters' &&
        key !== 'data' &&
        key !== 'response' &&
        key !== 'submission' &&
        !Array.isArray(body[key]) &&
        typeof body[key] !== 'object' &&
        body[key] !== null &&
        body[key] !== undefined) {
        // Don't overwrite if already exists (prefer more specific extraction)
        if (!meetingData[key] || (key === 'lead_id' || key === 'leadId')) {
          meetingData[key] = body[key];
        }
      }
    });

    // Final pass: Recursively extract ALL fields from the entire body (except metadata)
    // This catches any nested structures we might have missed
    extractNestedFields(body, '', 0);


    // Extract Form_name, event_start_time, and event_end_time from top-level body
    // These are direct fields that may come from custom webhook payloads
    if (body.Form_name || body.form_name || body.FormName) {
      const formNameValue = body.Form_name || body.form_name || body.FormName;
      meetingData['Form_name'] = formNameValue;
      meetingData['סוג פגישה'] = formNameValue;
      meetingData.meeting_type = formNameValue;
    }

    if (body.event_start_time || body.eventStartTime) {
      const eventStartTime = body.event_start_time || body.eventStartTime;
      meetingData.event_start_time = eventStartTime;
      meetingData.eventStartTime = eventStartTime; // Also store camelCase variant
    }

    if (body.event_end_time || body.eventEndTime) {
      const eventEndTime = body.event_end_time || body.eventEndTime;
      meetingData.event_end_time = eventEndTime;
      meetingData.eventEndTime = eventEndTime; // Also store camelCase variant
    }

    // Add metadata
    meetingData._formId = formId;
    meetingData._submissionTime = body.submissionTime || body.submission_time || body.createdAt || body.created_at || new Date().toISOString();
    meetingData._formName = body.formName || body.form_name || body.Form_name || body.form?.name;
    meetingData._rawWebhookPayload = rawWebhookPayload; // Store complete raw webhook payload for debugging

    // Set meeting type based on form ID or Form_name
    if (isBudgetMeetingForm) {
      // Set meeting type to "תיאום תקציב" for budget meeting form
      meetingData['סוג פגישה'] = meetingData['סוג פגישה'] || 'תיאום תקציב';
      meetingData['פגישת הכרות'] = meetingData['פגישת הכרות'] || 'תיאום תקציב'; // Also set the common field name
      meetingData.meeting_type = meetingData.meeting_type || 'תיאום תקציב';
    } else if (shouldTriggerAutomation || isOpenMeetingForm) {
      // Keep default for open-meeting form only if Form_name wasn't provided
      if (!meetingData['סוג פגישה'] && !meetingData['פגישת הכרות']) {
        meetingData['סוג פגישה'] = 'פגישת הכרות';
        meetingData['פגישת הכרות'] = 'פגישת הכרות';
      }
    }

    // Fetch full submission (actual answers) from Fillout API when we have formId and submissionId
    const filloutApiKey = Deno.env.get('FILLOUT_API_KEY') || Deno.env.get('VITE_FILLOUT_API_KEY');
    if (formId && finalSubmissionId && filloutApiKey) {
      try {
        const filloutUrl = `https://api.fillout.com/v1/api/forms/${encodeURIComponent(formId)}/submissions/${encodeURIComponent(finalSubmissionId)}`;
        const filloutResponse = await fetch(filloutUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${filloutApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        if (filloutResponse.ok) {
          const apiSubmission: { questions?: Array<{ id?: string; name?: string; type?: string; value?: string | number | boolean | null }>; [key: string]: any } = await filloutResponse.json();
          if (apiSubmission.questions && Array.isArray(apiSubmission.questions)) {
            meetingData.questions = apiSubmission.questions;
            // Also flatten question name/value into meetingData so sidebar shows each answer
            apiSubmission.questions.forEach((q: any) => {
              const key = q.name || q.id || q.key || '';
              if (key && (q.value !== undefined && q.value !== null)) {
                meetingData[key] = q.value;
              }
            });
          }
        } else {
          const errText = await filloutResponse.text();
        }
      } catch (fetchErr: any) {
      }
    }


    // Check if submission exists in database
    const supabase = createSupabaseAdmin();
    let submissionExists = false;
    if (formId && finalSubmissionId) {
      try {
        const { data: existingSubmission, error: checkError } = await supabase
          .from('fillout_submissions')
          .select('id')
          .eq('fillout_submission_id', finalSubmissionId)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" which is expected for new submissions
        }

        submissionExists = !!existingSubmission;
      } catch (dbError: any) {
        // Continue as if it's a new submission if check fails
        submissionExists = false;
      }
    } else {
      submissionExists = false;
    }

    // Extract submission_type from form submission data
    // IMPORTANT: Check for meeting forms FIRST to ensure they always get submissionType = 'meeting'
    let submissionType: string | null = null;
    
    // Get Form_name from body (check both capital and lowercase versions)
    const formNameValue = body.Form_name || body.form_name || body.formName || meetingData.Form_name || meetingData.form_name || meetingData.formName;
    const formNameLower = formNameValue ? String(formNameValue).toLowerCase() : '';
    
    // Check if Form_name indicates it's a meeting (check for meeting-related keywords)
    const isMeetingByName = formNameLower.includes('פגישה') || 
                            formNameLower.includes('meeting') ||
                            formNameLower.includes('פגישת') ||
                            formNameLower.includes('תיאום');
    
    // First, check if this is a meeting form (by form ID or form name) - this must override form_name
    // Use normalizedFormId that was already declared above (reuse existing variable)
    if (normalizedFormId === normalizedOpenMeetingFormId || isOpenMeetingForm || isMeetingByName) {
      // This is definitely a meeting form, so set submissionType to 'meeting' to ensure meetings table gets updated
      submissionType = 'meeting';
    } else if (normalizedFormId === normalizedBudgetMeetingFormId) {
      // This is a budget meeting form
      submissionType = 'budget_meeting';
    } else {
      // Not a meeting form, try to extract from form_name or other sources
      // Try from form_name in body (from Fillout webhook configuration)
      if (formNameValue && typeof formNameValue === 'string') {
        // Use form_name as submission_type (e.g., "שאלון התאמה" -> "שאלון התאמה")
        submissionType = formNameValue.trim();
      }
      
      // Try from questions array
      if (!submissionType && body.questions && Array.isArray(body.questions)) {
        for (const q of body.questions) {
          const key = (q.name || q.id || '').toLowerCase();
          if (key.includes('submission_type') || key.includes('submissiontype') || key.includes('type')) {
            submissionType = String(q.value || '').trim();
            if (submissionType) break;
          }
        }
      }
      
      // Try from direct properties in meetingData
      const typeKeys = ['submission_type', 'submissionType', 'type', 'submission_type_field'];
      for (const key of typeKeys) {
        if (!submissionType && meetingData[key] && typeof meetingData[key] === 'string') {
          submissionType = meetingData[key].trim();
          break;
        }
      }
      
      // If still no type found, use form_name as fallback
      if (!submissionType) {
        const fallbackFormName = body.form_name || body.formName || '';
        submissionType = fallbackFormName || 'other';
      }
    }


    // Check if submission already exists in fillout_submissions table
    const { data: existingSubmission } = await supabase
      .from('fillout_submissions')
      .select('id')
      .eq('fillout_submission_id', finalSubmissionId)
      .maybeSingle();

    if (existingSubmission) {

      // Update existing submission in fillout_submissions table
      const { data: updatedSubmission, error: updateError } = await supabase
        .from('fillout_submissions')
        .update({
          submission_data: meetingData,
          submission_type: submissionType,
          fillout_form_id: formId || '',
          lead_id: leadId,
          customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubmission.id)
        .select()
        .single();

      if (updateError) {
        return errorResponse(`Failed to update submission: ${updateError.message}`, 500);
      }


      // Also update/create meetings table for backward compatibility (if it's a meeting type)
      if (submissionType === 'meeting' || submissionType === 'budget_meeting') {
        const { data: existingMeeting } = await supabase
          .from('meetings')
          .select('id')
          .eq('fillout_submission_id', finalSubmissionId)
          .maybeSingle();

        if (existingMeeting) {
          // Update existing meeting
          const { error: meetingUpdateError } = await supabase
            .from('meetings')
            .update({
              meeting_data: meetingData,
              lead_id: leadId,
              customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMeeting.id);

          if (meetingUpdateError) {

          }
        } else {
          // Create new meeting if it doesn't exist
          const { data: newMeeting, error: meetingInsertError } = await supabase
            .from('meetings')
            .insert({
              fillout_submission_id: finalSubmissionId,
              meeting_data: meetingData,
              lead_id: leadId,
              customer_id: customerId,
            })
            .select()
            .single();

          if (meetingInsertError) {

          }
        }
      }

      // Check if this is the questionnaire form (23ggw4DEs7us) and update lead fields
      const questionnaireFormId = '23ggw4DEs7us';
      const normalizedQuestionnaireFormId = questionnaireFormId.trim().toLowerCase();
      const normalizedFormIdForUpdate = formId ? String(formId).trim().toLowerCase() : '';
      // Also check if formId matches exactly (Fillout might send different formats)
      const isQuestionnaireForm = normalizedFormIdForUpdate === normalizedQuestionnaireFormId || 
                                  formId === questionnaireFormId;

      if (isQuestionnaireForm && leadId) {

        updateLeadFromQuestionnaireForm(leadId, customerId, meetingData, supabase).catch((err) => {

        });
      }

      // Note: Don't trigger automation on updates, only on new submissions
      return successResponse({
        message: 'Submission updated',
        submissionId: finalSubmissionId,
        filloutSubmissionId: updatedSubmission.id,
        leadId,
        customerId,
        submissionType,
      });
    } else {
      // Create new submission in fillout_submissions table
      const { data: newSubmission, error: insertError } = await supabase
        .from('fillout_submissions')
        .insert({
          fillout_submission_id: finalSubmissionId,
          fillout_form_id: formId || '',
          submission_type: submissionType,
          submission_data: meetingData,
          lead_id: leadId,
          customer_id: customerId,
        })
        .select()
        .single();

      if (insertError) {
        return errorResponse(`Failed to create submission: ${insertError.message}`, 500);
      }


      // Also create in meetings table for backward compatibility (if it's a meeting type)
      if (submissionType === 'meeting' || submissionType === 'budget_meeting') {
        const { data: newMeeting, error: meetingInsertError } = await supabase
          .from('meetings')
          .insert({
            fillout_submission_id: finalSubmissionId,
            meeting_data: meetingData,
            lead_id: leadId,
            customer_id: customerId,
          })
          .select()
          .single();

        if (meetingInsertError) {

        }
      }

      // Check if this is the questionnaire form (23ggw4DEs7us) and update lead fields
      const questionnaireFormId = '23ggw4DEs7us';
      const normalizedQuestionnaireFormId = questionnaireFormId.trim().toLowerCase();
      const normalizedFormIdForCreate = formId ? String(formId).trim().toLowerCase() : '';
      // Also check if formId matches exactly (Fillout might send different formats)
      const isQuestionnaireForm = normalizedFormIdForCreate === normalizedQuestionnaireFormId || 
                                  formId === questionnaireFormId;

      if (isQuestionnaireForm && leadId) {

        updateLeadFromQuestionnaireForm(leadId, customerId, meetingData, supabase).catch((err) => {

        });
      }


      // Trigger intro_questionnaire automation automatically ONLY for open-meeting form submissions
      // Run this asynchronously so it doesn't block the webhook response
      if (shouldTriggerAutomation) {
        triggerIntroQuestionnaireAutomation(customerId, leadId, supabase).catch((err) => {
        });
      }

      return successResponse({
        message: 'Submission created',
        submissionId: finalSubmissionId,
        filloutSubmissionId: newSubmission.id,
        leadId,
        customerId,
        submissionType,
      });
    }
  } catch (error: any) {
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});

/**
 * Update lead fields from questionnaire form submission
 * Extracts period, age, email, height, weight from form answers
 */
async function updateLeadFromQuestionnaireForm(
  leadId: string,
  customerId: string | null,
  meetingData: Record<string, any>,
  supabase: any
): Promise<void> {

  try {
    const updates: Record<string, any> = {};

    // Helper function to find field value by multiple possible field names
    const findFieldValue = (possibleNames: string[]): any => {
      for (const name of possibleNames) {
        // Try exact match
        if (meetingData[name] !== undefined && meetingData[name] !== null && meetingData[name] !== '') {
          return meetingData[name];
        }
        // Try case-insensitive match
        const lowerName = name.toLowerCase();
        for (const key in meetingData) {
          if (key.toLowerCase() === lowerName && meetingData[key] !== undefined && meetingData[key] !== null && meetingData[key] !== '') {
            return meetingData[key];
          }
        }
      }
      return null;
    };

    // Extract period (מקבלת מחזור) - boolean field
    // Try multiple possible field names
    const periodValue = findFieldValue([
      'period',
      'מקבלת מחזור',
      'menstrual_period',
      'menstrualPeriod',
      'has_period',
      'hasPeriod',
      'period_status',
      'periodStatus'
    ]);

    if (periodValue !== null) {
      // Convert various formats to boolean
      if (typeof periodValue === 'boolean') {
        updates.period = periodValue;
      } else if (typeof periodValue === 'string') {
        const lowerValue = periodValue.toLowerCase().trim();
        if (lowerValue === 'כן' || lowerValue === 'yes' || lowerValue === 'true' || lowerValue === '1') {
          updates.period = true;
        } else if (lowerValue === 'לא' || lowerValue === 'no' || lowerValue === 'false' || lowerValue === '0') {
          updates.period = false;
        }
      } else if (typeof periodValue === 'number') {
        updates.period = periodValue === 1;
      }
    }

    // Extract age - integer field (just a number that the user types)
    const ageValue = findFieldValue([
      'age',
      'גיל',
      'age_years',
      'ageYears',
      'years_old',
      'yearsOld'
    ]);

    if (ageValue !== null) {
      // Parse as integer - handle both number and string inputs
      let ageNum: number;
      if (typeof ageValue === 'number') {
        ageNum = Math.round(ageValue); // Ensure integer
      } else {
        // Remove whitespace and parse as integer
        const cleanedValue = String(ageValue).trim().replace(/\s+/g, '');
        ageNum = parseInt(cleanedValue, 10);
      }
      
      // Validate it's a valid positive integer within reasonable range
      if (!isNaN(ageNum) && ageNum > 0 && ageNum < 150 && Number.isInteger(ageNum)) {
        updates.age = ageNum;
      }
    }

    // Extract height - decimal field (in cm)
    const heightValue = findFieldValue([
      'height',
      'גובה',
      'height_cm',
      'heightCm',
      'height_cm',
      'heightInCm'
    ]);

    if (heightValue !== null) {
      const heightNum = typeof heightValue === 'number' ? heightValue : parseFloat(String(heightValue));
      if (!isNaN(heightNum) && heightNum > 0 && heightNum < 300) {
        updates.height = heightNum;
      }
    }

    // Extract weight - decimal field (in kg)
    const weightValue = findFieldValue([
      'weight',
      'משקל',
      'weight_kg',
      'weightKg',
      'weight_kg',
      'weightInKg'
    ]);

    if (weightValue !== null) {
      const weightNum = typeof weightValue === 'number' ? weightValue : parseFloat(String(weightValue));
      if (!isNaN(weightNum) && weightNum > 0 && weightNum < 500) {
        updates.weight = weightNum;
      }
    }

    // Extract email - string field (update both lead's customer and customer table)
    const emailValue = findFieldValue([
      'email',
      'אימייל',
      'e_mail',
      'eMail',
      'email_address',
      'emailAddress'
    ]);

    if (emailValue !== null && typeof emailValue === 'string' && emailValue.includes('@')) {
      const emailStr = emailValue.trim().toLowerCase();
      if (emailStr.length > 0 && emailStr.length < 255) {
        // Update customer email if we have customerId
        if (customerId) {
          const { error: customerUpdateError } = await supabase
            .from('customers')
            .update({ email: emailStr })
            .eq('id', customerId);
        }
      }
    }

    // Update lead if we have any updates
    if (Object.keys(updates).length > 0) {
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
    }

  } catch (error: any) {
    throw error;
  }
}

/**
 * Automatically trigger intro_questionnaire automation when a form is submitted
 * This runs asynchronously and doesn't block the webhook response
 */
async function triggerIntroQuestionnaireAutomation(
  customerId: string | null,
  leadId: string | null,
  supabase: any
): Promise<void> {

  try {
    // Need customer_id to get phone number
    if (!customerId) {
      return;
    }


    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return;
    }

    if (!customer.phone) {
      return;
    }


    // Fetch lead data for placeholders
    let lead: any = null;
    if (leadId) {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!leadError && leadData) {
        lead = leadData;
      }
    }

    // Fetch the intro_questionnaire template
    // Get the first user's template (in production, you might want to get it by user_id)
    const { data: templates, error: templateError } = await supabase
      .from('whatsapp_flow_templates')
      .select('*')
      .eq('flow_key', 'intro_questionnaire')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (templateError || !templates || templates.length === 0) {
      return;
    }

    const template = templates[0];

    if (!template.template_content || !template.template_content.trim()) {
      return;
    }

    // Build placeholders
    const placeholders = buildPlaceholders(customer, lead);

    // Replace placeholders in template
    let message = template.template_content;
    Object.keys(placeholders).forEach((key) => {
      const value = String(placeholders[key] || '');
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    // Strip HTML tags and format for WhatsApp
    message = stripHtmlForWhatsApp(message);

    // Process buttons if they exist
    let processedButtons: Array<{ id: string; text: string }> | undefined = undefined;
    if (template.buttons) {
      try {
        let buttonsData = template.buttons;
        if (typeof buttonsData === 'string') {
          buttonsData = JSON.parse(buttonsData);
        }
        if (Array.isArray(buttonsData)) {
          processedButtons = buttonsData.map((btn: any) => ({
            id: String(btn.id),
            text: replacePlaceholdersInText(String(btn.text || btn.name || ''), placeholders),
          }));
        }
      } catch (error) {
      }
    }

    // Get Green API credentials
    const idInstance = Deno.env.get('GREEN_API_ID_INSTANCE') || Deno.env.get('VITE_GREEN_API_ID_INSTANCE');
    const apiTokenInstance = Deno.env.get('GREEN_API_TOKEN_INSTANCE') || Deno.env.get('VITE_GREEN_API_TOKEN_INSTANCE');

    if (!idInstance || !apiTokenInstance) {
      return;
    }

    // Format phone number for WhatsApp
    const chatId = getChatId(customer.phone);

    // Send message via Green API
    if (processedButtons && processedButtons.length > 0) {
      // Send with buttons
      const url = `https://api.green-api.com/waInstance${idInstance}/SendButtons/${apiTokenInstance}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message,
          buttons: processedButtons.map((btn, index) => ({
            buttonId: String(index + 1),
            buttonText: btn.text,
          })),
        }),
      });

      if (!response.ok) {
        return;
      }
    } else {
      // Send regular message
      const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message,
        }),
      });

      if (!response.ok) {
        return;
      }
    }

  } catch (error: any) {
  }
}

/**
 * Build placeholders object from customer and lead data
 */
function buildPlaceholders(customer: any, lead: any | null): Record<string, string | number> {
  const calculateAge = (birthDate: string | null | undefined): number => {
    if (!birthDate) return 0;
    try {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    } catch {
      return 0;
    }
  };

  const calculateBMI = (height: number | null | undefined, weight: number | null | undefined): number => {
    if (!height || !weight) return 0;
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  };

  const getGenderLabel = (gender: string | null | undefined): string => {
    if (!gender) return '';
    switch (gender) {
      case 'male': return 'זכר';
      case 'female': return 'נקבה';
      case 'other': return 'אחר';
      default: return gender;
    }
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('he-IL');
    } catch {
      return date;
    }
  };

  const age = calculateAge(lead?.birth_date);
  const bmi = calculateBMI(lead?.height, lead?.weight);
  const status = lead?.status_sub || lead?.status_main || '';

  return {
    name: customer?.full_name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    city: lead?.city || '',
    gender: getGenderLabel(lead?.gender),
    status: status,
    created_date: formatDate(lead?.created_at),
    lead_id: lead?.id || '',
    fitness_goal: lead?.fitness_goal || '',
    activity_level: lead?.activity_level || '',
    preferred_time: lead?.preferred_time || '',
    height: lead?.height || '',
    weight: lead?.weight || '',
    bmi: bmi || '',
    age: age || '',
    workout_plan_name: '',
    nutrition_plan_name: '',
  };
}

/**
 * Replace placeholders in text
 */
function replacePlaceholdersInText(text: string, placeholders: Record<string, string | number>): string {
  let result = text;
  Object.keys(placeholders).forEach((key) => {
    const value = String(placeholders[key] || '');
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  });
  return result;
}

/**
 * Get chat ID from phone number (helper function)
 */
function getChatId(phoneNumber: string): string {
  let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');

  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1);
  }

  if (formatted.startsWith('0')) {
    formatted = '972' + formatted.substring(1);
  }

  if (!formatted.startsWith('972') && formatted.length === 9) {
    formatted = '972' + formatted;
  }

  return `${formatted}@c.us`;
}
