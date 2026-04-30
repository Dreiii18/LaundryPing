import { describe, it, expect } from 'vitest';
import {
  renderSmsTemplate,
  getMessageSegmentCount,
  DEFAULT_QUEUE_TEMPLATE,
  DEFAULT_COMPLETION_TEMPLATE,
} from '../templates';

describe('renderSmsTemplate', () => {
  const sampleVars = {
    shop_name: 'SpinClean',
    customer_name: 'Maria',
    job_id: 'abc12345',
  };

  describe('variable substitution', () => {
    it('substitutes all three allowed variables', () => {
      const tpl = '[{{shop_name}}] Hi {{customer_name}}, ref {{job_id}}';
      expect(renderSmsTemplate(tpl, DEFAULT_COMPLETION_TEMPLATE, sampleVars)).toBe(
        '[SpinClean] Hi Maria, ref abc12345',
      );
    });

    it('substitutes repeated occurrences of the same variable', () => {
      const tpl = '{{shop_name}} and {{shop_name}} again - {{shop_name}}';
      expect(renderSmsTemplate(tpl, DEFAULT_COMPLETION_TEMPLATE, sampleVars)).toBe(
        'SpinClean and SpinClean again - SpinClean',
      );
    });

    it('renders missing var in vars object as empty string', () => {
      const tpl = 'Hi {{customer_name}}';
      expect(renderSmsTemplate(tpl, DEFAULT_COMPLETION_TEMPLATE, { shop_name: 'x' })).toBe(
        'Hi ',
      );
    });

    it('preserves newlines in the template verbatim', () => {
      const tpl = '{{shop_name}}\nReady na po!';
      expect(renderSmsTemplate(tpl, DEFAULT_COMPLETION_TEMPLATE, sampleVars)).toBe(
        'SpinClean\nReady na po!',
      );
    });

    it('preserves emoji in the template verbatim', () => {
      const tpl = '{{shop_name}} 🧺 ready!';
      expect(renderSmsTemplate(tpl, DEFAULT_COMPLETION_TEMPLATE, sampleVars)).toBe(
        'SpinClean 🧺 ready!',
      );
    });
  });

  describe('defense in depth — variable whitelist', () => {
    it('renders unknown variable {{foo}} as empty string', () => {
      const tpl = 'Hi {{foo}}';
      expect(renderSmsTemplate(tpl, DEFAULT_COMPLETION_TEMPLATE, sampleVars)).toBe('Hi ');
    });

    it('renders {{customer_phone}} as empty string (sensitive field never leaks)', () => {
      const tpl = 'Call {{customer_phone}} now';
      expect(
        renderSmsTemplate(tpl, DEFAULT_COMPLETION_TEMPLATE, {
          ...sampleVars,
          // @ts-expect-error — intentionally passing a non-allowed key
          customer_phone: '09171234567',
        }),
      ).toBe('Call  now');
    });
  });

  describe('fallback behaviour', () => {
    it('uses fallback when template is null', () => {
      const rendered = renderSmsTemplate(null, DEFAULT_COMPLETION_TEMPLATE, sampleVars);
      expect(rendered).toContain('SpinClean');
      expect(rendered).toContain('Maria');
      expect(rendered).not.toContain('{{');
    });

    it('uses fallback when template is undefined', () => {
      const rendered = renderSmsTemplate(undefined, DEFAULT_QUEUE_TEMPLATE, sampleVars);
      expect(rendered).toContain('SpinClean');
      expect(rendered).not.toContain('{{');
    });

    it('uses fallback when template is an empty string', () => {
      const rendered = renderSmsTemplate('', DEFAULT_QUEUE_TEMPLATE, sampleVars);
      expect(rendered).toContain('SpinClean');
      expect(rendered).not.toContain('{{');
    });

    it('uses fallback when template is whitespace-only', () => {
      const rendered = renderSmsTemplate('   \n  ', DEFAULT_COMPLETION_TEMPLATE, sampleVars);
      expect(rendered).toContain('SpinClean');
      expect(rendered).not.toContain('{{');
    });
  });

  describe('default template rendering', () => {
    it('DEFAULT_QUEUE_TEMPLATE renders cleanly with sample vars', () => {
      const rendered = renderSmsTemplate(null, DEFAULT_QUEUE_TEMPLATE, sampleVars);
      expect(rendered).toBe(
        '[SpinClean] Salamat! Nakapila na po ang laundry niyo. I-text po namin pag tapos na. - SpinClean',
      );
    });

    it('DEFAULT_COMPLETION_TEMPLATE renders cleanly with sample vars', () => {
      const rendered = renderSmsTemplate(null, DEFAULT_COMPLETION_TEMPLATE, sampleVars);
      expect(rendered).toBe(
        '[SpinClean] Hi Maria, ready na po ang laundry niyo! Salamat po. - SpinClean',
      );
    });

    it('both default templates fit within a single SMS segment with a 25-char shop name', () => {
      const vars = { shop_name: 'A'.repeat(25), customer_name: 'Juan', job_id: 'abc12345' };
      const q = renderSmsTemplate(null, DEFAULT_QUEUE_TEMPLATE, vars);
      const c = renderSmsTemplate(null, DEFAULT_COMPLETION_TEMPLATE, vars);
      expect(getMessageSegmentCount(q)).toBe(1);
      expect(getMessageSegmentCount(c)).toBe(1);
    });
  });
});

describe('getMessageSegmentCount', () => {
  describe('GSM-7 messages', () => {
    it('returns 1 for an empty string', () => {
      expect(getMessageSegmentCount('')).toBe(1);
    });

    it('returns 1 for a message of exactly 160 GSM-7 characters', () => {
      expect(getMessageSegmentCount('A'.repeat(160))).toBe(1);
    });

    it('returns 1 for a message shorter than 160 GSM-7 characters', () => {
      expect(getMessageSegmentCount('Hello World!')).toBe(1);
    });

    it('returns 2 for a message of 161 GSM-7 characters (multipart, 153/segment)', () => {
      expect(getMessageSegmentCount('A'.repeat(161))).toBe(2);
    });

    it('returns 2 for a message of 306 GSM-7 characters (2 x 153)', () => {
      expect(getMessageSegmentCount('A'.repeat(306))).toBe(2);
    });

    it('returns 3 for a message of 307 GSM-7 characters (3rd segment starts)', () => {
      expect(getMessageSegmentCount('A'.repeat(307))).toBe(3);
    });
  });

  describe('UCS-2 (unicode) messages', () => {
    const unicodeChar = 'こ';

    it('returns 1 for a unicode message of exactly 70 characters', () => {
      expect(getMessageSegmentCount(unicodeChar.repeat(70))).toBe(1);
    });

    it('returns 2 for a unicode message of 71 characters (multipart, 67/segment)', () => {
      expect(getMessageSegmentCount(unicodeChar.repeat(71))).toBe(2);
    });

    it('returns 2 for a unicode message of 134 characters (2 x 67)', () => {
      expect(getMessageSegmentCount(unicodeChar.repeat(134))).toBe(2);
    });

    it('returns 3 for a unicode message of 135 characters (3rd segment starts)', () => {
      expect(getMessageSegmentCount(unicodeChar.repeat(135))).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('GSM-7 numbers and basic punctuation are counted as GSM-7', () => {
      expect(getMessageSegmentCount('0917 123 4567 - Your laundry is ready!')).toBe(1);
    });

    it('message with only newlines counts as GSM-7', () => {
      expect(getMessageSegmentCount('\n'.repeat(50))).toBe(1);
    });
  });
});
