// Supabase Edge Function to receive WhatsApp webhooks from Green API
// This handles incoming messages, button replies, and other webhook events

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import type { WhatsAppWebhookBody } from '../_shared/types.ts';

serve(async (req) => {

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  // Handle GET requests (for webhook verification from Green API)
  if (req.method === 'GET') {
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

      // Try to parse as JSON
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        body = { rawData: rawBody } as any;
      }
    } catch (error) {
      return errorResponse('Failed to read request body', 400);
    }

    // Log the complete webhook payload as JSON

    // Extract webhook information
    const webhookType = body.typeWebhook || 'unknown';
    const messageId = body.idMessage;
    const timestamp = body.timestamp;
    const sender = body.senderData?.sender || body.senderData?.chatId;
    const senderName = body.senderData?.senderName;

    // Log structured information

    // Handle button reply
    if (body.messageData?.buttonResponseMessageData) {
      const buttonData = body.messageData.buttonResponseMessageData;

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
    return errorResponse(error?.message || 'Failed to process webhook', 500);
  }
});
