import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Hash password with bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare plain text password with hashed password
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * General AES-256-CBC encryption helper
 */
export const encryptAES = (text: string, keyString: string): string => {
  const iv = crypto.randomBytes(16);
  // Hash the key string to guarantee it is exactly 32 bytes (256 bits)
  const key = crypto.createHash('sha256').update(keyString).digest();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * General AES-256-CBC decryption helper
 */
export const decryptAES = (cipherText: string, keyString: string): string => {
  const parts = cipherText.split(':');
  if (parts.length !== 2) throw new Error('Invalid cipher text format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = crypto.createHash('sha256').update(keyString).digest();
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Decode base32 encoding to hex string
 */
const base32tohex = (base32: string): string => {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let hex = '';

  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substring(i, i + 4);
    hex = hex + parseInt(chunk, 2).toString(16);
  }
  return hex;
};

/**
 * Verify Google Authenticator compatible TOTP token against a base32 secret
 */
export const verifyTOTP = (token: string, secret: string, windowSteps: number = 1): boolean => {
  try {
    const hexSecret = base32tohex(secret);
    const key = Buffer.from(hexSecret, 'hex');
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const timeStep = 30; // 30-second time steps

    // Verify code within dynamic steps tolerance window
    for (let i = -windowSteps; i <= windowSteps; i++) {
      const time = Math.floor(epoch / timeStep) + i;
      
      // Convert integer time step to 8-byte big-endian buffer
      const buffer = Buffer.alloc(8);
      let temp = time;
      for (let j = 7; j >= 0; j--) {
        buffer[j] = temp & 0xff;
        temp = temp >> 8;
      }

      // Calculate HMAC-SHA1 signature
      const hmac = crypto.createHmac('sha1', key);
      hmac.update(buffer);
      const hmacResult = hmac.digest();

      // Dynamic Truncation
      const offset = hmacResult[hmacResult.length - 1] & 0xf;
      const code =
        ((hmacResult[offset] & 0x7f) << 24) |
        ((hmacResult[offset + 1] & 0xff) << 16) |
        ((hmacResult[offset + 2] & 0xff) << 8) |
        (hmacResult[offset + 3] & 0xff);

      const otp = (code % 1000000).toString().padStart(6, '0');
      if (otp === token) {
        return true;
      }
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Generate a random base32 formatted TOTP secret key
 */
export const generateTOTPSecret = (): string => {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(10);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += base32chars[bytes[i] % 32];
  }
  return secret;
};

export default { hashPassword, comparePassword, encryptAES, decryptAES, verifyTOTP, generateTOTPSecret };
