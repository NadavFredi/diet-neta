/**
 * Shared Types and Interfaces
 * Common type definitions used across edge functions
 */

export interface WhatsAppWebhookBody {
  typeWebhook?: string;
  timestamp?: number;
  idMessage?: string;
  senderData?: {
    sender?: string;
    senderName?: string;
    chatId?: string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: {
      textMessage?: string;
    };
    extendedTextMessageData?: {
      text?: string;
    };
    buttonResponseMessageData?: {
      selectedButtonId?: string;
      selectedButtonText?: string;
    };
  };
  [key: string]: any;
}

export interface SendMessageRequest {
  phoneNumber: string;
  message: string;
  buttons?: Array<{ id: string; text: string }>;
  footer?: string;
}

