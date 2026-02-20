import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// A valid 32-byte key expressed as 64 hex characters
const TEST_KEY = 'a'.repeat(64);

describe('encryption utilities', () => {
  let encryptPhone: (phone: string) => string;
  let decryptPhone: (encrypted: string) => string;

  beforeEach(async () => {
    // Set the env var before each test to ensure getKey() picks it up.
    // We also bust the module cache so the module re-reads the env var
    // if it cached it at import time.
    process.env.PHONE_ENCRYPTION_KEY = TEST_KEY;
    // Dynamic import so each test suite can control environment
    const mod = await import('../encryption');
    encryptPhone = mod.encryptPhone;
    decryptPhone = mod.decryptPhone;
  });

  afterEach(() => {
    delete process.env.PHONE_ENCRYPTION_KEY;
  });

  describe('encryptPhone', () => {
    it('returns a string in iv:authTag:ciphertext hex format (three colon-separated parts)', () => {
      const result = encryptPhone('09171234567');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
    });

    it('all three parts are non-empty hex strings', () => {
      const result = encryptPhone('09171234567');
      const [iv, authTag, ciphertext] = result.split(':');
      // Hex strings contain only 0-9 a-f characters
      expect(iv).toMatch(/^[0-9a-f]+$/);
      expect(authTag).toMatch(/^[0-9a-f]+$/);
      expect(ciphertext).toMatch(/^[0-9a-f]+$/);
    });

    it('IV is 32 hex characters (16 bytes)', () => {
      const result = encryptPhone('09171234567');
      const [iv] = result.split(':');
      expect(iv).toHaveLength(32);
    });

    it('auth tag is 32 hex characters (16 bytes for GCM)', () => {
      const result = encryptPhone('09171234567');
      const [, authTag] = result.split(':');
      expect(authTag).toHaveLength(32);
    });

    it('produces different ciphertexts for the same input (random IV)', () => {
      const result1 = encryptPhone('09171234567');
      const result2 = encryptPhone('09171234567');
      // Due to random IV, the full outputs should differ
      expect(result1).not.toBe(result2);
    });

    it('different IVs per encryption call', () => {
      const [iv1] = encryptPhone('09171234567').split(':');
      const [iv2] = encryptPhone('09171234567').split(':');
      expect(iv1).not.toBe(iv2);
    });
  });

  describe('decryptPhone', () => {
    it('round-trip: encrypt then decrypt returns original phone number', () => {
      const original = '09171234567';
      const encrypted = encryptPhone(original);
      expect(decryptPhone(encrypted)).toBe(original);
    });

    it('round-trip works for +639 format', () => {
      const original = '+639171234567';
      const encrypted = encryptPhone(original);
      expect(decryptPhone(encrypted)).toBe(original);
    });

    it('round-trip works for 639 format', () => {
      const original = '639171234567';
      const encrypted = encryptPhone(original);
      expect(decryptPhone(encrypted)).toBe(original);
    });

    it('multiple independent encryptions all decrypt correctly', () => {
      const phones = ['09171234567', '09281234567', '09991234567'];
      for (const phone of phones) {
        expect(decryptPhone(encryptPhone(phone))).toBe(phone);
      }
    });
  });

  describe('error handling', () => {
    it('throws when PHONE_ENCRYPTION_KEY is missing', async () => {
      delete process.env.PHONE_ENCRYPTION_KEY;
      // Re-import to get a fresh module reference
      const mod = await import('../encryption');
      expect(() => mod.encryptPhone('09171234567')).toThrow('PHONE_ENCRYPTION_KEY not configured');
    });

    it('throws when decrypting with missing PHONE_ENCRYPTION_KEY', async () => {
      // First encrypt with key present
      process.env.PHONE_ENCRYPTION_KEY = TEST_KEY;
      const encrypted = encryptPhone('09171234567');
      // Then remove key
      delete process.env.PHONE_ENCRYPTION_KEY;
      const mod = await import('../encryption');
      expect(() => mod.decryptPhone(encrypted)).toThrow('PHONE_ENCRYPTION_KEY not configured');
    });
  });
});
