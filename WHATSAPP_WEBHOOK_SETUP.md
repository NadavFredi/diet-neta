# WhatsApp Webhook Setup Guide

## Overview

This guide explains how to set up the WhatsApp webhook endpoint to receive incoming messages and button replies from Green API.

## Edge Function

The webhook handler is implemented as a Supabase Edge Function: `receive-whatsapp-webhook`

### Features

- Receives incoming WhatsApp messages
- Handles button reply events
- Logs all webhook payloads as JSON
- Supports CORS for webhook verification
- Ready for integration with your database/logic

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# Deploy to Supabase
supabase functions deploy receive-whatsapp-webhook

# Or for local testing
supabase functions serve receive-whatsapp-webhook
```

### 2. Get Your Webhook URL

**Local Development:**
```
http://127.0.0.1:54321/functions/v1/receive-whatsapp-webhook
```

**Production:**
```
https://<your-project-ref>.supabase.co/functions/v1/receive-whatsapp-webhook
```

### 3. Configure Green API Webhook

1. Log in to your Green API account
2. Go to Settings → Webhooks
3. Set the incoming webhook URL to your Edge Function URL
4. Save the settings

### 4. Test the Webhook

The webhook will log all incoming events to the Supabase function logs. You can view them:

```bash
# View logs
supabase functions logs receive-whatsapp-webhook

# Or in Supabase Dashboard
# Go to Edge Functions → receive-whatsapp-webhook → Logs
```

## Webhook Payload Structure

The webhook receives JSON payloads from Green API. Example structure:

```json
{
  "typeWebhook": "incomingMessageReceived",
  "timestamp": 1234567890,
  "idMessage": "message-id",
  "senderData": {
    "sender": "972XXXXXXXXX@c.us",
    "senderName": "Contact Name",
    "chatId": "972XXXXXXXXX@c.us"
  },
  "messageData": {
    "typeMessage": "buttonResponseMessage",
    "buttonResponseMessageData": {
      "selectedButtonId": "1",
      "selectedButtonText": "Button Text"
    }
  }
}
```

### Button Reply Example

When a user clicks a button, you'll receive:

```json
{
  "typeWebhook": "incomingMessageReceived",
  "messageData": {
    "typeMessage": "buttonResponseMessage",
    "buttonResponseMessageData": {
      "selectedButtonId": "1",
      "selectedButtonText": "אישור"
    }
  },
  "senderData": {
    "sender": "972501234567@c.us"
  }
}
```

### Text Message Example

For regular text messages:

```json
{
  "typeWebhook": "incomingMessageReceived",
  "messageData": {
    "typeMessage": "textMessage",
    "textMessageData": {
      "textMessage": "Hello, I want to sign up"
    }
  },
  "senderData": {
    "sender": "972501234567@c.us",
    "senderName": "John Doe"
  }
}
```

## Next Steps

The webhook function currently logs all events. To add business logic:

1. **Save to Database**: Store incoming messages and button replies in PostgreSQL
2. **Auto-Reply Logic**: Implement automated responses based on button clicks
3. **Lead Management**: Update lead status based on button interactions
4. **Notification System**: Alert team members of important messages

## Logs

All webhook payloads are logged as JSON in the function logs. Check the Supabase Dashboard or CLI logs to see incoming events.

## Security

- The webhook endpoint doesn't require JWT verification (needed for external webhooks)
- Consider adding webhook signature verification for production
- The function logs all incoming data - ensure sensitive information is handled appropriately

