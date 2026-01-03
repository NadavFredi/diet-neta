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
    
    // Try questions array
    if (body.questions && Array.isArray(body.questions)) {
      body.questions.forEach((question: any) => {
        const key = question.name || question.id || question.key || `question_${question.id || question.key}`;
        meetingData[key] = question.value !== undefined ? question.value : question.answer;
      });
    }
    
    // Try data.questions or response.questions
    if (Object.keys(meetingData).length === 0) {
      const questions = body.data?.questions || body.response?.questions || body.submission?.questions;
      if (questions && Array.isArray(questions)) {
        questions.forEach((question: any) => {
          const key = question.name || question.id || question.key || `question_${question.id || question.key}`;
          meetingData[key] = question.value !== undefined ? question.value : question.answer;
        });
      }
    }

    // Add metadata
    meetingData._formId = formId;
    meetingData._submissionTime = body.submissionTime || body.submission_time || body.createdAt || body.created_at || new Date().toISOString();
    meetingData._formName = body.formName || body.form_name || body.form?.name;
    meetingData._rawBody = body; // Store raw body for debugging

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

