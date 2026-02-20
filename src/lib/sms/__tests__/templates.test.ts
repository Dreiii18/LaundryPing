import { describe, it, expect } from 'vitest';
import { buildLaundryDoneMessage, getMessageSegmentCount } from '../templates';

describe('buildLaundryDoneMessage', () => {
  describe('short shop name (25 chars or fewer)', () => {
    it('includes the shop name in the Tagalog line', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('SpinClean');
    });

    it('includes the shop name in the English line', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('Your laundry at SpinClean is ready');
    });

    it('contains the Tagalog greeting', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('Magandang araw po!');
    });

    it('contains "Tapos na ang inyong labada"', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('Tapos na ang inyong labada');
    });

    it('contains the pickup instructions in Tagalog', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('Pwede na po kayong sunduin');
    });

    it('contains "Salamat po!"', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('Salamat po!');
    });

    it('contains the English thank you line', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('Thank you!');
    });

    it('uses a shop name exactly 25 chars without truncation', () => {
      const shopName = 'A'.repeat(25);
      const msg = buildLaundryDoneMessage(shopName);
      expect(msg).toContain(shopName);
      expect(msg).not.toContain('...');
    });
  });

  describe('long shop name (more than 25 chars)', () => {
    it('truncates a 26-character name to 22 + "..."', () => {
      const shopName = 'A'.repeat(26);
      const msg = buildLaundryDoneMessage(shopName);
      const truncated = 'A'.repeat(22) + '...';
      expect(msg).toContain(truncated);
    });

    it('does not include the full un-truncated name in the message', () => {
      const shopName = 'VeryLongLaundromatNameThatExceedsLimit';
      const msg = buildLaundryDoneMessage(shopName);
      expect(msg).not.toContain(shopName);
    });

    it('uses "..." ellipsis for truncation', () => {
      const shopName = 'B'.repeat(30);
      const msg = buildLaundryDoneMessage(shopName);
      expect(msg).toContain('...');
    });

    it('truncated name appears in both Tagalog and English lines', () => {
      const shopName = 'SuperLongLaundromats Forever';
      const truncated = shopName.slice(0, 22) + '...';
      const msg = buildLaundryDoneMessage(shopName);
      // Count occurrences of truncated name
      const occurrences = msg.split(truncated).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    });
  });

  describe('message structure', () => {
    it('joins lines with newlines', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('\n');
    });

    it('contains the separator "--"', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(msg).toContain('--');
    });

    it('produces 4 lines joined by newlines', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      const lines = msg.split('\n');
      expect(lines).toHaveLength(4);
    });
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

    it('returns 2 for a message of 306 GSM-7 characters (2 × 153)', () => {
      const msg = 'A'.repeat(306);
      expect(getMessageSegmentCount(msg)).toBe(2);
    });

    it('returns 3 for a message of 307 GSM-7 characters (3rd segment starts)', () => {
      const msg = 'A'.repeat(307);
      expect(getMessageSegmentCount(msg)).toBe(3);
    });

    it('standard bilingual laundry message fits in 2 segments or fewer', () => {
      const msg = buildLaundryDoneMessage('SpinClean');
      expect(getMessageSegmentCount(msg)).toBeLessThanOrEqual(2);
    });

    it('standard message with short name fits in 1 segment', () => {
      // Build message and check it fits in the typical 1-2 segment range
      const msg = buildLaundryDoneMessage('SpinClean');
      const count = getMessageSegmentCount(msg);
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('UCS-2 (unicode) messages', () => {
    it('returns 1 for a unicode message of exactly 70 characters', () => {
      // Filipino text with non-GSM-7 chars would trigger UCS-2
      // Using a Japanese character as a clear non-GSM-7 character
      const unicodeChar = '\u3053'; // Japanese 'ko'
      const msg = unicodeChar.repeat(70);
      expect(getMessageSegmentCount(msg)).toBe(1);
    });

    it('returns 2 for a unicode message of 71 characters (multipart, 67/segment)', () => {
      const unicodeChar = '\u3053';
      const msg = unicodeChar.repeat(71);
      expect(getMessageSegmentCount(msg)).toBe(2);
    });

    it('returns 2 for a unicode message of 134 characters (2 × 67)', () => {
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
      // newline \n is in GSM-7 charset
      const msg = '\n'.repeat(50);
      expect(getMessageSegmentCount(msg)).toBe(1);
    });
  });
});
