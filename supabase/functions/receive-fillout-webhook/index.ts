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

    console.log('[receive-fillout-webhook] Parsed body:', JSON.stringify(body, null, 2));

    // Extract form ID and submission ID - try multiple possible field names
    const formId = body.formId || body.form_id || body.form?.id || body.data?.formId;
    let submissionId = body.submissionId || body.submission_id || body.id || body.data?.submissionId || body.data?.id;
    
    console.log('[receive-fillout-webhook] Extracted IDs:', { formId, submissionId, eventType: body.eventType });

    // Accept any event type for now (Fillout might send different event types)
    // We'll process it if we have a submissionId
    if (!submissionId) {
      console.log('[receive-fillout-webhook] No submissionId found, checking alternative formats...');
      
      // Try to find submission ID in nested structures
      submissionId = body.data?.id || body.response?.id || body.submission?.id;
      if (submissionId) {
        console.log('[receive-fillout-webhook] Found submissionId in alternative location:', submissionId);
      } else {
        console.error('[receive-fillout-webhook] Missing submissionId in all expected locations');
        console.log('[receive-fillout-webhook] Full body structure:', Object.keys(body));
        return errorResponse('Missing submissionId in webhook body', 400);
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

