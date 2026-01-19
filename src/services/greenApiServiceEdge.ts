/**
 * Green API Service (Edge Function Wrapper)
 * 
 * Frontend service that calls the send-whatsapp-message Edge Function
 * This keeps all API keys secure on the server side
 */

import { supabase } from '@/lib/supabaseClient';
import { formatPhoneNumberForGreenAPI } from '@/components/ui/phone-input';

export interface MediaData {
  type: 'image' | 'video' | 'gif';
  url: string;
}

export interface SendMessageParams {
  phoneNumber: string;
  message: string;
  buttons?: Array<{ id: string; text: string }>;
  footer?: string;
  media?: MediaData;
}

export interface GreenApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  warning?: string;
}

/**
 * Clean HTML tags and format text for WhatsApp
 */
export const cleanWhatsAppMessage = (text: string): string => {
  if (!text) return text;
  
  let cleaned = text;
  cleaned = cleaned.replace(/<p[^>]*>/gi, '\n\n');
  cleaned = cleaned.replace(/<\/p>/gi, '');
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
  
  return cleaned;
};

/**
 * Replace placeholders in template with actual values
 */
export const replacePlaceholders = (
  template: string,
  placeholders: Record<string, string | number | null | undefined>
): string => {
  let result = template;
  Object.entries(placeholders).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const replacement = value != null ? String(value) : '';
    result = result.replace(regex, replacement);
  });
  return result;
};

/**
 * Send WhatsApp message via Edge Function
 */
export const sendWhatsAppMessage = async (
  params: SendMessageParams
): Promise<GreenApiResponse> => {
  try {
    // Validate button count (max 3)
    if (params.buttons && params.buttons.length > 3) {
      return {
        success: false,
        error: 'Maximum 3 buttons allowed per message',
      };
    }

    // Validate button text length (max 25 characters per Green API)
    if (params.buttons) {
      for (const button of params.buttons) {
        if (button.text.length > 25) {
          return {
            success: false,
            error: `Button text "${button.text}" exceeds 25 character limit`,
          };
        }
      }
    }

    // Get session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        success: false,
        error: 'Not authenticated. Please log in to send messages.',
      };
    }

    // Clean the message
    const cleanedMessage = cleanWhatsAppMessage(params.message || '');
    
    // Clean button text
    const cleanedButtons = params.buttons
      ?.map(btn => ({
        id: btn.id,
        text: cleanWhatsAppMessage(btn.text),
      }))
      .filter(btn => btn.text && btn.text.trim().length > 0) || [];
    
    // Clean footer if present
    const cleanedFooter = params.footer ? cleanWhatsAppMessage(params.footer) : undefined;

    // Call Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-whatsapp-message`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        phoneNumber: params.phoneNumber,
        message: cleanedMessage,
        buttons: cleanedButtons.length > 0 ? cleanedButtons : undefined,
        footer: cleanedFooter,
        media: params.media,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `Failed to send message: ${response.status}`,
      };
    }

    // Validate response has idMessage
    if (!result.data?.idMessage) {
      return {
        success: false,
        error: 'Message failed to send: Response missing idMessage. This usually means the message was not queued by WhatsApp.',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    // Check if it's a CORS error
    if (error?.message?.includes('CORS') || error?.message?.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'Network error: Could not connect to server. Please check your connection.',
      };
    }

    return {
      success: false,
      error: error?.message || error?.toString() || 'Failed to send WhatsApp message',
    };
  }
};
