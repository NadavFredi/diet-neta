/**
 * Utility Functions
 * Shared utility functions for edge functions
 */

/**
 * Format phone number for WhatsApp (remove +, 0, spaces, hyphens, add country code)
 */
export function formatPhoneNumber(phoneNumber: string): string {
  let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1);
  }
  
  if (formatted.startsWith('0')) {
    formatted = '972' + formatted.substring(1);
  }
  
  if (!formatted.startsWith('972') && formatted.length === 9) {
    formatted = '972' + formatted;
  }
  
  return formatted;
}

/**
 * Get chat ID from phone number
 */
export function getChatId(phoneNumber: string): string {
  const formatted = formatPhoneNumber(phoneNumber);
  return `${formatted}@c.us`;
}

/**
 * Parse JSON request body with error handling
 */
export async function parseJsonBody<T = any>(req: Request): Promise<T> {
  try {
    const text = await req.text();
    return JSON.parse(text);
  } catch (error: any) {
    throw new Error(`Invalid JSON in request body: ${error.message}`);
  }
}

