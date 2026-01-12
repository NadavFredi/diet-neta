/**
 * Green API Service
 * 
 * Service for sending WhatsApp messages via Green API
 * Fetches credentials from PostgreSQL and makes direct API calls
 */
import { supabase } from '@/lib/supabaseClient';
import { formatPhoneNumberForGreenAPI } from '@/components/ui/phone-input';

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
 * Expected format: 972XXXXXXXXX or 1XXXXXXXXXX (country code + number)
 * Supports USA (+1), Israel (+972), and all other countries
 * 
 * Uses centralized phone formatting utility from phone-input.tsx
 */
export const formatPhoneNumber = (phone: string): string => {
  return formatPhoneNumberForGreenAPI(phone);
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
          
          // Use proxy in development to avoid CORS issues
          const fallbackBaseUrl = import.meta.env.DEV 
            ? '/api/green-api'  // Use Vite proxy in development
            : 'https://api.green-api.com';  // Direct call in production
          
          const fallbackUrl = `${fallbackBaseUrl}/waInstance${config.idInstance}/sendMessage/${config.apiTokenInstance}`;
          
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
      // Also check for common error patterns
      const hasError = responseData.error || responseData.errorMessage || responseData.errorCode;
      const hasErrorCode = responseData.errorCode;
      
      // Check for common error patterns in response
      const responseString = JSON.stringify(responseData).toLowerCase();
      const commonErrors = ['unauthorized', 'forbidden', 'not found', 'invalid', 'failed', 'error'];
      const hasCommonError = commonErrors.some(err => responseString.includes(err));
      
      if (hasError || hasErrorCode || (hasCommonError && !responseData.idMessage)) {
        const errorMsg = responseData.error || responseData.errorMessage || responseData.message || 
                        (responseData.errorCode ? `Error code: ${responseData.errorCode}` : 'Message failed to send');
        console.error('[GreenAPI] SendButtons failed despite 200 status:', {
          error: errorMsg,
          errorCode: responseData.errorCode,
          hasCommonError,
          fullResponse: responseData,
        });
        return {
          success: false,
          error: errorMsg,
        };
      }

      // Verify message was actually queued/sent - idMessage MUST be present
      if (responseData.idMessage === null || responseData.idMessage === undefined) {
        console.error('[GreenAPI] SendButtons response missing idMessage - message was NOT sent:', {
          responseData,
          chatId,
          buttonCount: cleanedButtons.length,
          status: response.status,
          statusText: response.statusText,
          fullResponse: JSON.stringify(responseData, null, 2),
        });
        
        // Check if response is empty or malformed
        if (!responseData || Object.keys(responseData).length === 0) {
          console.error('[GreenAPI] Empty or malformed SendButtons response');
          return {
            success: false,
            error: 'Message failed to send: Empty response from Green API. Check your API credentials and network connection.',
          };
        }
        
        return {
          success: false,
          error: 'Message failed to send: Response missing idMessage. HTTP status was 200, but the message was not queued by WhatsApp. This usually means: 1) The phone number is invalid or not registered on WhatsApp, 2) The WhatsApp account is not properly connected, or 3) There was an issue with the Green API service.',
        };
      }

      // Additional validation: idMessage should be a valid string
      let idMessage = responseData.idMessage;
      if (typeof idMessage === 'number') {
        idMessage = String(idMessage);
      }
      
      if (typeof idMessage !== 'string' || idMessage.trim() === '') {
        console.error('[GreenAPI] Invalid idMessage format in SendButtons response:', {
          idMessage: responseData.idMessage,
          type: typeof responseData.idMessage,
          responseData,
        });
        return {
          success: false,
          error: 'Message failed to send: Invalid idMessage format in response.',
        };
      }

      console.log('[GreenAPI] SendButtons message successfully queued:', {
        idMessage: idMessage,
        chatId,
        buttonCount: cleanedButtons.length,
      });

      return {
        success: true,
        data: { ...responseData, idMessage },
      };
    }
    
    // If we reach here, either no buttons were provided OR all buttons were invalid
    // Use standard sendMessage endpoint for regular messages
    // Use Vite proxy in development to avoid CORS issues
    const baseUrl = import.meta.env.DEV 
      ? '/api/green-api'  // Use Vite proxy in development
      : 'https://api.green-api.com';  // Direct call in production
    
    url = `${baseUrl}/waInstance${config.idInstance}/sendMessage/${config.apiTokenInstance}`;

    console.log('[GreenAPI] Sending regular message:', {
      url,
      chatId,
      messageLength: cleanedMessage.length,
      usingProxy: import.meta.env.DEV,
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
    // Also check for common error patterns
    const hasError = responseData.error || responseData.errorMessage || responseData.errorCode;
    const hasErrorMessage = responseData.errorMessage || responseData.message;
    const hasErrorCode = responseData.errorCode;
    
    // Check for common error patterns in response
    const responseString = JSON.stringify(responseData).toLowerCase();
    const commonErrors = ['unauthorized', 'forbidden', 'not found', 'invalid', 'failed', 'error'];
    const hasCommonError = commonErrors.some(err => responseString.includes(err));
    
    if (hasError || hasErrorCode || (hasCommonError && !responseData.idMessage)) {
      const errorMsg = responseData.error || responseData.errorMessage || responseData.message || 
                      (responseData.errorCode ? `Error code: ${responseData.errorCode}` : 'Unknown error in response');
      console.error('[GreenAPI] Message send failed despite 200 status:', {
        error: errorMsg,
        errorCode: responseData.errorCode,
        hasCommonError,
        fullResponse: responseData,
      });
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Verify message was actually queued/sent
    // idMessage MUST be present and valid for successful sends
    // Without idMessage, we cannot confirm the message was queued
    if (responseData.idMessage === null || responseData.idMessage === undefined) {
      console.error('[GreenAPI] Response missing idMessage - message was NOT sent:', {
        responseData,
        chatId,
        messageLength: cleanedMessage.length,
        formattedPhone: formattedPhone,
        status: response.status,
        statusText: response.statusText,
        hasError: !!responseData.error,
        hasErrorMessage: !!responseData.errorMessage,
        fullResponse: JSON.stringify(responseData, null, 2),
      });
      
      // Check for specific error messages in response
      const errorMsg = responseData.error || responseData.errorMessage || responseData.message;
      if (errorMsg) {
        console.error('[GreenAPI] Error message found in response:', errorMsg);
        return {
          success: false,
          error: `Message failed to send: ${errorMsg}`,
        };
      }
      
      // Check if response is empty or malformed
      if (!responseData || Object.keys(responseData).length === 0) {
        console.error('[GreenAPI] Empty or malformed response');
        return {
          success: false,
          error: 'Message failed to send: Empty response from Green API. Check your API credentials and network connection.',
        };
      }
      
      console.error('[GreenAPI] HTTP 200 but no idMessage - message was NOT queued');
      return {
        success: false,
        error: 'Message failed to send: Response missing idMessage. HTTP status was 200, but the message was not queued by WhatsApp. This usually means: 1) The phone number is invalid or not registered on WhatsApp, 2) The WhatsApp account is not properly connected, or 3) There was an issue with the Green API service.',
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

    let mediaUrl = params.media.url;
    const mediaType = params.media.type;

    // Check if URL is a signed URL or localhost URL that GreenAPI can't access
    const isSignedUrl = mediaUrl.includes('?token=') || mediaUrl.includes('/storage/v1/object/sign/');
    const isLocalhost = mediaUrl.includes('127.0.0.1') || mediaUrl.includes('localhost');
    
    if (isSignedUrl || isLocalhost) {
      // Try to convert signed URL to public URL for templates folder
      // Extract the file path from signed URL
      let filePath = '';
      
      if (mediaUrl.includes('/storage/v1/object/sign/')) {
        // Extract path from signed URL: /storage/v1/object/sign/client-assets/templates/...
        const signIndex = mediaUrl.indexOf('/storage/v1/object/sign/');
        if (signIndex !== -1) {
          const pathStart = signIndex + '/storage/v1/object/sign/'.length;
          const pathEnd = mediaUrl.indexOf('?', pathStart);
          filePath = pathEnd !== -1 ? mediaUrl.substring(pathStart, pathEnd) : mediaUrl.substring(pathStart);
        }
      } else if (mediaUrl.includes('/storage/v1/object/public/')) {
        // Already a public URL format, extract path
        const publicIndex = mediaUrl.indexOf('/storage/v1/object/public/');
        if (publicIndex !== -1) {
          const pathStart = publicIndex + '/storage/v1/object/public/'.length;
          const pathEnd = mediaUrl.indexOf('?', pathStart);
          filePath = pathEnd !== -1 ? mediaUrl.substring(pathStart, pathEnd) : mediaUrl.substring(pathStart);
        }
      }
      
      // If we're in development with localhost, we can't send media
      if (isLocalhost) {
        return {
          success: false,
          error: 'לא ניתן לשלוח מדיה בפיתוח מקומי. GreenAPI לא יכול לגשת לקבצים ב-localhost. אנא השתמש בסביבת ייצור או העלה את המדיה למיקום ציבורי.',
        };
      }
      
      // For production, try to use public URL if the bucket allows it
      // Note: This only works if the templates folder is public
      if (filePath && filePath.startsWith('templates/')) {
        // Try to construct public URL (only works if bucket/folder is public)
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        if (supabaseUrl) {
          // Remove trailing slash if present
          const baseUrl = supabaseUrl.replace(/\/$/, '');
          mediaUrl = `${baseUrl}/storage/v1/object/public/client-assets/${filePath}`;
          console.log('[GreenAPI] Converted signed URL to public URL for media:', mediaUrl);
        } else {
          return {
            success: false,
            error: 'לא ניתן לשלוח מדיה עם קישור פרטי. אנא ודא שהמדיה נגישה באופן ציבורי או השתמש בקישור חיצוני.',
          };
        }
      } else {
        return {
          success: false,
          error: 'לא ניתן לשלוח מדיה עם קישור פרטי. GreenAPI דורש קישור ציבורי. אנא העלה את המדיה למיקום ציבורי או השתמש בקישור חיצוני (YouTube, Vimeo, וכו\').',
        };
      }
    }

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
    // Use Vite proxy in development to avoid CORS issues
    const baseUrl = import.meta.env.DEV 
      ? '/api/green-api'  // Use Vite proxy in development
      : 'https://api.green-api.com';  // Direct call in production
    
    const url = `${baseUrl}/waInstance${config.idInstance}/sendFileByUrl/${config.apiTokenInstance}`;

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
      error: responseData.error,
      errorMessage: responseData.errorMessage,
      fullResponse: JSON.stringify(responseData, null, 2),
    });

    if (!response.ok) {
      console.error('[GreenAPI] sendFileByUrl error:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        mediaUrl: mediaUrl.substring(0, 100) + '...', // Log partial URL for debugging
      });

      // Check for specific error messages
      const errorMsg = responseData.error || responseData.message || responseData.errorMessage || responseText || `HTTP error! status: ${response.status}`;
      
      // Check if it's a URL access error
      if (errorMsg.toLowerCase().includes('url') || errorMsg.toLowerCase().includes('download') || errorMsg.toLowerCase().includes('access')) {
        return {
          success: false,
          error: `לא ניתן לגשת לקישור המדיה: ${errorMsg}. ודא שהקישור נגיש באופן ציבורי ושאינו דורש אימות.`,
        };
      }

      return {
        success: false,
        error: errorMsg,
      };
    }

    // Check for errors in response body (even with 200 status)
    if (responseData.error || responseData.errorMessage) {
      const errorMsg = responseData.error || responseData.errorMessage || 'Unknown error';
      console.error('[GreenAPI] Media send failed despite 200 status:', {
        error: errorMsg,
        fullResponse: responseData,
        mediaUrl: mediaUrl.substring(0, 100) + '...',
      });
      
      // Check if it's a URL access error
      if (errorMsg.toLowerCase().includes('url') || errorMsg.toLowerCase().includes('download') || errorMsg.toLowerCase().includes('access') || errorMsg.toLowerCase().includes('unable')) {
        return {
          success: false,
          error: `GreenAPI לא יכול לגשת לקישור המדיה: ${errorMsg}. ודא שהקישור נגיש באופן ציבורי (לא localhost ולא קישור פרטי).`,
        };
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    }

    // Verify message was queued
    if (responseData.idMessage === null || responseData.idMessage === undefined) {
      console.error('[GreenAPI] Media send failed - missing idMessage:', {
        responseData,
        mediaUrl: mediaUrl.substring(0, 100) + '...',
        chatId,
      });
      
      // Check if there's a specific reason in the response
      if (responseData.errorCode || responseData.errorDescription) {
        return {
          success: false,
          error: `Media failed to send: ${responseData.errorDescription || responseData.errorCode || 'Response missing idMessage'}`,
        };
      }
      
      return {
        success: false,
        error: 'Media failed to send: Response missing idMessage. This usually means GreenAPI could not download the media file from the provided URL. Ensure the URL is publicly accessible and not a localhost or signed URL.',
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


