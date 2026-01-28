// Edge Function to backfill a single Fillout submission with full answers from Fillout API
// Call with POST body: { formId: string, submissionId: string } or { filloutSubmissionId: string }
// When filloutSubmissionId is provided, the row is looked up to get formId and submissionId.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { createSupabaseAdmin } from '../_shared/supabase.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST' && req.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    let formId: string | null = null;
    let submissionId: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      formId = body.formId || body.form_id || null;
      submissionId = body.submissionId || body.submission_id || body.filloutSubmissionId || null;
    } else {
      const url = new URL(req.url);
      formId = url.searchParams.get('formId') || url.searchParams.get('form_id');
      submissionId = url.searchParams.get('submissionId') || url.searchParams.get('submission_id') || url.searchParams.get('filloutSubmissionId');
    }

    // If only filloutSubmissionId (DB row id or fillout_submission_id) provided, look up the row
    if (!formId && submissionId) {
      const supabase = createSupabaseAdmin();
      const { data: row, error: lookupError } = await supabase
        .from('fillout_submissions')
        .select('fillout_form_id, fillout_submission_id')
        .or(`fillout_submission_id.eq.${submissionId},id.eq.${submissionId}`)
        .limit(1)
        .maybeSingle();

      if (lookupError || !row) {
        return errorResponse('Submission not found or invalid filloutSubmissionId', 404);
      }
      formId = row.fillout_form_id;
      submissionId = row.fillout_submission_id;
    }

    if (!formId || !submissionId) {
      return errorResponse('Missing formId and submissionId (or filloutSubmissionId). Provide formId + submissionId, or filloutSubmissionId to look up.', 400);
    }

    const filloutApiKey = Deno.env.get('FILLOUT_API_KEY') || Deno.env.get('VITE_FILLOUT_API_KEY');
    if (!filloutApiKey) {
      return errorResponse('FILLOUT_API_KEY not configured', 500);
    }

    const filloutUrl = `https://api.fillout.com/v1/api/forms/${encodeURIComponent(formId)}/submissions/${encodeURIComponent(submissionId)}`;
    const filloutResponse = await fetch(filloutUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${filloutApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!filloutResponse.ok) {
      const errText = await filloutResponse.text();
      return errorResponse(`Fillout API error (${filloutResponse.status}): ${errText}`, filloutResponse.status === 404 ? 404 : 502);
    }

    const apiSubmission: { questions?: Array<{ id?: string; name?: string; type?: string; value?: string | number | boolean | null }>; [key: string]: any } = await filloutResponse.json();

    const supabase = createSupabaseAdmin();
    const { data: existing } = await supabase
      .from('fillout_submissions')
      .select('id, submission_data')
      .eq('fillout_submission_id', submissionId)
      .eq('fillout_form_id', formId)
      .maybeSingle();

    if (!existing) {
      return errorResponse('fillout_submissions row not found', 404);
    }

    const existingData: Record<string, any> = existing.submission_data || {};
    if (apiSubmission.questions && Array.isArray(apiSubmission.questions)) {
      existingData.questions = apiSubmission.questions;
      apiSubmission.questions.forEach((q: any) => {
        const key = q.name || q.id || q.key || '';
        if (key && (q.value !== undefined && q.value !== null)) {
          existingData[key] = q.value;
        }
      });
    }

    const { error: updateError } = await supabase
      .from('fillout_submissions')
      .update({
        submission_data: existingData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateError) {
      return errorResponse(`Failed to update submission: ${updateError.message}`, 500);
    }

    return successResponse({
      message: 'Submission backfilled with answers from Fillout API',
      submissionId,
      formId,
      questionsCount: apiSubmission.questions?.length ?? 0,
    });
  } catch (e: any) {
    return errorResponse(e?.message || 'Internal error', 500);
  }
});
