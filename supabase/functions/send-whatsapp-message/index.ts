// Supabase Edge Function to proxy Green API WhatsApp messages
// This solves CORS issues by making the API call server-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, createSupabaseAdmin } from '../_shared/supabase.ts';
import { successResponse, errorResponse } from '../_shared/response.ts';
import { parseJsonBody, getChatId } from '../_shared/utils.ts';
import type { SendMessageRequest } from '../_shared/types.ts';

/**
 * Handle media message sending
 */
async function handleMediaMessage(
  idInstance: string,
  apiTokenInstance: string,
  chatId: string,
  caption: string,
  media: { type: 'image' | 'video' | 'gif'; url: string }
) {
  let mediaUrl = media.url;
  const mediaType = media.type;

  // Check if URL is a signed URL or localhost URL
  const isSignedUrl = mediaUrl.includes('?token=') || mediaUrl.includes('/storage/v1/object/sign/');
  const isLocalhost = mediaUrl.includes('127.0.0.1') || mediaUrl.includes('localhost');
  
  // Handle signed URLs first - convert to public URL format
  if (isSignedUrl) {
    let filePath = '';
    if (mediaUrl.includes('/storage/v1/object/sign/')) {
      const signIndex = mediaUrl.indexOf('/storage/v1/object/sign/');
      if (signIndex !== -1) {
        const pathStart = signIndex + '/storage/v1/object/sign/'.length;
        const pathEnd = mediaUrl.indexOf('?', pathStart);
        filePath = pathEnd !== -1 ? mediaUrl.substring(pathStart, pathEnd) : mediaUrl.substring(pathStart);
      }
    } else if (mediaUrl.includes('?token=')) {
      // Handle signed URLs with token parameter (e.g., from createSignedUrl)
      const urlParts = new URL(mediaUrl);
      const pathMatch = urlParts.pathname.match(/\/storage\/v1\/object\/sign\/(.+)$/);
      if (pathMatch) {
        filePath = pathMatch[1];
      }
    }
    
    if (filePath && filePath.startsWith('templates/')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      if (supabaseUrl) {
        const baseUrl = supabaseUrl.replace(/\/$/, '');
        // For localhost, we need to use the public endpoint or download and proxy
        if (isLocalhost) {
          // In local development, download the file and create a data URL or use a different approach
          // Since GreenAPI can't access localhost, we'll download the file and upload it via a proxy
          // For now, let's try using the storage public endpoint if available
          // If the bucket is private, we'll need to download and re-upload to a public service
          
          // For localhost, we need to make the file publicly accessible for GreenAPI
          // Since GreenAPI servers can't access localhost, we'll:
          // 1. Download the file using the signed URL (edge function can access localhost)
          // 2. Create a new signed URL with very long expiry that uses the public endpoint format
          //    This might work if Supabase local storage is accessible via public endpoint
          // 3. If that doesn't work, we'll need to use ngrok or a public file hosting service
          
          
          try {
            const supabaseAdmin = createSupabaseAdmin();
            const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
            
            // Create a new signed URL with very long expiry (1 year) using admin client
            // The signed URL should work from GreenAPI servers if they can resolve localhost
            // But since they can't, we need an alternative approach
            
            // Alternative: For local development, check if we're using ngrok or similar
            // If SUPABASE_URL contains a public domain (not localhost), use that
            const isPublicUrl = !supabaseUrl.includes('127.0.0.1') && !supabaseUrl.includes('localhost');
            
            if (isPublicUrl) {
              // If using ngrok or similar, the URL should work
              const { data: urlData, error: urlError } = await supabaseAdmin.storage
                .from('client-assets')
                .createSignedUrl(filePath, 31536000); // 1 year expiry
              
              if (!urlError && urlData?.signedUrl) {
                mediaUrl = urlData.signedUrl;
              }
          } else {
            // For true localhost, create a signed URL anyway
            // Note: GreenAPI servers cannot access localhost URLs directly
            // Solutions for local dev:
            // 1. Use ngrok to expose localhost: npx ngrok http 54321
            // 2. Make the storage bucket temporarily public for development
            // 3. Upload files to a public cloud storage service
            
            const { data: urlData, error: urlError } = await supabaseAdmin.storage
              .from('client-assets')
              .createSignedUrl(filePath, 31536000); // 1 year expiry
            
            if (!urlError && urlData?.signedUrl) {
              mediaUrl = urlData.signedUrl;

              // Continue - let GreenAPI try to access it. If ngrok is set up, it might work.
            } else {
              return errorResponse(
                `Failed to create signed URL for local file: ${urlError?.message || 'Unknown error'}`,
                400
              );
            }
          }
            
          } catch (fetchError: any) {
            return errorResponse(`Failed to process media file for local development: ${fetchError.message}`, 400);
          }
        } else {
          // For production (non-localhost), create a signed URL
          // Public URL format only works if bucket is public, which ours is not
          const supabaseAdmin = createSupabaseAdmin();
          const { data: urlData, error: urlError } = await supabaseAdmin.storage
            .from('client-assets')
            .createSignedUrl(filePath, 31536000); // 1 year expiry
          
          if (!urlError && urlData?.signedUrl) {
            mediaUrl = urlData.signedUrl;
          } else {
            // Cannot use public URL format - bucket is private and requires signed URLs
            return errorResponse(
              `Failed to create signed URL for media file: ${urlError?.message || 'Unknown error'}`,
              400
            );
          }
        }
      } else {
        return errorResponse('לא ניתן לשלוח מדיה עם קישור פרטי. SUPABASE_URL לא מוגדר.', 400);
      }
    } else {
      return errorResponse('לא ניתן לשלוח מדיה עם קישור פרטי. GreenAPI דורש קישור ציבורי או נתיב תבנית תקין.', 400);
    }
  } else if (isLocalhost && !mediaUrl.startsWith('data:')) {
    // If it's localhost but not a signed URL (shouldn't happen, but handle it)
    return errorResponse('לא ניתן לשלוח מדיה מפיתוח מקומי ללא קישור חתום. אנא העלה את הקובץ ל-Supabase Storage תחילה.', 400);
  }

  // Determine file extension
  let fileName = '';
  if (mediaType === 'image') {
    const match = mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    fileName = `image.${ext}`;
  } else if (mediaType === 'video') {
    const match = mediaUrl.match(/\.(mp4|3gpp|avi|mov)(\?|$)/i);
    const ext = match ? match[1].toLowerCase() : 'mp4';
    fileName = `video.${ext}`;
  } else if (mediaType === 'gif') {
    const match = mediaUrl.match(/\.(gif|mp4)(\?|$)/i);
    const ext = match ? match[1].toLowerCase() : 'gif';
    fileName = `animation.${ext}`;
  }

  // Use sendFileByUrl endpoint
  const url = `https://api.green-api.com/waInstance${idInstance}/sendFileByUrl/${apiTokenInstance}`;

  const requestBody: any = {
    chatId,
    urlFile: mediaUrl,
    fileName,
  };

  if (caption.trim()) {
    requestBody.caption = caption;
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
    return errorResponse(
      errorData.error || errorData.message || `HTTP error! status: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();
  
  // Validate response has idMessage
  if (!data.idMessage) {
    return errorResponse('Media failed to send: Response missing idMessage', 400);
  }
  
  return successResponse(data);
}

serve(async (req) => {

  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  try {
    // Get environment variables from server-side only (NO VITE_ prefix)
    // Priority 1: Try Supabase secrets (production) or env vars (local dev with --env-file)
    const idInstance = Deno.env.get('GREEN_API_ID_INSTANCE');
    const apiTokenInstance = Deno.env.get('GREEN_API_TOKEN_INSTANCE');
    
    // Priority 2: Try to get from database (for local development)
    // This allows local dev without needing to set Supabase secrets
    let configFromDb = null;
    if (!idInstance || !apiTokenInstance) {
      try {
        const supabaseAdmin = createSupabaseAdmin();
        const { data, error: dbError } = await supabaseAdmin
          .from('green_api_settings')
          .select('id_instance, api_token_instance')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (dbError) {
        } else if (data && data.id_instance && data.api_token_instance) {
          // Validate the credentials aren't placeholders
          if (data.id_instance !== 'your_instance_id' && data.api_token_instance !== 'your_token') {
            configFromDb = {
              idInstance: data.id_instance,
              apiTokenInstance: data.api_token_instance,
            };
          } else {
          }
        } else {
        }
      } catch (dbError: any) {
      }
    } else {
    }
    
    const finalIdInstance = idInstance || configFromDb?.idInstance;
    const finalApiTokenInstance = apiTokenInstance || configFromDb?.apiTokenInstance;

    // Debug: Log available env vars (without sensitive data)

    if (!finalIdInstance || !finalApiTokenInstance) {
      const missing = [];
      if (!finalIdInstance) missing.push('GREEN_API_ID_INSTANCE');
      if (!finalApiTokenInstance) missing.push('GREEN_API_TOKEN_INSTANCE');
      
      const errorMsg = `Green API configuration not found. Missing: ${missing.join(', ')}. ` +
        `For local development: Insert credentials into green_api_settings table OR run Edge Functions with --env-file .env.local. ` +
        `For production: Set as Supabase secrets: supabase secrets set ${missing.join('=xxx ')}`;
      return errorResponse(errorMsg, 500);
    }

    // Check for placeholder values
    if (finalIdInstance === 'your_instance_id' || finalApiTokenInstance === 'your_token') {
      const errorMsg = 'Green API credentials are still set to placeholder values. Please set actual credentials via Supabase secrets.';
      return errorResponse(errorMsg, 500);
    }

    // When verify_jwt = true, Supabase automatically verifies the JWT before the function runs
    // If we get here, the JWT is valid. We can get the user from the auth header.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse('Server configuration error: Missing Supabase URL or Anon Key', 500);
    }

    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    // Verify the requesting user is authenticated
    const supabaseClient = createSupabaseClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }


    // Parse request body
    let body: SendMessageRequest;
    try {
      body = await parseJsonBody<SendMessageRequest>(req);
    } catch (error: any) {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const { phoneNumber, message, buttons, footer, media } = body;

    if (!phoneNumber) {
      return errorResponse('phoneNumber is required', 400);
    }

    if (!message && !media) {
      return errorResponse('Either message or media is required', 400);
    }

    const chatId = getChatId(phoneNumber);

    // Handle media messages
    if (media?.url) {
      return await handleMediaMessage(finalIdInstance, finalApiTokenInstance, chatId, message || '', media);
    }

    // If buttons are provided, use SendButtons endpoint
    if (buttons && buttons.length > 0) {
      if (buttons.length > 3) {
        return errorResponse('Maximum 3 buttons allowed per message', 400);
      }

      // Validate button text length
      for (const button of buttons) {
        if (button.text.length > 25) {
          return errorResponse(`Button text "${button.text}" exceeds 25 character limit`, 400);
        }
      }

      const url = `https://api.green-api.com/waInstance${finalIdInstance}/SendButtons/${finalApiTokenInstance}`;

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
        return errorResponse(
          errorData.error || `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      
      // Validate response has idMessage
      if (!data.idMessage) {
        return errorResponse('Message failed to send: Response missing idMessage', 400);
      }
      
      return successResponse(data);
    } else {
      // Use standard sendMessage endpoint
      const url = `https://api.green-api.com/waInstance${finalIdInstance}/sendMessage/${finalApiTokenInstance}`;

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
        return errorResponse(
          errorData.error || `HTTP error! status: ${response.status}`,
          response.status
        );
      }

      const data = await response.json();
      
      // Validate response has idMessage
      if (!data.idMessage) {
        return errorResponse('Message failed to send: Response missing idMessage', 400);
      }
      
      return successResponse(data);
    }
  } catch (error: any) {
    return errorResponse(error?.message || 'Failed to send WhatsApp message', 500);
  }
});
