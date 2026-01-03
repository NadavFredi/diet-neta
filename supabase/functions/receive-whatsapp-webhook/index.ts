// Supabase Edge Function to receive WhatsApp webhooks from Green API
// This handles incoming messages, button replies, and other webhook events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import type { WhatsAppWebhookBody } from '../_shared/types.ts';

serve(async (req) => {
  console.log('[receive-whatsapp-webhook] Function called:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  });

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log('[receive-whatsapp-webhook] Handling OPTIONS request');
    return corsResponse;
  }

  // Handle GET requests (for webhook verification from Green API)
  if (req.method === 'GET') {
    console.log('[receive-whatsapp-webhook] GET request received');
    return new Response('Webhook endpoint is active', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      status: 200,
    });
  }

  try {
    // Parse request body
    let body: WhatsAppWebhookBody;
    let rawBody: string;

    try {
      rawBody = await req.text();
      console.log('[receive-whatsapp-webhook] Raw body received:', rawBody);

      // Try to parse as JSON
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        console.error('[receive-whatsapp-webhook] Failed to parse JSON, treating as raw text');
        body = { rawData: rawBody } as any;
      }
    } catch (error) {
      console.error('[receive-whatsapp-webhook] Error reading request body:', error);
      return errorResponse('Failed to read request body', 400);
    }

    // Log the complete webhook payload as JSON
    console.log('[receive-whatsapp-webhook] ========================================');
    console.log('[receive-whatsapp-webhook] Webhook payload received:');
    console.log(JSON.stringify(body, null, 2));
    console.log('[receive-whatsapp-webhook] ========================================');

    // Extract webhook information
    const webhookType = body.typeWebhook || 'unknown';
    const messageId = body.idMessage;
    const timestamp = body.timestamp;
    const sender = body.senderData?.sender || body.senderData?.chatId;
    const senderName = body.senderData?.senderName;

    // Log structured information
    console.log('[receive-whatsapp-webhook] Webhook details:', {
      type: webhookType,
      messageId,
      timestamp: timestamp ? new Date(timestamp * 1000).toISOString() : null,
      sender,
      senderName,
      messageType: body.messageData?.typeMessage,
    });

    // Handle button reply
    if (body.messageData?.buttonResponseMessageData) {
      const buttonData = body.messageData.buttonResponseMessageData;
      console.log('[receive-whatsapp-webhook] Button reply detected:', {
        selectedButtonId: buttonData.selectedButtonId,
        selectedButtonText: buttonData.selectedButtonText,
        from: sender,
      });

      // TODO: Add logic to handle button replies
      // - Save to database
      // - Trigger automated responses
      // - Update lead/customer status
      // etc.
    }

    // Handle incoming text message
    if (body.messageData?.typeMessage === 'textMessage' || body.messageData?.textMessageData) {
      const textMessage = body.messageData.textMessageData?.textMessage || 
                         body.messageData.extendedTextMessageData?.text;
      console.log('[receive-whatsapp-webhook] Text message received:', {
        from: sender,
        message: textMessage,
      });

      // TODO: Add logic to handle incoming messages
      // - Save to database
      // - Auto-reply logic
      // - Lead assignment
      // etc.
    }

    // Return success response to Green API
    return successResponse({
      message: 'Webhook received and logged',
      webhookType,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[receive-whatsapp-webhook] Error processing webhook:', error);
    return errorResponse(error?.message || 'Failed to process webhook', 500);
  }
});
