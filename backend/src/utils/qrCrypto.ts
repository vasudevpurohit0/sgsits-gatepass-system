import crypto from 'crypto';
import { env } from '../config/env';

export interface QRPayload {
  passId: string;
  passNumber: string;
  validTo: string;
}

/**
 * Encrypt and sign QR payload (AES-256-CBC + HMAC-SHA256)
 */
export const encryptQRToken = (payload: QRPayload): string => {
  const text = JSON.stringify(payload);
  const iv = crypto.randomBytes(16);
  
  // Hash the config key to guarantee exactly 32 bytes for AES-256-CBC
  const aesKey = crypto.createHash('sha256').update(env.QR_AES_KEY).digest();
  
  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  let cipherText = cipher.update(text, 'utf8', 'hex');
  cipherText += cipher.final('hex');

  // Compute HMAC signature on IV + Cipher text to prevent tampering
  const hmacKey = env.QR_HMAC_KEY;
  const hmacInput = `${iv.toString('hex')}:${cipherText}`;
  const hmacSignature = crypto
    .createHmac('sha256', hmacKey)
    .update(hmacInput)
    .digest('hex');

  // Output format: iv:cipherText:hmac
  return `${iv.toString('hex')}:${cipherText}:${hmacSignature}`;
};

/**
 * Decrypt and verify QR token signature, checking authenticity
 */
export const decryptAndVerifyQRToken = (token: string): QRPayload => {
  const parts = token.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed QR code token structure');
  }

  const ivHex = parts[0];
  const cipherText = parts[1];
  const receivedHmac = parts[2];

  // 1. Verify HMAC Signature
  const hmacKey = env.QR_HMAC_KEY;
  const hmacInput = `${ivHex}:${cipherText}`;
  const calculatedHmac = crypto
    .createHmac('sha256', hmacKey)
    .update(hmacInput)
    .digest('hex');

  const signatureMatches = crypto.timingSafeEqual(
    Buffer.from(receivedHmac, 'hex'),
    Buffer.from(calculatedHmac, 'hex')
  );

  if (!signatureMatches) {
    throw new Error('QR signature mismatch - security integrity breach');
  }

  // 2. Decrypt Cipher Text
  const iv = Buffer.from(ivHex, 'hex');
  const aesKey = crypto.createHash('sha256').update(env.QR_AES_KEY).digest();
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  let decryptedText = decipher.update(cipherText, 'hex', 'utf8');
  decryptedText += decipher.final('utf8');

  return JSON.parse(decryptedText) as QRPayload;
};

export default { encryptQRToken, decryptAndVerifyQRToken };
