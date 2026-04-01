import { describe, it, expect, afterAll } from 'vitest';
import { buildLaundryDoneMessage, buildQueueNotificationMessage, getMessageSegmentCount } from '../templates';

describe('buildLaundryDoneMessage', () => {
  const originalRandom = Math.random;

  afterAll(() => {
    Math.random = originalRandom;
  });

  describe('rotates through 5 templates', () => {
    it('template 1: "Tapos na po ... Salamat sa pagtitiwala!"', () => {
      Math.random = () => 0;
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toBe(
        'Tapos na po ang labada mo sa SpinClean. Ready na po for pickup. Salamat sa pagtitiwala!'
      );
    });

    it('template 2: "Ready na po ... Maraming salamat!"', () => {
      Math.random = () => 0.2;
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toBe(
        'Ready na po ang labada mo sa SpinClean. Maaari na po itong i-pickup. Maraming salamat!'
      );
    });

    it('template 3: "Hi! Tapos na po ... Salamat!"', () => {
      Math.random = () => 0.4;
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toBe(
        'Hi! Tapos na po ang labada mo sa SpinClean. Pwede na po itong i-pickup. Salamat!'
      );
    });

    it('template 4: "Magandang balita! ... Salamat!"', () => {
      Math.random = () => 0.6;
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toBe(
        'Magandang balita! Ready na po ang labada mo sa SpinClean. Paki-pickup na po kapag available. Salamat!'
      );
    });

    it('template 5: "Update mula sa ... Maraming salamat!"', () => {
      Math.random = () => 0.8;
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toBe(
        'Update mula sa SpinClean: Tapos na po ang labada mo at ready na for pickup. Maraming salamat!'
      );
    });
  });

  describe('shop name handling', () => {
    it('includes the shop name in the message', () => {
      Math.random = () => 0;
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('SpinClean');
    });

    it('uses a shop name exactly 25 chars without truncation', () => {
      Math.random = () => 0;
      const shopName = 'A'.repeat(25);
      const msg = buildLaundryDoneMessage(shopName);
      expect(msg).toContain(shopName);
      expect(msg).not.toContain('...');
    });

    it('truncates a 26-character name to 22 + "..."', () => {
      Math.random = () => 0;
      const shopName = 'A'.repeat(26);
      const msg = buildLaundryDoneMessage(shopName);
      const truncated = 'A'.repeat(22) + '...';
      expect(msg).toContain(truncated);
    });

    it('does not include the full un-truncated name in the message', () => {
      Math.random = () => 0;
      const shopName = 'VeryLongLaundromatNameThatExceedsLimit';
      const msg = buildLaundryDoneMessage(shopName);
      expect(msg).not.toContain(shopName);
    });

    it('uses "..." ellipsis for truncation', () => {
      Math.random = () => 0;
      const shopName = 'B'.repeat(30);
      const msg = buildLaundryDoneMessage(shopName);
      expect(msg).toContain('...');
    });
  });

  describe('message structure', () => {
    it('all templates fit in a single 160-char SMS segment with a 25-char name', () => {
      const shopName = 'A'.repeat(25);
      for (let i = 0; i < 5; i++) {
        Math.random = () => i / 5;
        const msg = buildLaundryDoneMessage(shopName);
        expect(msg.length).toBeLessThanOrEqual(160);
        expect(getMessageSegmentCount(msg)).toBe(1);
      }
    });

    it('produces a single-line message (no newlines)', () => {
      Math.random = () => 0;
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).not.toContain('\n');
    });
  });

  describe('customer name (no tags)', () => {
    it('does not append any tag to the message', () => {
      Math.random = () => 0;
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).not.toContain('Tag');
    });

    it('appends customer name when provided and fits in 160 chars', () => {
      Math.random = () => 0;
      const msg = buildLaundryDoneMessage('SpinClean', 'Juan');
      expect(msg).toContain(' - Juan');
      expect(msg).not.toContain('Tag');
      expect(msg.length).toBeLessThanOrEqual(160);
    });

    it('drops customer name if it would exceed 160 chars', () => {
      Math.random = () => 0;
      const shopName = 'A'.repeat(25);
      const longName = 'B'.repeat(60);
      const msg = buildLaundryDoneMessage(shopName, longName);
      expect(msg).not.toContain(longName);
      expect(msg.length).toBeLessThanOrEqual(160);
    });

    it('does not append anything when customerName is null', () => {
      Math.random = () => 0;
      const msg = buildLaundryDoneMessage('SpinClean', null);
      expect(msg).toBe(
        'Tapos na po ang labada mo sa SpinClean. Ready na po for pickup. Salamat sa pagtitiwala!'
      );
    });

    it('all templates fit in 1 segment with short customer name', () => {
      const shopName = 'A'.repeat(25);
      for (let i = 0; i < 5; i++) {
        Math.random = () => i / 5;
        const msg = buildLaundryDoneMessage(shopName, 'Juan');
        expect(msg.length).toBeLessThanOrEqual(160);
        expect(getMessageSegmentCount(msg)).toBe(1);
      }
    });
  });
});

