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

/**
 * Strip HTML tags and format message for WhatsApp
 * Converts HTML to clean, readable text with proper line breaks
 */
export function stripHtmlForWhatsApp(html: string): string {
  if (!html) return '';
  
  let text = html;
  
  // Replace <p> tags with double newlines (paragraph breaks)
  text = text.replace(/<p[^>]*>/gi, '\n\n');
  text = text.replace(/<\/p>/gi, '');
  
  // Replace <br> and <br/> tags with single newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Replace other block-level elements with newlines
  text = text.replace(/<\/?(div|h[1-6]|li|ul|ol|blockquote)[^>]*>/gi, '\n');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Clean up whitespace: remove multiple spaces, normalize newlines
  text = text.replace(/[ \t]+/g, ' '); // Multiple spaces to single space
  text = text.replace(/\n{3,}/g, '\n\n'); // More than 2 newlines to 2 newlines
  text = text.replace(/[ \t]*\n[ \t]*/g, '\n'); // Remove spaces around newlines
  
  // Trim each line and remove empty lines at start/end
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  text = lines.join('\n');
  
  // Final trim
  return text.trim();
}

