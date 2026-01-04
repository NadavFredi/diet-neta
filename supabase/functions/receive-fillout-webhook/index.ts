// Supabase Edge Function to receive Fillout webhooks
// This handles incoming form submissions and creates meeting records

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';

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
  console.log('[receive-fillout-webhook] Function called:', {
    method: req.method,
    url: req.url,
  });

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log('[receive-fillout-webhook] Handling OPTIONS request');
    return corsResponse;
  }

  // Handle GET requests (for webhook verification)
  if (req.method === 'GET') {
    console.log('[receive-fillout-webhook] GET request received');
    return new Response('Webhook endpoint is active', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  }

  try {
    // Parse request body
    const rawBody = await req.text();
    console.log('[receive-fillout-webhook] Raw body received:', rawBody);

    let body: FilloutWebhookBody;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[receive-fillout-webhook] Failed to parse JSON:', parseError);
      return errorResponse('Invalid JSON in request body', 400);
    }

    console.log('[receive-fillout-webhook] ========== WEBHOOK RECEIVED ==========');
    console.log('[receive-fillout-webhook] Full body structure:', JSON.stringify(body, null, 2));
    console.log('[receive-fillout-webhook] Full body keys:', Object.keys(body));
    console.log('[receive-fillout-webhook] Body type:', typeof body);
    
    // Log nested structures
    if (body.data) {
      console.log('[receive-fillout-webhook] body.data keys:', Object.keys(body.data));
      console.log('[receive-fillout-webhook] body.data:', JSON.stringify(body.data, null, 2));
    }
    if (body.response) {
      console.log('[receive-fillout-webhook] body.response keys:', Object.keys(body.response));
    }
    if (body.submission) {
      console.log('[receive-fillout-webhook] body.submission keys:', Object.keys(body.submission));
    }
    if (body.event) {
      console.log('[receive-fillout-webhook] body.event keys:', Object.keys(body.event));
    }

    // Extract form ID - try multiple possible field names and locations
    const formId = body.formId || 
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
    let submissionId = body.submissionId || 
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
    
    console.log('[receive-fillout-webhook] Extracted IDs (first pass):', { 
      formId, 
      formName,
      submissionId, 
      eventType: body.eventType,
    });

    // Get the open-meeting form ID from environment variable
    // Try both VITE_ and non-VITE_ versions for compatibility
    const openMeetingFormId = Deno.env.get('VITE_FILLOUT_FORM_ID_MEETING') || 
                              Deno.env.get('FILLOUT_FORM_ID_MEETING') ||
                              Deno.env.get('VITE_FILLOUT_FORM_ID_OPEN_MEETING') ||
                              Deno.env.get('FILLOUT_FORM_ID_OPEN_MEETING');
    
    // Also check if formName contains "open-meeting" or "open_meeting" as a fallback
    const formNameLower = formName ? String(formName).toLowerCase() : '';
    const isOpenMeetingForm = formNameLower.includes('open-meeting') || 
                              formNameLower.includes('open_meeting') ||
                              formNameLower.includes('open meeting');
    
    // Compare form IDs (case-insensitive, trim whitespace)
    const normalizedFormId = formId ? String(formId).trim().toLowerCase() : '';
    const normalizedOpenMeetingFormId = openMeetingFormId ? String(openMeetingFormId).trim().toLowerCase() : '';
    
    // Check if form ID matches OR if form name indicates it's the open-meeting form
    const shouldTriggerAutomation = (normalizedOpenMeetingFormId && 
                                    normalizedFormId && 
                                    normalizedFormId === normalizedOpenMeetingFormId) ||
                                    isOpenMeetingForm;
    
    console.log('[receive-fillout-webhook] Automation trigger check:', {
      formId: formId,
      formName: formName,
      normalizedFormId,
      openMeetingFormId: openMeetingFormId,
      normalizedOpenMeetingFormId,
      isOpenMeetingForm,
      shouldTriggerAutomation,
      hasFormId: !!formId,
      hasFormName: !!formName,
      hasOpenMeetingFormId: !!openMeetingFormId,
      allEnvVars: {
        VITE_FILLOUT_FORM_ID_MEETING: Deno.env.get('VITE_FILLOUT_FORM_ID_MEETING') ? 'SET' : 'NOT SET',
        FILLOUT_FORM_ID_MEETING: Deno.env.get('FILLOUT_FORM_ID_MEETING') ? 'SET' : 'NOT SET',
      }
    });
    
    if (!openMeetingFormId && !isOpenMeetingForm) {
      console.warn('[receive-fillout-webhook] WARNING: VITE_FILLOUT_FORM_ID_MEETING not set AND form name does not match "open-meeting". Automation will not trigger.');
      console.warn('[receive-fillout-webhook] To fix: Set VITE_FILLOUT_FORM_ID_MEETING in .env.local and restart Supabase functions');
    }

    // Accept any event type for now (Fillout might send different event types)
    // We'll process it if we have a submissionId
    if (!submissionId) {
      console.log('[receive-fillout-webhook] No submissionId found in first pass, checking deeper nested structures...');
      
      // Try to find submission ID in deeply nested structures
      // Check arrays and nested objects
      const deepSearch = (obj: any, depth: number = 0, path: string = ''): string | null => {
        if (depth > 5) return null; // Prevent infinite recursion
        if (!obj || typeof obj !== 'object') return null;
        
        // Check if this object has an ID field that looks like a submission ID
        if (obj.id && typeof obj.id === 'string' && obj.id.length > 10) {
          console.log(`[receive-fillout-webhook] Found potential submissionId at path: ${path}.id = ${obj.id}`);
          return obj.id;
        }
        if (obj.submissionId && typeof obj.submissionId === 'string') {
          console.log(`[receive-fillout-webhook] Found submissionId at path: ${path}.submissionId = ${obj.submissionId}`);
          return obj.submissionId;
        }
        if (obj.submission_id && typeof obj.submission_id === 'string') {
          console.log(`[receive-fillout-webhook] Found submission_id at path: ${path}.submission_id = ${obj.submission_id}`);
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
      
      if (submissionId) {
        console.log('[receive-fillout-webhook] ✅ Found submissionId in deep search:', submissionId);
      } else {
        console.error('[receive-fillout-webhook] ❌ Missing submissionId in all expected locations');
        console.error('[receive-fillout-webhook] Full body structure for debugging:', JSON.stringify(body, null, 2));
        console.error('[receive-fillout-webhook] This might be a webhook verification request or a different event type');
        
        // For webhook verification, return success instead of error
        // Some webhook providers send verification requests without submission data
        if (body.type === 'webhook_verification' || body.eventType === 'webhook.verify' || req.method === 'GET') {
          console.log('[receive-fillout-webhook] This appears to be a webhook verification request');
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
          console.log('[receive-fillout-webhook] ⚠️ No submissionId found, but lead_id exists. Using temporary ID:', submissionId);
          console.log('[receive-fillout-webhook] ⚠️ This webhook will trigger automation but may not create a meeting record');
        } else {
          return errorResponse('Missing submissionId in webhook body. Please check Fillout webhook configuration. Full payload logged for debugging.', 400);
        }
      }
    }
    
    const finalSubmissionId = submissionId;
    console.log('[receive-fillout-webhook] ✅ Using submissionId:', finalSubmissionId);

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
        console.log('[receive-fillout-webhook] Found lead_id in urlParameters:', leadId);
      }

      const customerIdParam = body.urlParameters.find((param: any) => 
        param.name === 'customer_id' || param.id === 'customer_id' || param.key === 'customer_id'
      );
      if (customerIdParam) {
        customerId = customerIdParam.value || customerIdParam.val || null;
        console.log('[receive-fillout-webhook] Found customer_id in urlParameters:', customerId);
      }
    }

    // Try direct properties
    if (!leadId && (body.lead_id || body.leadId || body.data?.lead_id)) {
      leadId = body.lead_id || body.leadId || body.data?.lead_id || null;
      console.log('[receive-fillout-webhook] Found lead_id in direct property:', leadId);
    }

    if (!customerId && (body.customer_id || body.customerId || body.data?.customer_id)) {
      customerId = body.customer_id || body.customerId || body.data?.customer_id || null;
      console.log('[receive-fillout-webhook] Found customer_id in direct property:', customerId);
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
          console.log('[receive-fillout-webhook] Found lead_id in questions:', leadId);
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
        console.log('[receive-fillout-webhook] Found customer_id from lead:', customerId);
      }
    }

    // Build meeting_data from questions - try multiple formats
    const meetingData: Record<string, any> = {};
    
    // Log the full body structure for debugging
    console.log('[receive-fillout-webhook] ========== FULL WEBHOOK PAYLOAD ==========');
    console.log('[receive-fillout-webhook] Raw body length:', rawBody.length);
    console.log('[receive-fillout-webhook] Full body structure:', JSON.stringify(body, null, 2));
    console.log('[receive-fillout-webhook] Body keys:', Object.keys(body));
    console.log('[receive-fillout-webhook] Body type:', typeof body);
    console.log('[receive-fillout-webhook] ===========================================');
    
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
            console.log(`[receive-fillout-webhook] Stored nested field: ${storageKey} = ${JSON.stringify(value)}`);
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
      console.log(`[receive-fillout-webhook] Extracting questions from ${source}, count:`, questions.length);
      questions.forEach((question: any, index: number) => {
        console.log(`[receive-fillout-webhook] Question ${index}:`, JSON.stringify(question));
        
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
          console.log(`[receive-fillout-webhook] Stored field: ${key} = ${JSON.stringify(value)}`);
        } else {
          // If question object has nested structure, extract it recursively
          if (typeof question === 'object' && question !== null) {
            extractNestedFields(question, key, 0);
          }
          console.log(`[receive-fillout-webhook] Skipped question ${index} - missing key or value`);
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
      console.log('[receive-fillout-webhook] Checking body.submission.data for direct fields (Fillout format)');
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
          console.log(`[receive-fillout-webhook] Stored field from body.submission.data: ${key} = ${JSON.stringify(value)}`);
        }
      });
    }
    
    // Try event.data (some webhook formats use event.data)
    if (body.event && body.event.data && typeof body.event.data === 'object' && !Array.isArray(body.event.data)) {
      console.log('[receive-fillout-webhook] Checking body.event.data for direct fields');
      Object.keys(body.event.data).forEach((key) => {
        if (!key.startsWith('_') && 
            key !== 'formId' && 
            key !== 'submissionId') {
          meetingData[key] = body.event.data[key];
          console.log(`[receive-fillout-webhook] Stored field from body.event.data: ${key} = ${JSON.stringify(body.event.data[key])}`);
        }
      });
    }
    
    // Try direct data object (if questions are properties of data - flat structure)
    if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
      console.log('[receive-fillout-webhook] Checking body.data for direct fields');
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
          console.log(`[receive-fillout-webhook] Stored direct field from body.data: ${key} = ${JSON.stringify(body.data[key])}`);
        }
      });
    }
    
    // Try response object (if questions are properties of response)
    if (body.response && typeof body.response === 'object' && !Array.isArray(body.response)) {
      console.log('[receive-fillout-webhook] Checking body.response for direct fields');
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
          console.log(`[receive-fillout-webhook] Stored direct field from body.response: ${key} = ${JSON.stringify(body.response[key])}`);
        }
      });
    }
    
    // Try submission object (if questions are properties of submission)
    if (body.submission && typeof body.submission === 'object' && !Array.isArray(body.submission)) {
      console.log('[receive-fillout-webhook] Checking body.submission for direct fields');
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
          console.log(`[receive-fillout-webhook] Stored direct field from body.submission: ${key} = ${JSON.stringify(body.submission[key])}`);
        }
      });
    }
    
    // Try all top-level properties that aren't metadata (Fillout might use flat structure)
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
        meetingData[key] = body[key];
        console.log(`[receive-fillout-webhook] Stored top-level field: ${key} = ${JSON.stringify(body[key])}`);
      }
    });
    
    // Final pass: Recursively extract ALL fields from the entire body (except metadata)
    // This catches any nested structures we might have missed
    console.log('[receive-fillout-webhook] Performing final recursive extraction from entire body...');
    extractNestedFields(body, '', 0);
    
    console.log('[receive-fillout-webhook] Extracted meeting_data fields:', Object.keys(meetingData));
    console.log('[receive-fillout-webhook] Extracted meeting_data:', JSON.stringify(meetingData, null, 2));

    // Add metadata
    meetingData._formId = formId;
    meetingData._submissionTime = body.submissionTime || body.submission_time || body.createdAt || body.created_at || new Date().toISOString();
    meetingData._formName = body.formName || body.form_name || body.form?.name;
    meetingData._rawWebhookPayload = rawWebhookPayload; // Store complete raw webhook payload for debugging
    
    // Log what we extracted
    console.log('[receive-fillout-webhook] ========== EXTRACTION SUMMARY ==========');
    console.log('[receive-fillout-webhook] Total fields extracted:', Object.keys(meetingData).length);
    console.log('[receive-fillout-webhook] Extracted fields:', Object.keys(meetingData));
    console.log('[receive-fillout-webhook] Meeting data preview:', JSON.stringify(meetingData, null, 2).substring(0, 2000));
    console.log('[receive-fillout-webhook] =========================================');

    console.log('[receive-fillout-webhook] Processing submission:', {
      submissionId: finalSubmissionId,
      formId,
      leadId,
      customerId,
      questionsCount: body.questions?.length || 0,
    });

    // Check if meeting already exists (by fillout_submission_id)
    const supabase = createSupabaseAdmin();
    const { data: existingMeeting } = await supabase
      .from('meetings')
      .select('id')
      .eq('fillout_submission_id', finalSubmissionId)
      .maybeSingle();

    if (existingMeeting) {
      console.log('[receive-fillout-webhook] Meeting already exists, updating:', existingMeeting.id);
      
      // Update existing meeting
      const { data: updated, error: updateError } = await supabase
        .from('meetings')
        .update({
          meeting_data: meetingData,
          lead_id: leadId,
          customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingMeeting.id)
        .select()
        .single();

      if (updateError) {
        console.error('[receive-fillout-webhook] Error updating meeting:', updateError);
        return errorResponse(`Failed to update meeting: ${updateError.message}`, 500);
      }

      console.log('[receive-fillout-webhook] Meeting updated successfully:', updated.id);
      // Note: Don't trigger automation on updates, only on new submissions
      return successResponse({ 
        message: 'Meeting updated',
        meetingId: updated.id,
        submissionId: finalSubmissionId,
        leadId,
        customerId,
      });
    } else {
      // Create new meeting
      const { data: newMeeting, error: insertError } = await supabase
        .from('meetings')
        .insert({
          fillout_submission_id: finalSubmissionId,
          meeting_data: meetingData,
          lead_id: leadId,
          customer_id: customerId,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[receive-fillout-webhook] Error creating meeting:', insertError);
        return errorResponse(`Failed to create meeting: ${insertError.message}`, 500);
      }

      console.log('[receive-fillout-webhook] Meeting created successfully:', newMeeting.id);
      
      // Trigger intro_questionnaire automation automatically ONLY for open-meeting form submissions
      // Run this asynchronously so it doesn't block the webhook response
      if (shouldTriggerAutomation) {
        triggerIntroQuestionnaireAutomation(customerId, leadId, supabase).catch((err) => {
          console.error('[receive-fillout-webhook] Error triggering automation (non-blocking):', err);
        });
      } else {
        console.log('[receive-fillout-webhook] Skipping automation - form is not open-meeting form');
      }
      
      return successResponse({ 
        message: 'Meeting created',
        meetingId: newMeeting.id,
        submissionId: finalSubmissionId,
        leadId,
        customerId,
      });
    }
  } catch (error: any) {
    console.error('[receive-fillout-webhook] Unexpected error:', error);
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});

