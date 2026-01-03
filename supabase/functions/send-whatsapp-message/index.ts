// Supabase Edge Function to proxy Green API WhatsApp messages
// This solves CORS issues by making the API call server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { parseJsonBody, getChatId } from '../_shared/utils.ts';
import type { SendMessageRequest } from '../_shared/types.ts';

serve(async (req) => {
  console.log('[send-whatsapp-message] Function called:', {
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers.get('Authorization'),
  });

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log('[send-whatsapp-message] Handling OPTIONS request');
    return corsResponse;
  }

  try {
    // Get environment variables (set via Supabase secrets or .env.local)
    // Check both VITE_ and non-VITE_ versions for compatibility
    const idInstance = Deno.env.get('GREEN_API_ID_INSTANCE') || Deno.env.get('VITE_GREEN_API_ID_INSTANCE');
    const apiTokenInstance = Deno.env.get('GREEN_API_TOKEN_INSTANCE') || Deno.env.get('VITE_GREEN_API_TOKEN_INSTANCE');

    // Debug: Log available env vars (without sensitive data)
    console.log('[send-whatsapp-message] Environment check:', {
      hasIdInstance: !!idInstance,
      hasApiTokenInstance: !!apiTokenInstance,
      idInstancePreview: idInstance ? `${idInstance.substring(0, 4)}...` : 'missing',
      supabaseUrl: Deno.env.get('SUPABASE_URL') ? 'present' : 'missing',
      supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY') ? 'present' : 'missing',
    });

    if (!idInstance || !apiTokenInstance) {
      const errorMsg = `Green API configuration not found. Missing: ${!idInstance ? 'GREEN_API_ID_INSTANCE' : ''} ${!apiTokenInstance ? 'GREEN_API_TOKEN_INSTANCE' : ''}. Please set these in .env.local and restart the Edge Function with --env-file .env.local`;
      console.error('[send-whatsapp-message]', errorMsg);
      return errorResponse(errorMsg, 500);
    }

    // Check for placeholder values
    if (idInstance === 'your_instance_id' || apiTokenInstance === 'your_token') {
      const errorMsg = 'Green API credentials are still set to placeholder values. Please replace "your_instance_id" and "your_token" in .env.local with your actual Green API credentials, then restart the Edge Function.';
      console.error('[send-whatsapp-message]', errorMsg);
      return errorResponse(errorMsg, 500);
    }

    // When verify_jwt = true, Supabase automatically verifies the JWT before the function runs
    // If we get here, the JWT is valid. We can get the user from the auth header.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[send-whatsapp-message] Missing Supabase environment variables');
      return errorResponse('Server configuration error: Missing Supabase URL or Anon Key', 500);
    }

    // Since verify_jwt = false, we'll verify auth manually if header is present
    // This allows the function to work both with and without auth for local dev
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader) {
      // Try to verify the user if auth header is present
      try {
        const supabaseClient = createSupabaseClient(authHeader);
        const {
          data: { user: verifiedUser },
          error: authError,
        } = await supabaseClient.auth.getUser();

        if (!authError && verifiedUser) {
          user = verifiedUser;
          console.log('[send-whatsapp-message] Authenticated user:', user.id);
        } else {
          console.warn('[send-whatsapp-message] Auth header present but user verification failed:', authError?.message);
          // Don't fail - allow the request to proceed for local dev
        }
      } catch (error) {
        console.warn('[send-whatsapp-message] Error creating Supabase client:', error);
        // Don't fail - allow the request to proceed for local dev
      }
    } else {
      console.log('[send-whatsapp-message] No auth header - proceeding without authentication (local dev mode)');
    }

    // Parse request body
    let body: SendMessageRequest;
    try {
      body = await parseJsonBody<SendMessageRequest>(req);
    } catch (error: any) {
      console.error('[send-whatsapp-message] JSON parse error:', error);
      return errorResponse('Invalid JSON in request body', 400);
    }

    const { phoneNumber, message, buttons, footer } = body;

    if (!phoneNumber || !message) {
      return errorResponse('phoneNumber and message are required', 400);
    }

    const chatId = getChatId(phoneNumber);

    // If buttons are provided, use SendButtons endpoint
    if (buttons && buttons.length > 0) {
      if (buttons.length > 3) {
        return errorResponse('Maximum 3 buttons allowed per message', 400);
      }

      // Validate button text length
      for (const button of buttons) {
        if (button.text.length > 25) {
          return errorResponse(`Button text "${button.text}" exceeds 25 character limit`, 400);
        }
      }

      const url = `https://api.green-api.com/waInstance${idInstance}/SendButtons/${apiTokenInstance}`;

      const requestBody: any = {
        chatId,
        message,
        buttons: buttons.map((btn, index) => ({
          buttonId: String(index + 1),
          buttonText: btn.text,
        })),
      };

      if (footer) {
        requestBody.footer = footer;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return errorResponse(
          errorData.error || `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      return successResponse(data);
    } else {
      // Use standard sendMessage endpoint
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
        const errorData = await response.json().catch(() => ({}));
        return errorResponse(
          errorData.error || `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      return successResponse(data);
    }
  } catch (error: any) {
    console.error('[send-whatsapp-message] Error:', error);
    return errorResponse(error?.message || 'Failed to send WhatsApp message', 500);
  }
});
