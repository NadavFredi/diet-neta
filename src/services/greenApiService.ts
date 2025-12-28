/**
 * Green API Service
 * 
 * Service for sending WhatsApp messages via Green API
 * Fetches credentials from PostgreSQL and makes direct API calls
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

// Cache for credentials to avoid repeated DB calls
let credentialsCache: GreenApiConfig | null = null;
let credentialsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the credentials cache (useful when settings are updated)
 */
export const clearGreenApiConfigCache = (): void => {
  credentialsCache = null;
  credentialsCacheTime = 0;
};

/**
 * Get Green API configuration from PostgreSQL database
 */
export const getGreenApiConfig = async (): Promise<GreenApiConfig | null> => {
  // Check cache first
  const now = Date.now();
  if (credentialsCache && (now - credentialsCacheTime) < CACHE_DURATION) {
    return credentialsCache;
  }

  try {
    const { data, error } = await supabase
      .from('green_api_settings')
      .select('id_instance, api_token_instance')
      .limit(1)
      .maybeSingle(); // Use maybeSingle() to handle empty table gracefully

    if (error) {
      console.error('[GreenAPI] Error fetching credentials from database:', error);
      
      // Check if table doesn't exist (406 or relation errors)
      if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist') || error.message?.includes('406')) {
        console.error('[GreenAPI] Table "green_api_settings" does not exist. Please run: supabase db reset --local');
        return null;
      }
      
      return null;
    }

    // maybeSingle() returns null if no rows found (no error, just no data)
    if (!data) {
      console.warn('[GreenAPI] No Green API credentials found in database. Please insert credentials into green_api_settings table.');
      return null;
    }

    if (!data.id_instance || !data.api_token_instance) {
      console.warn('[GreenAPI] Green API credentials found but incomplete in database');
      return null;
    }

    // Check for placeholder values
    if (data.id_instance === 'your_instance_id' || data.api_token_instance === 'your_token') {
      console.error('[GreenAPI] Placeholder values detected in database. Please update with actual credentials.');
      return null;
    }

    const config: GreenApiConfig = {
      idInstance: data.id_instance,
      apiTokenInstance: data.api_token_instance,
    };

    // Update cache
    credentialsCache = config;
    credentialsCacheTime = now;

    return config;
  } catch (error: any) {
    console.error('[GreenAPI] Unexpected error fetching credentials:', error);
    return null;
  }
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
 * Send WhatsApp message via Green API
 * Fetches credentials from PostgreSQL and makes direct API calls to Green API
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

    // Get credentials from database
    const config = await getGreenApiConfig();
    if (!config) {
      return {
        success: false,
        error: 'Green API credentials not configured. Please set them in the settings.',
      };
    }

    // Format phone number
    let formattedPhone = formatPhoneNumber(params.phoneNumber);
    const chatId = `${formattedPhone}@c.us`;

    // Clean the message to remove HTML tags and format for WhatsApp
    const cleanedMessage = cleanWhatsAppMessage(params.message);
    
    // Clean button text as well
    const cleanedButtons = params.buttons?.map(btn => ({
      id: btn.id,
      text: cleanWhatsAppMessage(btn.text),
    }));
    
    // Clean footer if present
    const cleanedFooter = params.footer ? cleanWhatsAppMessage(params.footer) : undefined;

    console.log('[GreenAPI] Sending message to Green API:', {
      chatId,
      messageLength: cleanedMessage.length,
      hasButtons: !!cleanedButtons && cleanedButtons.length > 0,
      buttonCount: cleanedButtons?.length || 0,
    });

    // If buttons are provided, use SendButtons endpoint
    if (cleanedButtons && cleanedButtons.length > 0) {
      const url = `https://api.green-api.com/waInstance${config.idInstance}/SendButtons/${config.apiTokenInstance}`;

      const requestBody: any = {
        chatId,
        message: cleanedMessage,
        buttons: cleanedButtons.map((btn, index) => ({
          buttonId: String(index + 1),
          buttonText: btn.text,
        })),
      };

      if (cleanedFooter) {
        requestBody.footer = cleanedFooter;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        console.error('[GreenAPI] Green API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        return {
          success: false,
          error: errorData.error || errorData.message || errorText || `HTTP error! status: ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
    } else {
      // Use standard sendMessage endpoint
      const url = `https://api.green-api.com/waInstance${config.idInstance}/sendMessage/${config.apiTokenInstance}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message: cleanedMessage,
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

        console.error('[GreenAPI] Green API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        return {
          success: false,
          error: errorData.error || errorData.message || errorText || `HTTP error! status: ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
    }
  } catch (error: any) {
    console.error('[GreenAPI] Error sending message:', error);
    
    // Check if it's a CORS error
    if (error?.message?.includes('CORS') || error?.message?.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'CORS error: Direct browser calls to Green API may be blocked. Please check Green API CORS settings or use a proxy.',
      };
    }

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


