import crypto from 'crypto';

// Characters without ambiguous letters/digits (avoiding 0/O, 1/I/L)
const KEY_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates a secure, readable 6-character alphanumeric access key
 * Example: 'K9X2B4'
 */
export function generateAccessKey(length = 6): string {
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += KEY_CHARSET[bytes[i] % KEY_CHARSET.length];
  }
  return result;
}

/**
 * Generates a unique QR identifier slug
 */
export function generateQRIdentifier(level: number): string {
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `QR-L${level}-${randomSuffix}`;
}
