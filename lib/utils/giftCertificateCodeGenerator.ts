/**
 * Generate a unique gift certificate code (uppercase alphanumeric)
 * Format: GC + 4 random alphanumeric characters (total 6 characters)
 * 
 * Probability of collision:
 * - Total possible codes: 36^4 = 1,679,616
 * - With 100 certificates: ~0.003% chance of collision
 * - With 1,000 certificates: ~0.3% chance of collision
 * - With 10,000 certificates: ~30% chance of collision
 * 
 * This function generates a code but does NOT check for uniqueness.
 * Use generateUniqueGiftCertificateCode() for automatic duplicate checking.
 */
export function generateGiftCertificateCode(): string {
  const prefix = 'GC';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  
  // Generate exactly 4 characters after "GC" to make total 6 characters
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${prefix}${randomPart}`;
}

/**
 * Generate a unique gift certificate code with automatic duplicate checking
 * Retries up to maxAttempts times if a duplicate is found
 */
export async function generateUniqueGiftCertificateCode(
  checkExists: (code: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const code = generateGiftCertificateCode();
    const exists = await checkExists(code);
    
    if (!exists) {
      return code;
    }
    
    attempts++;
    console.warn(`Gift certificate code ${code} already exists, generating new one... (attempt ${attempts}/${maxAttempts})`);
  }
  
  // If we've exhausted all attempts, throw an error
  throw new Error(`Failed to generate unique gift certificate code after ${maxAttempts} attempts. Please try again.`);
}

/**
 * Validate gift certificate code format (must start with GC and be uppercase alphanumeric)
 */
export function isValidGiftCertificateCode(code: string): boolean {
  const upperCode = code.toUpperCase();
  return /^GC[A-Z0-9]{4}$/.test(upperCode) && upperCode.length === 6;
}

