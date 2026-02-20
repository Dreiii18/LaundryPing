import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.PHONE_ENCRYPTION_KEY;
  if (!key) throw new Error('PHONE_ENCRYPTION_KEY not configured');
  return Buffer.from(key, 'hex');
}

export function encryptPhone(phone: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(phone, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptPhone(encrypted: string): string {
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
