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
    const filloutApiKey = Deno.env.get('FILLOUT_API_KEY');
    
    if (!filloutApiKey) {
      return errorResponse('Fillout API key not configured. Please set FILLOUT_API_KEY as Supabase secret.', 500);
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
