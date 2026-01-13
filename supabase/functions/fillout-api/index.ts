/**
 * Fillout API Edge Function
 * 
 * Proxies Fillout API requests to keep API key secure on server-side
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createSupabaseAdmin, verifyUser } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { parseJsonBody } from '../_shared/utils.ts';

serve(async (req) => {
  // Handle CORS preflight - MUST be first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }
  
  // Also handle CORS for other requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    // Verify the requesting user is authenticated
    const user = await verifyUser(authHeader);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Get Fillout API key from server-side environment (NO VITE_ prefix)
    // Priority 1: Try Supabase secrets (production) or env vars (local dev with --env-file)
    let filloutApiKey = Deno.env.get('FILLOUT_API_KEY');
    
    // Priority 2: For local development, could fallback to database if needed
    // (Currently not implemented - use --env-file .env.local when running functions locally)
    
    if (!filloutApiKey) {
      return errorResponse(
        'Fillout API key not configured. ' +
        'For local development: Run Edge Functions with --env-file .env.local OR set as Supabase secret. ' +
        'For production: Set FILLOUT_API_KEY as Supabase secret.',
        500
      );
    }

    // Parse request body
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (parseError: any) {
      return errorResponse('Invalid request body: ' + (parseError.message || 'Failed to parse JSON'), 400);
    }

    const { action, ...params } = body;

    if (!action) {
      return errorResponse('Missing required field: action', 400);
    }

    // Route to appropriate operation
    switch (action) {
      case 'getFormSubmissions': {
        const { formId, filters } = params;
        
        if (!formId) {
          return errorResponse('Missing required field: formId', 400);
        }

        // Build query string for Fillout API
        const queryParams = new URLSearchParams();
        if (filters?.limit) queryParams.append('limit', String(filters.limit));
        if (filters?.offset) queryParams.append('offset', String(filters.offset));
        if (filters?.sort) queryParams.append('sort', filters.sort);

        const queryString = queryParams.toString();
        const url = `https://api.fillout.com/v1/api/forms/${formId}/submissions${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${filloutApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return errorResponse(
            errorData.message || `HTTP error! status: ${response.status}`,
            response.status
          );
        }

        const data = await response.json();
        
        // Debug: Log response structure for getFormSubmissions
        console.log('[fillout-api] getFormSubmissions response:', {
          totalResponses: data.responses?.length || 0,
          pageCount: data.pageCount,
          totalResponsesCount: data.totalResponses,
          sampleSubmission: data.responses?.[0] ? {
            submissionId: data.responses[0].submissionId,
            submissionTime: data.responses[0].submissionTime,
            urlParameters: data.responses[0].urlParameters,
            questionCount: data.responses[0].questions?.length || 0,
          } : null,
        });
        
        return successResponse(data);
      }

      case 'getSubmission': {
        const { formId, submissionId } = params;
        
        if (!formId || !submissionId) {
          return errorResponse('Missing required fields: formId and submissionId', 400);
        }

        const url = `https://api.fillout.com/v1/api/forms/${formId}/submissions/${submissionId}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${filloutApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return errorResponse(
            errorData.message || `HTTP error! status: ${response.status}`,
            response.status
          );
        }

        const data = await response.json();
        return successResponse(data);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (error: any) {
    console.error('[fillout-api] Error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
