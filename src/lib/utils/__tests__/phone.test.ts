import { describe, it, expect } from 'vitest';
import {
  isValidPhNumber,
  normalizeToLocal,
  normalizeToInternational,
  maskPhone,
  phoneSchema,
} from '../phone';

describe('isValidPhNumber', () => {
  describe('valid Philippine mobile numbers', () => {
    it('accepts 09XXXXXXXXX format', () => {
      expect(isValidPhNumber('09171234567')).toBe(true);
    });

    it('accepts +639XXXXXXXXX format', () => {
      expect(isValidPhNumber('+639171234567')).toBe(true);
    });

    it('accepts 639XXXXXXXXX format (no plus)', () => {
      expect(isValidPhNumber('639171234567')).toBe(true);
    });

    it('accepts 09xxxxxxxxx with different network prefix 091x', () => {
      expect(isValidPhNumber('09121234567')).toBe(true);
    });

    it('accepts 09xxxxxxxxx with network prefix 092x', () => {
      expect(isValidPhNumber('09281234567')).toBe(true);
    });

    it('accepts 09xxxxxxxxx with network prefix 099x', () => {
      expect(isValidPhNumber('09991234567')).toBe(true);
    });
  });

  describe('valid numbers with formatting characters', () => {
    it('accepts number with spaces: 0917 123 4567', () => {
      expect(isValidPhNumber('0917 123 4567')).toBe(true);
    });

    it('accepts number with dashes: 0917-123-4567', () => {
      expect(isValidPhNumber('0917-123-4567')).toBe(true);
    });

    it('accepts number with parentheses: (0917)1234567', () => {
      expect(isValidPhNumber('(0917)1234567')).toBe(true);
    });

    it('accepts +63 with spaces: +63 917 123 4567', () => {
      expect(isValidPhNumber('+63 917 123 4567')).toBe(true);
    });
  });

  describe('invalid numbers', () => {
    it('rejects number too short: 091712345 (9 digits after 0)', () => {
      expect(isValidPhNumber('091712345')).toBe(false);
    });

    it('rejects number too long: 091712345678 (12 digits after 0)', () => {
      expect(isValidPhNumber('091712345678')).toBe(false);
    });

    it('rejects Philippine landline: 028123456', () => {
      expect(isValidPhNumber('028123456')).toBe(false);
    });

    it('rejects non-PH international number: +1234567890', () => {
      expect(isValidPhNumber('+1234567890')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidPhNumber('')).toBe(false);
    });

    it('rejects letters mixed in', () => {
      expect(isValidPhNumber('0917ABCDEFG')).toBe(false);
    });

    it('rejects numbers not starting with 9 after prefix: 08171234567', () => {
      expect(isValidPhNumber('08171234567')).toBe(false);
    });

    it('rejects US format: +12125551234', () => {
      expect(isValidPhNumber('+12125551234')).toBe(false);
    });

    it('rejects all zeros', () => {
      expect(isValidPhNumber('00000000000')).toBe(false);
    });
  });
});

describe('normalizeToLocal', () => {
  it('converts +63 prefix to 09 prefix', () => {
    expect(normalizeToLocal('+639171234567')).toBe('09171234567');
  });

  it('converts 63 prefix (no plus) to 09 prefix', () => {
    expect(normalizeToLocal('639171234567')).toBe('09171234567');
  });

  it('keeps 09 prefix unchanged', () => {
    expect(normalizeToLocal('09171234567')).toBe('09171234567');
  });

  it('strips spaces before normalizing: +63 917 123 4567', () => {
    expect(normalizeToLocal('+63 917 123 4567')).toBe('09171234567');
  });

  it('strips dashes before normalizing: 0917-123-4567', () => {
    expect(normalizeToLocal('0917-123-4567')).toBe('09171234567');
  });

  it('throws for unrecognised format', () => {
    expect(() => normalizeToLocal('+1234567890')).toThrow('Cannot normalize PH number');
  });
});

describe('normalizeToInternational', () => {
  it('converts 09 prefix to +63 prefix', () => {
    expect(normalizeToInternational('09171234567')).toBe('+639171234567');
  });

  it('converts 63 prefix (no plus) to +63 prefix', () => {
    expect(normalizeToInternational('639171234567')).toBe('+639171234567');
  });

  it('keeps +63 prefix unchanged', () => {
    expect(normalizeToInternational('+639171234567')).toBe('+639171234567');
  });

  it('strips spaces before normalizing: 0917 123 4567', () => {
    expect(normalizeToInternational('0917 123 4567')).toBe('+639171234567');
  });

  it('strips dashes before normalizing: 0917-123-4567', () => {
    expect(normalizeToInternational('0917-123-4567')).toBe('+639171234567');
  });

  it('throws for unrecognised format', () => {
    expect(() => normalizeToInternational('+1234567890')).toThrow('Cannot normalize PH number');
  });
});

describe('maskPhone', () => {
  it('masks 09171234567 to 09xx-xxx-4567', () => {
    expect(maskPhone('09171234567')).toBe('09xx-xxx-4567');
  });

  it('masks +639171234567 to 09xx-xxx-4567 (strips non-digits, uses last 4)', () => {
    expect(maskPhone('+639171234567')).toBe('09xx-xxx-4567');
  });

  it('uses last 4 digits for 639171234567', () => {
    expect(maskPhone('639171234567')).toBe('09xx-xxx-4567');
  });

  it('always returns 09xx-xxx-NNNN format', () => {
    const result = maskPhone('09991234567');
    expect(result).toMatch(/^09xx-xxx-\d{4}$/);
  });

  it('correctly shows last 4 digits', () => {
    expect(maskPhone('09179998888')).toBe('09xx-xxx-8888');
  });
});

describe('phoneSchema (Zod)', () => {
  it('passes for valid 09XXXXXXXXX', () => {
    const result = phoneSchema.safeParse('09171234567');
    expect(result.success).toBe(true);
  });

  it('passes for valid +639XXXXXXXXX', () => {
    const result = phoneSchema.safeParse('+639171234567');
    expect(result.success).toBe(true);
  });

  it('fails for invalid number and returns message', () => {
    const result = phoneSchema.safeParse('12345');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Philippine mobile number');
    }
  });

  it('fails for empty string', () => {
    const result = phoneSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});
