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

export interface MediaData {
  type: 'image' | 'video' | 'gif';
  url: string;
}

export interface SendMessageParams {
  phoneNumber: string; // Format: 972XXXXXXXXX (country code + number without + or 0)
  message: string;
  buttons?: Array<{ id: string; text: string }>; // Optional interactive buttons (max 3)
  footer?: string; // Optional footer text for button messages
  media?: MediaData; // Optional media attachment (image, video, or GIF)
}

export interface GreenApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  warning?: string; // Optional warning message (e.g., when falling back to regular message)
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
 * Get Green API configuration from environment variables (priority) or PostgreSQL database (fallback)
 */
export const getGreenApiConfig = async (): Promise<GreenApiConfig | null> => {
  // Check cache first
  const now = Date.now();
  if (credentialsCache && (now - credentialsCacheTime) < CACHE_DURATION) {
    return credentialsCache;
  }

  // Priority 1: Check environment variables first (from .env.local)
  const envIdInstance = import.meta.env.VITE_GREEN_API_ID_INSTANCE;
  const envApiTokenInstance = import.meta.env.VITE_GREEN_API_TOKEN_INSTANCE;

  if (envIdInstance && envApiTokenInstance) {
    // Check for placeholder values
    if (envIdInstance === 'your_instance_id' || envApiTokenInstance === 'your_token') {
      console.warn('[GreenAPI] Placeholder values detected in environment variables. Checking database...');
    } else {
      // Valid env vars found, use them
      const config: GreenApiConfig = {
        idInstance: envIdInstance,
        apiTokenInstance: envApiTokenInstance,
      };

      // Update cache
      credentialsCache = config;
      credentialsCacheTime = now;
    
      console.log('[GreenAPI] Using credentials from environment variables');
      return config;
    }
  }

  // Priority 2: Fallback to database
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
      console.warn('[GreenAPI] No Green API credentials found in database or environment variables.');
      console.warn('[GreenAPI] Please set VITE_GREEN_API_ID_INSTANCE and VITE_GREEN_API_TOKEN_INSTANCE in .env.local');
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

    console.log('[GreenAPI] Using credentials from database');
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
  console.log('[GreenAPI] sendWhatsAppMessage called with params:', {
    phoneNumber: params.phoneNumber,
    messageLength: params.message?.length,
    hasButtons: !!params.buttons,
    hasMedia: !!params.media,
    mediaType: params.media?.type,
  });
  
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

    // If media is provided, send file first, then send text message separately if needed
    // GreenAPI sendFileByUrl supports caption, so we can send media with caption
    if (params.media?.url) {
      return await sendMediaMessage(config, chatId, params);
    }

    // Clean the message to remove HTML tags and format for WhatsApp
    const cleanedMessage = cleanWhatsAppMessage(params.message);
    
    // Clean button text as well
    // Clean and validate buttons
    const cleanedButtons = params.buttons
      ?.map(btn => ({
        id: btn.id,
        text: cleanWhatsAppMessage(btn.text),
      }))
      .filter(btn => btn.text && btn.text.trim().length > 0) || []; // Filter out buttons with empty text, default to empty array
    
    // Clean footer if present
    const cleanedFooter = params.footer ? cleanWhatsAppMessage(params.footer) : undefined;

    // Determine if we should use buttons endpoint
    // Only use SendButtons if we have valid buttons after cleaning
    const hasValidButtons = cleanedButtons.length > 0;

    console.log('[GreenAPI] Sending message to Green API:', {
      chatId,
      messageLength: cleanedMessage.length,
      hasButtons: hasValidButtons,
      buttonCount: cleanedButtons.length,
      originalButtonCount: params.buttons?.length || 0,
    });

    // If buttons are provided and valid, use SendButtons endpoint
    // Reference: https://console.green-api.com/app/api/SendButtons
    // Note: This endpoint has CORS restrictions, so we use Vite proxy in development
    // For production, you may need to configure CORS on Green API side or use a server-side proxy
    let url: string;
    let response: Response;
    let responseText: string;
    let responseData: any;
    if (hasValidButtons) {
      // Use Vite proxy in development to avoid CORS issues
      // In production, this will attempt direct call (may need server-side proxy if CORS is still blocked)
      const baseUrl = import.meta.env.DEV 
        ? '/api/green-api'  // Use Vite proxy in development
        : 'https://api.green-api.com';  // Direct call in production (may fail due to CORS)
      
      // Use the correct endpoint: SendButtons (capital S)
      url = `${baseUrl}/waInstance${config.idInstance}/SendButtons/${config.apiTokenInstance}`;

      // Format according to Green API documentation:
      // Reference: https://console.green-api.com/app/api/SendButtons
      // The request body should have 'message' field for the message text
      // Each button needs buttonId (unique identifier) and buttonText (the label)
      // Ensure all buttons have valid buttonText (required field)
      const requestBody: any = {
        chatId,
        message: cleanedMessage || '', // Use 'message' field as per Green API spec for SendButtons
        buttons: cleanedButtons
          .filter(btn => btn.text && btn.text.trim().length > 0) // Ensure buttonText is not empty
          .map((btn, index) => ({
            buttonId: String(index + 1), // GreenAPI requires sequential IDs: "1", "2", "3"
            buttonText: btn.text.trim(), // Use buttonText as per Green API spec (required field)
          })),
      };
      
      // We have valid buttons, proceed with SendButtons endpoint
      if (cleanedFooter) {
        requestBody.footer = cleanedFooter;
      }

      console.log('[GreenAPI] Request details:', {
        url,
        requestBody: JSON.stringify(requestBody, null, 2),
      });

      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      responseText = await response.text();
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      console.log('[GreenAPI] Response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      });

      if (!response.ok) {
        console.error('[GreenAPI] SendButtons error:', {
          status: response.status,
          statusText: response.statusText,
          error: responseData,
        });

        // If SendButtons fails with 403, it likely means the account doesn't have access to this feature
        // Fall back to sending as regular message (buttons will be sent as text)
        if (response.status === 403) {
          console.warn('[GreenAPI] SendButtons endpoint returned 403. This usually means the account does not have access to interactive buttons (requires premium plan). Falling back to regular message...');
          
          // Fallback: Send as regular message with buttons listed in text
          const buttonsText = cleanedButtons.map((btn, idx) => `${idx + 1}. ${btn.text}`).join('\n');
          const messageWithButtons = `${cleanedMessage}\n\n${buttonsText}`;
          
          // Use direct URL for fallback (not proxy, since sendMessage works directly)
          const fallbackUrl = `https://api.green-api.com/waInstance${config.idInstance}/sendMessage/${config.apiTokenInstance}`;
          
          const fallbackResponse = await fetch(fallbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId,
              message: messageWithButtons,
            }),
          });

          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            return {
              success: false,
              error: `SendButtons requires premium plan (403). Fallback message also failed: ${fallbackErrorText}`,
            };
          }

          const fallbackData = await fallbackResponse.json();
          
          return {
            success: true,
            data: fallbackData,
            warning: 'Interactive buttons are not available on your plan. Message sent as text with button options listed.',
          };
        }

        return {
          success: false,
          error: responseData.error || responseData.message || responseText || `HTTP error! status: ${response.status}`,
        };
      }

      // Check if response indicates failure even with 200 status
      // GreenAPI sometimes returns 200 with error in body
      if (responseData.error || responseData.errorMessage || (responseData.idMessage === null && responseData.idMessage !== undefined)) {
        const errorMsg = responseData.error || responseData.errorMessage || 'Message failed to send (idMessage is null)';
        console.error('[GreenAPI] Message send failed despite 200 status:', errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Verify message was actually queued/sent
      if (!responseData.idMessage) {
        console.warn('[GreenAPI] Response missing idMessage, message may not have been sent:', responseData);
      }

      return {
        success: true,
        data: responseData,
      };
    }
    
    // If we reach here, either no buttons were provided OR all buttons were invalid
    // Use standard sendMessage endpoint for regular messages
    url = `https://api.green-api.com/waInstance${config.idInstance}/sendMessage/${config.apiTokenInstance}`;

    console.log('[GreenAPI] Sending regular message:', {
      url,
      chatId,
      messageLength: cleanedMessage.length,
    });

    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        message: cleanedMessage,
      }),
    });

    responseText = await response.text();
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Log full response details for debugging
    console.log('[GreenAPI] sendMessage response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: responseData,
      idMessage: responseData.idMessage,
      hasError: !!responseData.error,
      errorMessage: responseData.error || responseData.errorMessage,
      fullResponse: JSON.stringify(responseData, null, 2),
    });
    
    // Log raw response text for debugging
    console.log('[GreenAPI] Raw response text:', responseText);

    if (!response.ok) {
      console.error('[GreenAPI] sendMessage error:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
      });
      
      return {
        success: false,
        error: responseData.error || responseData.message || responseText || `HTTP error! status: ${response.status}`,
      };
    }

    // Check if response indicates failure even with 200 status
    // GreenAPI sometimes returns 200 with error in body
    if (responseData.error || responseData.errorMessage) {
      const errorMsg = responseData.error || responseData.errorMessage || 'Unknown error in response';
      console.error('[GreenAPI] Message send failed despite 200 status:', {
        error: errorMsg,
        fullResponse: responseData,
      });
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Verify message was actually queued/sent
    // idMessage should be present and not null for successful sends
    // Note: Some GreenAPI responses might not include idMessage but still succeed
    if (responseData.idMessage === null || responseData.idMessage === undefined) {
      // Check if there's a success indicator in the response
      if (responseData.sentMessageId || responseData.messageId) {
        console.warn('[GreenAPI] Response missing idMessage but has other success indicators:', {
          responseData,
          sentMessageId: responseData.sentMessageId,
          messageId: responseData.messageId,
        });
        // Consider it successful if we have other indicators
        return {
          success: true,
          data: responseData,
          warning: 'Response missing idMessage but message appears to have been sent',
        };
      }
      
      // If response is 200 OK with no error, consider it successful even without idMessage
      // Some GreenAPI versions or configurations might not return idMessage
      if (response.ok && !responseData.error && !responseData.errorMessage) {
        console.warn('[GreenAPI] Response is 200 OK with no errors but missing idMessage. Assuming success:', {
          responseData,
          chatId,
        });
        return {
          success: true,
          data: responseData,
          warning: 'Response missing idMessage but HTTP status indicates success',
        };
      }
      
      console.error('[GreenAPI] Response missing idMessage - message was NOT sent:', {
        responseData,
        chatId,
        messageLength: cleanedMessage.length,
        formattedPhone: formattedPhone,
        fullResponse: JSON.stringify(responseData, null, 2),
      });
      return {
        success: false,
        error: 'Message failed to send: Response missing idMessage. This usually means the message was not queued by WhatsApp. Check if the phone number is valid and the WhatsApp account is properly connected.',
      };
    }

    // Additional check: idMessage should be a string (not null, not undefined, not empty)
    // But be lenient - if it's a number, convert it to string
    let idMessage = responseData.idMessage;
    if (typeof idMessage === 'number') {
      idMessage = String(idMessage);
      console.log('[GreenAPI] Converted numeric idMessage to string:', idMessage);
    }
    
    if (typeof idMessage !== 'string' || idMessage.trim() === '') {
      console.error('[GreenAPI] Invalid idMessage format:', {
        idMessage: responseData.idMessage,
        type: typeof responseData.idMessage,
        responseData,
      });
      return {
        success: false,
        error: 'Message failed to send: Invalid idMessage format in response.',
      };
    }

    console.log('[GreenAPI] Message successfully queued:', {
      idMessage: idMessage,
      chatId,
      phoneNumber: formattedPhone,
    });

    // Final return - this should always be reached if we get here
    const finalResponse: GreenApiResponse = {
      success: true,
      data: { ...responseData, idMessage },
    };
    
    console.log('[GreenAPI] Returning final response:', finalResponse);
    return finalResponse;
  } catch (error: any) {
    console.error('[GreenAPI] Error sending message:', error);
    console.error('[GreenAPI] Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      fullError: error,
    });
    
    // Check if it's a CORS error
    if (error?.message?.includes('CORS') || error?.message?.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'CORS error: Direct browser calls to Green API may be blocked. Please check Green API CORS settings or use a proxy.',
      };
    }

    // Ensure we always return a response object
    return {
      success: false,
      error: error?.message || error?.toString() || 'Failed to send WhatsApp message',
    };
  }
};

