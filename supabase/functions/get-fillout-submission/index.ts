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

    if (!formId || !submissionId) {
      return errorResponse('Missing formId and submissionId', 400);
    }

    const filloutApiKey = Deno.env.get('FILLOUT_API_KEY') || Deno.env.get('VITE_FILLOUT_API_KEY');
    if (!filloutApiKey) {
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
      return errorResponse(`Fillout API error (${res.status}): ${errText}`, res.status === 404 ? 404 : 502);
    }

    const submission = await res.json();
    return successResponse(submission);
  } catch (e: any) {
    return errorResponse(e?.message || 'Internal error', 500);
  }
});
