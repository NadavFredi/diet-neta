/**
 * Green API Service
 * 
 * Service for sending WhatsApp messages via Green API
 * Uses Supabase Edge Function to proxy requests (solves CORS issues)
 */
import { supabase } from '@/lib/supabaseClient';

export interface GreenApiConfig {
  idInstance: string;
  apiTokenInstance: string;
}

export interface SendMessageParams {
  phoneNumber: string; // Format: 972XXXXXXXXX (country code + number without + or 0)
  message: string;
  buttons?: Array<{ id: string; text: string }>; // Optional interactive buttons (max 3)
  footer?: string; // Optional footer text for button messages
}

export interface GreenApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Get Green API configuration from environment variables
 */
export const getGreenApiConfig = (): GreenApiConfig | null => {
  const idInstance = import.meta.env.VITE_GREEN_API_ID_INSTANCE;
  const apiTokenInstance = import.meta.env.VITE_GREEN_API_TOKEN_INSTANCE;

  if (!idInstance || !apiTokenInstance) {
    const missing = [];
    if (!idInstance) missing.push('VITE_GREEN_API_ID_INSTANCE');
    if (!apiTokenInstance) missing.push('VITE_GREEN_API_TOKEN_INSTANCE');
    
    console.warn('[GreenAPI] Missing environment variables:', missing.join(', '));
    console.warn('[GreenAPI] Available env vars:', {
      hasIdInstance: !!idInstance,
      hasApiTokenInstance: !!apiTokenInstance,
      idInstanceValue: idInstance ? `${idInstance.substring(0, 4)}...` : 'undefined',
    });
    return null;
  }

  // Check for placeholder values
  if (idInstance === 'your_instance_id' || apiTokenInstance === 'your_token') {
    console.error('[GreenAPI] Placeholder values detected! Please replace with actual credentials in .env.local');
    console.error('[GreenAPI] Current values:', {
      idInstance: idInstance === 'your_instance_id' ? 'PLACEHOLDER' : '✓',
      apiTokenInstance: apiTokenInstance === 'your_token' ? 'PLACEHOLDER' : '✓',
    });
    return null;
  }

  return {
    idInstance,
    apiTokenInstance,
  };
};

/**
 * Format phone number for Green API (remove +, 0, spaces, hyphens)
 * Expected format: 972XXXXXXXXX (country code + number)
 */
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle Israeli numbers (if starts with 0, replace with 972)
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1);
  }
  
  // If doesn't start with country code, assume it's Israeli and add 972
  if (!cleaned.startsWith('972') && cleaned.length === 9) {
    cleaned = '972' + cleaned;
  }
  
  return cleaned;
};

/**
 * Send WhatsApp message via Green API using Supabase Edge Function
 * This solves CORS issues by proxying requests through the backend
 * Supports both plain text messages and interactive button messages
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

    // Ensure we have an active session before calling the function
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[GreenAPI] Session error:', sessionError);
      return {
        success: false,
        error: 'Authentication error. Please log in again.',
      };
    }
    
    if (!session) {
      console.error('[GreenAPI] No active session');
      return {
        success: false,
        error: 'Authentication required. Please log in again.',
      };
    }
    
    // Verify session is still valid
    if (!session.access_token) {
      console.error('[GreenAPI] Invalid session - no access token');
      return {
        success: false,
        error: 'Invalid session. Please log in again.',
      };
    }
    
    console.log('[GreenAPI] Session valid, calling Edge Function');

    // Call Edge Function directly via fetch to avoid Supabase client routing issues
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/send-whatsapp-message`;
    
    console.log('[GreenAPI] Calling function URL:', functionUrl);
    console.log('[GreenAPI] Request body:', {
      phoneNumber: params.phoneNumber,
      messageLength: params.message.length,
      hasButtons: !!params.buttons,
      buttonCount: params.buttons?.length || 0,
    });

    // Build headers - Supabase functions need both apikey and Authorization
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    };
    
    // Only add Authorization if we have a valid token
    if (session.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    console.log('[GreenAPI] Request headers:', {
      hasApikey: !!headers['apikey'],
      hasAuth: !!headers['Authorization'],
      apikeyLength: headers['apikey']?.length || 0,
    });

    // Clean the message to remove HTML tags and format for WhatsApp
    const cleanedMessage = cleanWhatsAppMessage(params.message);
    
    // Clean button text as well
    const cleanedButtons = params.buttons?.map(btn => ({
      id: btn.id,
      text: cleanWhatsAppMessage(btn.text),
    }));
    
    // Clean footer if present
    const cleanedFooter = params.footer ? cleanWhatsAppMessage(params.footer) : undefined;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phoneNumber: params.phoneNumber,
        message: cleanedMessage,
        buttons: cleanedButtons,
        footer: cleanedFooter,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      console.error('[GreenAPI] Edge function error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        errorText: errorText,
        headers: Object.fromEntries(response.headers.entries()),
      });
      
      // Log the full error for debugging
      console.error('[GreenAPI] Full error response:', JSON.stringify(errorData, null, 2));
      
      return {
        success: false,
        error: errorData.error || errorData.message || errorText || `HTTP error! status: ${response.status}`,
      };
    }

    const data = await response.json();

    // The edge function returns { success, data, error }
    if (data && !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to send WhatsApp message',
      };
    }

    return {
      success: true,
      data: data?.data,
    };
  } catch (error: any) {
    console.error('[GreenAPI] Error sending message:', error);
    return {
      success: false,
      error: error?.message || 'Failed to send WhatsApp message',
    };
  }
};

/**
 * Clean HTML tags and format text for WhatsApp
 * Removes HTML tags, converts to proper line breaks, and cleans up formatting
 */
export const cleanWhatsAppMessage = (text: string): string => {
  if (!text) return text;
  
  let cleaned = text;
  
  // Replace common HTML tags with appropriate formatting
  // <p> and </p> -> double line break (paragraph)
  cleaned = cleaned.replace(/<p[^>]*>/gi, '\n\n');
  cleaned = cleaned.replace(/<\/p>/gi, '');
  
  // <br> and <br/> -> single line break
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove other HTML tags but preserve their content
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Clean up excessive line breaks (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace from start and end, but preserve intentional line breaks
  cleaned = cleaned.trim();
  
  // Remove trailing spaces from each line
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


