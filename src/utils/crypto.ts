/**
 * Cryptographic Utilities
 * 
 * Secure token generation and hashing for invitations
 * Following OWASP best practices
 */

/**
 * Generate a cryptographically secure random token
 * Uses Web Crypto API for secure random generation
 */
export async function generateSecureToken(length: number = 32): Promise<string> {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random salt for token hashing
 */
export async function generateSalt(): Promise<string> {
  return generateSecureToken(16);
}

/**
 * Hash a token with salt using SHA-256
 * In production, consider using bcrypt or argon2 for better security
 */
export async function hashToken(token: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a token against a stored hash
 */
export async function verifyToken(
  token: string,
  storedHash: string,
  salt: string
): Promise<boolean> {
  const computedHash = await hashToken(token, salt);
  return computedHash === storedHash;
}
