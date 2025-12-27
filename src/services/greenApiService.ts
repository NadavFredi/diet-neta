/**
 * Green API Service
 * 
 * Service for sending WhatsApp messages via Green API
 * Uses environment variables for configuration
 */

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
 * Send WhatsApp message via Green API
 * Supports both plain text messages and interactive button messages
 */
export const sendWhatsAppMessage = async (
  params: SendMessageParams
): Promise<GreenApiResponse> => {
  try {
    const config = getGreenApiConfig();
    
    if (!config) {
      return {
        success: false,
        error: 'Green API configuration not found. Please check environment variables.',
      };
    }

    const formattedPhone = formatPhoneNumber(params.phoneNumber);
    const chatId = `${formattedPhone}@c.us`;

    // If buttons are provided, use SendButtons endpoint
    if (params.buttons && params.buttons.length > 0) {
      // Validate button count (max 3)
      if (params.buttons.length > 3) {
        return {
          success: false,
          error: 'Maximum 3 buttons allowed per message',
        };
      }

      // Validate button text length (max 25 characters per Green API)
      for (const button of params.buttons) {
        if (button.text.length > 25) {
          return {
            success: false,
            error: `Button text "${button.text}" exceeds 25 character limit`,
          };
        }
      }

      // Use SendButtons endpoint
      const url = `https://api.green-api.com/waInstance${config.idInstance}/SendButtons/${config.apiTokenInstance}`;

      const requestBody: any = {
        chatId,
        message: params.message,
        buttons: params.buttons.map((btn, index) => ({
          buttonId: String(index + 1), // Green API expects buttonId as string "1", "2", "3"
          buttonText: btn.text,
        })),
      };

      // Add footer if provided
      if (params.footer) {
        requestBody.footer = params.footer;
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
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
      };
    } else {
      // Use standard sendMessage endpoint for plain text
      const url = `https://api.green-api.com/waInstance${config.idInstance}/sendMessage/${config.apiTokenInstance}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message: params.message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data,
      };
    }
  } catch (error: any) {
    console.error('[GreenAPI] Error sending message:', error);
    return {
      success: false,
      error: error?.message || 'Failed to send WhatsApp message',
    };
  }
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


