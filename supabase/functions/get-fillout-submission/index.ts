// Fetches a single submission from Fillout API (GET forms/{formId}/submissions/{submissionId})
// Called by the frontend when opening the form submission sidebar.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    let formId: string | null = null;
    let submissionId: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      formId = url.searchParams.get('formId') || url.searchParams.get('form_id');
      submissionId = url.searchParams.get('submissionId') || url.searchParams.get('submission_id');
    } else {
      const body = await req.json().catch(() => ({}));
      formId = body.formId || body.form_id || null;
      submissionId = body.submissionId || body.submission_id || null;
    }

    console.log('[Fillout] get-fillout-submission request', { formId, submissionId });

    if (!formId || !submissionId) {
      console.log('[Fillout] get-fillout-submission missing params');
      return errorResponse('Missing formId and submissionId', 400);
    }

    const filloutApiKey = Deno.env.get('FILLOUT_API_KEY') || Deno.env.get('VITE_FILLOUT_API_KEY');
    if (!filloutApiKey) {
      console.log('[Fillout] get-fillout-submission FILLOUT_API_KEY not set');
      return errorResponse('FILLOUT_API_KEY not configured', 500);
    }

    const url = `https://api.fillout.com/v1/api/forms/${encodeURIComponent(formId)}/submissions/${encodeURIComponent(submissionId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${filloutApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Fillout] get-fillout-submission Fillout API error', { status: res.status, errText: errText?.slice(0, 200) });
      return errorResponse(`Fillout API error (${res.status}): ${errText}`, res.status === 404 ? 404 : 502);
    }

    const submission = await res.json();
    console.log('[Fillout] get-fillout-submission success', { formId, submissionId, questionsCount: submission?.questions?.length ?? 0 });
    return successResponse(submission);
  } catch (e: any) {
    console.error('[Fillout] get-fillout-submission error', e?.message);
    return errorResponse(e?.message || 'Internal error', 500);
  }
});
