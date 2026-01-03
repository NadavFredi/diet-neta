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
  console.log('[sync-fillout-meetings] Function called');

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
        console.log('[sync-fillout-meetings] Could not parse body, trying query params');
      }
    }
    
    // Try query parameters
    if (!formId) {
      const url = new URL(req.url);
      formId = url.searchParams.get('form_id') || '';
    }
    
    // Try environment variable
    if (!formId) {
      formId = Deno.env.get('FILLOUT_FORM_ID_MEETING') || Deno.env.get('VITE_FILLOUT_FORM_ID_MEETING') || '';
    }
    
    // Default to the known form ID if not provided (from the form editor URL)
    if (!formId) {
      formId = 'n5VwsjFk5ous'; // Default form ID for open-meeting form
      console.log('[sync-fillout-meetings] Using default form ID:', formId);
    }
    
    // If formId starts with "-", it's likely a slug, not an ID
    // Fillout form IDs are typically alphanumeric strings, not starting with "-"
    if (formId.startsWith('-')) {
      console.warn('[sync-fillout-meetings] Form ID appears to be a slug, not an ID:', formId);
      console.warn('[sync-fillout-meetings] Using default form ID instead: n5VwsjFk5ous');
      formId = 'n5VwsjFk5ous'; // Use the actual form ID
    }
    
    if (!formId || formId.trim() === '') {
      console.error('[sync-fillout-meetings] Form ID is empty or missing');
      return errorResponse('Missing form_id parameter. Please provide the Fillout form ID. You can find it in your Fillout form editor URL (the part after /editor/).', 400);
    }
    
    console.log('[sync-fillout-meetings] Using form ID:', formId);
    
    console.log('[sync-fillout-meetings] Using form ID:', formId);

    // Try multiple possible environment variable names
    // Note: VITE_ prefix is typically stripped in edge functions, but we check both
    const filloutApiKey = Deno.env.get('FILLOUT_API_KEY') || 
                         Deno.env.get('VITE_FILLOUT_API_KEY') ||
                         Deno.env.get('FILLOUT_API_KEY');
    
    if (!filloutApiKey) {
      console.error('[sync-fillout-meetings] Missing FILLOUT_API_KEY environment variable');
      const envKeys = Object.keys(Deno.env.toObject());
      const filloutKeys = envKeys.filter(k => k.toUpperCase().includes('FILLOUT'));
      console.log('[sync-fillout-meetings] Available Fillout-related env vars:', filloutKeys);
      console.log('[sync-fillout-meetings] All env vars (first 20):', envKeys.slice(0, 20));
      return errorResponse('Missing FILLOUT_API_KEY. Make sure it\'s in .env.local as FILLOUT_API_KEY or VITE_FILLOUT_API_KEY and restart functions with: npm run functions:local', 500);
    }
    
    console.log('[sync-fillout-meetings] FILLOUT_API_KEY found (length:', filloutApiKey.length, ')');

    console.log('[sync-fillout-meetings] Syncing form:', formId);
    console.log('[sync-fillout-meetings] API key present:', !!filloutApiKey);

    // Fetch submissions from Fillout API
    const filloutUrl = `https://api.fillout.com/v1/api/forms/${formId}/submissions?limit=100`;
    console.log('[sync-fillout-meetings] Fetching from Fillout API:', filloutUrl);
    
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
      console.error('[sync-fillout-meetings] Network error fetching from Fillout:', fetchError);
      return errorResponse(`Network error: ${fetchError.message}`, 500);
    }

    if (!filloutResponse.ok) {
      const errorText = await filloutResponse.text();
      console.error('[sync-fillout-meetings] Fillout API error:', {
        status: filloutResponse.status,
        statusText: filloutResponse.statusText,
        error: errorText,
        formId,
      });
      return errorResponse(`Fillout API error (${filloutResponse.status}): ${errorText}`, filloutResponse.status);
    }

    const filloutData: FilloutFormSubmissionsResponse = await filloutResponse.json();
    console.log('[sync-fillout-meetings] Fetched submissions:', filloutData.totalResponses);

    if (!filloutData.responses || filloutData.responses.length === 0) {
      return successResponse({ 
        message: 'No submissions found',
        synced: 0,
        skipped: 0,
      });
    }

    const supabase = createSupabaseAdmin();
    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each submission
    for (const submission of filloutData.responses) {
      try {
        // Check if meeting already exists
        const { data: existing } = await supabase
          .from('meetings')
          .select('id')
          .eq('fillout_submission_id', submission.submissionId)
          .maybeSingle();

        if (existing) {
          console.log('[sync-fillout-meetings] Meeting already exists, skipping:', submission.submissionId);
          skipped++;
          continue;
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
        if (submission.questions && Array.isArray(submission.questions)) {
          submission.questions.forEach((question: any) => {
            const key = question.name || question.id || `question_${question.id}`;
            meetingData[key] = question.value;
          });
        }

        // Add metadata
        meetingData._formId = formId;
        meetingData._submissionTime = submission.submissionTime;
        meetingData._lastUpdatedAt = submission.lastUpdatedAt;

        // Create meeting
        const { error: insertError } = await supabase
          .from('meetings')
          .insert({
            fillout_submission_id: submission.submissionId,
            meeting_data: meetingData,
            lead_id: leadId,
            customer_id: customerId,
          });

        if (insertError) {
          console.error('[sync-fillout-meetings] Error creating meeting:', insertError);
          errors.push(`Failed to create meeting for submission ${submission.submissionId}: ${insertError.message}`);
        } else {
          console.log('[sync-fillout-meetings] Created meeting for submission:', submission.submissionId);
          synced++;
        }
      } catch (error: any) {
        console.error('[sync-fillout-meetings] Error processing submission:', error);
        errors.push(`Error processing submission ${submission.submissionId}: ${error.message}`);
      }
    }

    return successResponse({
      message: 'Sync completed',
      synced,
      skipped,
      total: filloutData.responses.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[sync-fillout-meetings] Unexpected error:', error);
    return errorResponse(`Internal server error: ${error.message}`, 500);
  }
});