/**
 * Automatically trigger intro_questionnaire automation when a form is submitted
 * This runs asynchronously and doesn't block the webhook response
 */
async function triggerIntroQuestionnaireAutomation(
  customerId: string | null,
  leadId: string | null,
  supabase: any
): Promise<void> {
  console.log('[receive-fillout-webhook] ========== STARTING AUTOMATION TRIGGER ==========');
  console.log('[receive-fillout-webhook] Parameters:', { customerId, leadId });
  
  try {
    // Need customer_id to get phone number
    if (!customerId) {
      console.log('[receive-fillout-webhook] ❌ Skipping automation - no customer_id');
      console.log('[receive-fillout-webhook] Lead ID was:', leadId);
      return;
    }
    
    console.log('[receive-fillout-webhook] ✅ Customer ID found:', customerId);

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, phone, email')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      console.error('[receive-fillout-webhook] ❌ Error fetching customer:', customerError);
      return;
    }
    
    console.log('[receive-fillout-webhook] ✅ Customer fetched:', {
      id: customer.id,
      name: customer.full_name,
      hasPhone: !!customer.phone,
      hasEmail: !!customer.email,
    });

    if (!customer.phone) {
      console.log('[receive-fillout-webhook] ❌ Skipping automation - customer has no phone number');
      return;
    }
    
    console.log('[receive-fillout-webhook] ✅ Customer phone found:', customer.phone);

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
      console.log('[receive-fillout-webhook] ❌ No intro_questionnaire template found - skipping automation');
      console.log('[receive-fillout-webhook] Template error:', templateError);
      console.log('[receive-fillout-webhook] Templates found:', templates?.length || 0);
      return;
    }

    const template = templates[0];
    console.log('[receive-fillout-webhook] ✅ Template found:', {
      id: template.id,
      flow_key: template.flow_key,
      hasContent: !!template.template_content,
      contentLength: template.template_content?.length || 0,
      hasButtons: !!template.buttons,
    });
    
    if (!template.template_content || !template.template_content.trim()) {
      console.log('[receive-fillout-webhook] ❌ Template content is empty - skipping automation');
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
        console.warn('[receive-fillout-webhook] Error processing buttons:', error);
      }
    }

    // Get Green API credentials
    const idInstance = Deno.env.get('GREEN_API_ID_INSTANCE') || Deno.env.get('VITE_GREEN_API_ID_INSTANCE');
    const apiTokenInstance = Deno.env.get('GREEN_API_TOKEN_INSTANCE') || Deno.env.get('VITE_GREEN_API_TOKEN_INSTANCE');

    if (!idInstance || !apiTokenInstance) {
      console.error('[receive-fillout-webhook] Green API credentials not found - cannot send automation');
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
        const errorData = await response.json().catch(() => ({}));
        console.error('[receive-fillout-webhook] Error sending WhatsApp message with buttons:', errorData);
        return;
      }

      const responseData = await response.json();
      console.log('[receive-fillout-webhook] ✅ Successfully sent intro_questionnaire automation with buttons:', responseData);
    } else {
      // Send regular message
      const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
      console.log('[receive-fillout-webhook] Sending regular message to:', chatId);
      console.log('[receive-fillout-webhook] Message preview:', message.substring(0, 100) + '...');
      
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
        const errorData = await response.json().catch(() => ({}));
        console.error('[receive-fillout-webhook] ❌ Error sending WhatsApp message:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        return;
      }

      const responseData = await response.json();
      console.log('[receive-fillout-webhook] ✅ Successfully sent intro_questionnaire automation:', responseData);
    }
    
    console.log('[receive-fillout-webhook] ========== AUTOMATION TRIGGER COMPLETED ==========');
  } catch (error: any) {
    console.error('[receive-fillout-webhook] ❌ Error in triggerIntroQuestionnaireAutomation:', error);
    console.error('[receive-fillout-webhook] Error stack:', error?.stack);
    console.log('[receive-fillout-webhook] ========== AUTOMATION TRIGGER FAILED ==========');
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

