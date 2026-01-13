/**
 * Green API Service
 * 
 * ⚠️ DEPRECATED: This service is kept for backward compatibility only.
 * 
 * All API calls now go through greenApiServiceEdge.ts which calls Edge Functions.
 * This keeps API keys secure on the server side - NO keys are ever exposed to frontend.
 */
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
 * Send WhatsApp message via Edge Function
 * ⚠️ SECURITY: Never accesses API keys - all calls go through Edge Functions
 */
export const sendWhatsAppMessage = async (
  params: SendMessageParams
): Promise<GreenApiResponse> => {
  // Always use Edge Function - never access API keys from frontend
  // This keeps keys secure in both development and production
  const { sendWhatsAppMessage: sendViaEdgeFunction } = await import('./greenApiServiceEdge');
  return sendViaEdgeFunction(params);
};

/**
 * Clean HTML tags and format text for WhatsApp
 * Re-exported from Edge service for backward compatibility
 */
export { cleanWhatsAppMessage, replacePlaceholders } from './greenApiServiceEdge';

/**
 * Format phone number for Green API
 * @deprecated Use formatPhoneNumberForGreenAPI from phone-input component
 */
export const formatPhoneNumber = (phone: string): string => {
  return formatPhoneNumberForGreenAPI(phone);
};

/**
 * Clear the credentials cache
 * @deprecated No longer used - credentials are in Edge Functions
 */
export const clearGreenApiConfigCache = (): void => {
  // No-op - credentials are now in Edge Functions
};

/**
 * Get Green API configuration
 * @deprecated This function should not be used - all API calls go through Edge Functions
 */
export const getGreenApiConfig = async (): Promise<GreenApiConfig | null> => {
  console.warn('[GreenAPI] getGreenApiConfig is deprecated. All API calls should go through Edge Functions.');
  return null;
};
