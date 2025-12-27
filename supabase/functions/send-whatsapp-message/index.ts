// Supabase Edge Function to proxy Green API WhatsApp messages
// This solves CORS issues by making the API call server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  phoneNumber: string;
  message: string;
  buttons?: Array<{ id: string; text: string }>;
  footer?: string;
}

serve(async (req) => {
  console.log('[send-whatsapp-message] Function called:', {
    method: req.method,
    url: req.url,
    hasAuthHeader: !!req.headers.get('Authorization'),
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[send-whatsapp-message] Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
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
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMsg,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // When verify_jwt = true, Supabase automatically verifies the JWT before the function runs
    // If we get here, the JWT is valid. We can get the user from the auth header.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[send-whatsapp-message] Missing Supabase environment variables');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error: Missing Supabase URL or Anon Key',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Since verify_jwt = false, we'll verify auth manually if header is present
    // This allows the function to work both with and without auth for local dev
    const authHeader = req.headers.get('Authorization');
    let user = null;
    
    if (authHeader) {
      // Try to verify the user if auth header is present
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: { Authorization: authHeader },
        },
      });

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
    } else {
      console.log('[send-whatsapp-message] No auth header - proceeding without authentication (local dev mode)');
    }

    // Parse request body
    let body: SendMessageRequest;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[send-whatsapp-message] JSON parse error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { phoneNumber, message, buttons, footer } = body;

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'phoneNumber and message are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Format phone number (remove +, 0, spaces, hyphens)
    let formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '972' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('972') && formattedPhone.length === 9) {
      formattedPhone = '972' + formattedPhone;
    }

    const chatId = `${formattedPhone}@c.us`;

    // If buttons are provided, use SendButtons endpoint
    if (buttons && buttons.length > 0) {
      if (buttons.length > 3) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Maximum 3 buttons allowed per message',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Validate button text length
      for (const button of buttons) {
        if (button.text.length > 25) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Button text "${button.text}" exceeds 25 character limit`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
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
        return new Response(
          JSON.stringify({
            success: false,
            error: errorData.error || `HTTP error! status: ${response.status}`,
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const data = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
        return new Response(
          JSON.stringify({
            success: false,
            error: errorData.error || `HTTP error! status: ${response.status}`,
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const data = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('[send-whatsapp-message] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Failed to send WhatsApp message',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