/**
 * Send media file (image/video/GIF) via GreenAPI sendFileByUrl endpoint
 */
const sendMediaMessage = async (
  config: GreenApiConfig,
  chatId: string,
  params: SendMessageParams
): Promise<GreenApiResponse> => {
  try {
    if (!params.media?.url) {
      return {
        success: false,
        error: 'Media URL is required',
      };
    }

    const mediaUrl = params.media.url;
    const mediaType = params.media.type;

    // Determine file extension from URL or type
    let fileExtension = '';
    let fileName = '';
    
    if (mediaType === 'image') {
      // Try to extract extension from URL
      const match = mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
      fileExtension = match ? match[1].toLowerCase() : 'jpg';
      fileName = `image.${fileExtension}`;
    } else if (mediaType === 'video') {
      const match = mediaUrl.match(/\.(mp4|3gpp|avi|mov)(\?|$)/i);
      fileExtension = match ? match[1].toLowerCase() : 'mp4';
      fileName = `video.${fileExtension}`;
    } else if (mediaType === 'gif') {
      // GIFs can be .gif or .mp4 (animated GIFs)
      const match = mediaUrl.match(/\.(gif|mp4)(\?|$)/i);
      fileExtension = match ? match[1].toLowerCase() : 'gif';
      fileName = `animation.${fileExtension}`;
    }

    // Clean the message to use as caption
    const caption = cleanWhatsAppMessage(params.message || '');

    // Use sendFileByUrl endpoint
    const url = `https://api.green-api.com/waInstance${config.idInstance}/sendFileByUrl/${config.apiTokenInstance}`;

    const requestBody: any = {
      chatId,
      urlFile: mediaUrl,
      fileName,
    };

    // Add caption if message exists
    if (caption.trim()) {
      requestBody.caption = caption;
    }

    console.log('[GreenAPI] Sending media message:', {
      url,
      chatId,
      mediaType,
      fileName,
      hasCaption: !!caption.trim(),
      captionLength: caption.length,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('[GreenAPI] sendFileByUrl response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data: responseData,
      idMessage: responseData.idMessage,
    });

    if (!response.ok) {
      console.error('[GreenAPI] sendFileByUrl error:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
      });

      return {
        success: false,
        error: responseData.error || responseData.message || responseText || `HTTP error! status: ${response.status}`,
      };
    }

    // Check for errors in response body
    if (responseData.error || responseData.errorMessage) {
      const errorMsg = responseData.error || responseData.errorMessage || 'Unknown error';
      console.error('[GreenAPI] Media send failed despite 200 status:', errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Verify message was queued
    if (responseData.idMessage === null || responseData.idMessage === undefined) {
      console.error('[GreenAPI] Media send failed - missing idMessage:', responseData);
      return {
        success: false,
        error: 'Media failed to send: Response missing idMessage',
      };
    }

    // If buttons are provided, we need to send them separately after the media
    // WhatsApp/GreenAPI doesn't support buttons directly with media in sendFileByUrl
    // So we send buttons as a separate message if needed
    if (params.buttons && params.buttons.length > 0) {
      console.log('[GreenAPI] Media sent successfully. Sending buttons as separate message...');
      
      // Wait a bit for media to process, then send buttons
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send buttons as a separate message
      const buttonsResult = await sendButtonsMessage(config, chatId, params);
      
      if (!buttonsResult.success) {
        return {
          success: true,
          data: responseData,
          warning: `Media sent successfully, but buttons failed: ${buttonsResult.error}`,
        };
      }

      return {
        success: true,
        data: {
          mediaMessage: responseData,
          buttonsMessage: buttonsResult.data,
        },
      };
    }

    console.log('[GreenAPI] Media message successfully queued:', {
      idMessage: responseData.idMessage,
      chatId,
      mediaType,
    });

    return {
      success: true,
      data: responseData,
    };
  } catch (error: any) {
    console.error('[GreenAPI] Error sending media:', error);
    return {
      success: false,
      error: error?.message || error?.toString() || 'Failed to send media message',
    };
  }
};

/**
 * Send buttons as a separate message (used after sending media)
 */
const sendButtonsMessage = async (
  config: GreenApiConfig,
  chatId: string,
  params: SendMessageParams
): Promise<GreenApiResponse> => {
  try {
    // Clean and validate buttons
    const cleanedButtons = params.buttons
      ?.map(btn => ({
        id: btn.id,
        text: cleanWhatsAppMessage(btn.text),
      }))
      .filter(btn => btn.text && btn.text.trim().length > 0) || [];

    if (cleanedButtons.length === 0) {
      return {
        success: false,
        error: 'No valid buttons to send',
      };
    }

    // Use SendButtons endpoint
    const baseUrl = import.meta.env.DEV 
      ? '/api/green-api'
      : 'https://api.green-api.com';
    
    const url = `${baseUrl}/waInstance${config.idInstance}/SendButtons/${config.apiTokenInstance}`;

    const requestBody: any = {
      chatId,
      message: '', // Empty message for buttons-only
      buttons: cleanedButtons.map((btn, index) => ({
        buttonId: String(index + 1),
        buttonText: btn.text.trim(),
      })),
    };

    if (params.footer) {
      requestBody.footer = cleanWhatsAppMessage(params.footer);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok || responseData.error || responseData.errorMessage) {
      return {
        success: false,
        error: responseData.error || responseData.message || 'Failed to send buttons',
      };
    }

    return {
      success: true,
      data: responseData,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to send buttons message',
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


