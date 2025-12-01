/**
 * Generate a unique voucher code starting with "BF" and all uppercase
 * Format: BF + 4 random alphanumeric characters (total 6 characters)
 * 
 * Probability of collision:
 * - Total possible codes: 36^4 = 1,679,616
 * - With 100 vouchers: ~0.003% chance of collision
 * - With 1,000 vouchers: ~0.3% chance of collision
 * - With 10,000 vouchers: ~30% chance of collision
 * 
 * This function generates a code but does NOT check for uniqueness.
 * Use generateUniqueVoucherCode() for automatic duplicate checking.
 */
export function generateVoucherCode(): string {
  const prefix = 'BF';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomPart = '';
  
  // Generate exactly 4 characters after "BF" to make total 6 characters
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${prefix}${randomPart}`;
}

/**
 * Generate a unique voucher code with automatic duplicate checking
 * Retries up to maxAttempts times if a duplicate is found
 */
export async function generateUniqueVoucherCode(
  checkExists: (code: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const code = generateVoucherCode();
    const exists = await checkExists(code);
    
    if (!exists) {
      return code;
    }
    
    attempts++;
    console.warn(`Voucher code ${code} already exists, generating new one... (attempt ${attempts}/${maxAttempts})`);
  }
  
  // If we've exhausted all attempts, throw an error
  throw new Error(`Failed to generate unique voucher code after ${maxAttempts} attempts. Please try again.`);
}

/**
 * Validate voucher code format (must be exactly 6 characters, start with BF and be uppercase)
 */
export function isValidVoucherCode(code: string): boolean {
  const upperCode = code.toUpperCase();
  return /^BF[A-Z0-9]{4}$/.test(upperCode) && upperCode.length === 6;
}