describe('buildQueueNotificationMessage', () => {
  const originalRandom = Math.random;

  afterAll(() => {
    Math.random = originalRandom;
  });

  it('rotates through 3 templates', () => {
    const templates = new Set<string>();
    for (let i = 0; i < 3; i++) {
      Math.random = () => i / 3;
      templates.add(buildQueueNotificationMessage('SpinClean'));
    }
    expect(templates.size).toBe(3);
  });

  it('includes the shop name', () => {
    Math.random = () => 0;
    const msg = buildQueueNotificationMessage('SpinClean');
    expect(msg).toContain('SpinClean');
  });

  it('truncates shop names longer than 25 chars', () => {
    Math.random = () => 0;
    const shopName = 'A'.repeat(26);
    const msg = buildQueueNotificationMessage(shopName);
    expect(msg).toContain('A'.repeat(22) + '...');
    expect(msg).not.toContain(shopName);
  });

  it('appends customer name when it fits in 160 chars', () => {
    Math.random = () => 0;
    const msg = buildQueueNotificationMessage('SpinClean', 'Juan');
    expect(msg).toContain(' - Juan');
    expect(msg.length).toBeLessThanOrEqual(160);
  });

  it('drops customer name if it would exceed 160 chars', () => {
    Math.random = () => 0;
    const longName = 'B'.repeat(80);
    const msg = buildQueueNotificationMessage('A'.repeat(25), longName);
    expect(msg).not.toContain(longName);
    expect(msg.length).toBeLessThanOrEqual(160);
  });

  it('all templates fit in 1 SMS segment with 25-char name', () => {
    const shopName = 'A'.repeat(25);
    for (let i = 0; i < 3; i++) {
      Math.random = () => i / 3;
      const msg = buildQueueNotificationMessage(shopName);
      expect(msg.length).toBeLessThanOrEqual(160);
      expect(getMessageSegmentCount(msg)).toBe(1);
    }
  });

  it('all templates fit in 1 segment with short customer name', () => {
    const shopName = 'A'.repeat(25);
    for (let i = 0; i < 3; i++) {
      Math.random = () => i / 3;
      const msg = buildQueueNotificationMessage(shopName, 'Juan');
      expect(msg.length).toBeLessThanOrEqual(160);
      expect(getMessageSegmentCount(msg)).toBe(1);
    }
  });
});

describe('getMessageSegmentCount', () => {
  describe('GSM-7 messages', () => {
    it('returns 1 for an empty string', () => {
      expect(getMessageSegmentCount('')).toBe(1);
    });

    it('returns 1 for a message of exactly 160 GSM-7 characters', () => {
      const msg = 'A'.repeat(160);
      expect(getMessageSegmentCount(msg)).toBe(1);
    });

    it('returns 1 for a message shorter than 160 GSM-7 characters', () => {
      const msg = 'Hello World!';
      expect(getMessageSegmentCount(msg)).toBe(1);
    });

    it('returns 2 for a message of 161 GSM-7 characters (multipart, 153/segment)', () => {
      const msg = 'A'.repeat(161);
      expect(getMessageSegmentCount(msg)).toBe(2);
    });

    it('returns 2 for a message of 306 GSM-7 characters (2 x 153)', () => {
      const msg = 'A'.repeat(306);
      expect(getMessageSegmentCount(msg)).toBe(2);
    });

    it('returns 3 for a message of 307 GSM-7 characters (3rd segment starts)', () => {
      const msg = 'A'.repeat(307);
      expect(getMessageSegmentCount(msg)).toBe(3);
    });

    it('all templates fit in 1 segment with a short name', () => {
      const originalRandom = Math.random;
      for (let i = 0; i < 5; i++) {
        Math.random = () => i / 5;
        const msg = buildLaundryDoneMessage('SpinClean');
        expect(getMessageSegmentCount(msg)).toBe(1);
      }
      Math.random = originalRandom;
    });
  });

  describe('UCS-2 (unicode) messages', () => {
    it('returns 1 for a unicode message of exactly 70 characters', () => {
      const unicodeChar = '\u3053';
      const msg = unicodeChar.repeat(70);
      expect(getMessageSegmentCount(msg)).toBe(1);
    });

    it('returns 2 for a unicode message of 71 characters (multipart, 67/segment)', () => {
      const unicodeChar = '\u3053';
      const msg = unicodeChar.repeat(71);
      expect(getMessageSegmentCount(msg)).toBe(2);
    });

    it('returns 2 for a unicode message of 134 characters (2 x 67)', () => {
      const unicodeChar = '\u3053';
      const msg = unicodeChar.repeat(134);
      expect(getMessageSegmentCount(msg)).toBe(2);
    });

    it('returns 3 for a unicode message of 135 characters (3rd segment starts)', () => {
      const unicodeChar = '\u3053';
      const msg = unicodeChar.repeat(135);
      expect(getMessageSegmentCount(msg)).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('GSM-7 numbers and basic punctuation are counted as GSM-7', () => {
      const msg = '0917 123 4567 - Your laundry is ready!';
      expect(getMessageSegmentCount(msg)).toBe(1);
    });

    it('message with only newlines counts as GSM-7', () => {
      const msg = '\n'.repeat(50);
      expect(getMessageSegmentCount(msg)).toBe(1);
    });
  });
});
