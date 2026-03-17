import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeLaundromatName,
  sanitizeAddress,
  sanitizeNotes,
  sanitizeMachineLabel,
  sanitizeCustomerName,
} from '../sanitize';

describe('sanitizeText', () => {
  it('returns clean text unchanged', () => {
    expect(sanitizeText('Hello World')).toBe('Hello World');
  });

  it('strips <script> tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('strips <b> bold tags', () => {
    expect(sanitizeText('<b>bold text</b>')).toBe('bold text');
  });

  it('strips nested HTML tags', () => {
    expect(sanitizeText('<div><p>text</p></div>')).toBe('text');
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('handles self-closing tags', () => {
    expect(sanitizeText('text<br/>more')).toBe('textmore');
  });

  it('handles tags with attributes', () => {
    expect(sanitizeText('<a href="http://example.com">click</a>')).toBe('click');
  });
});

describe('sanitizeLaundromatName', () => {
  it('allows alphanumeric and spaces: "Spin Go Laundry"', () => {
    expect(sanitizeLaundromatName('Spin Go Laundry')).toBe('Spin Go Laundry');
  });

  it('allows ampersand: "Spin & Go"', () => {
    expect(sanitizeLaundromatName('Spin & Go')).toBe('Spin & Go');
  });

  it("allows apostrophe: \"Maria's Laundry\"", () => {
    expect(sanitizeLaundromatName("Maria's Laundry")).toBe("Maria's Laundry");
  });

  it('allows dash: "Clean-Fresh Laundry"', () => {
    expect(sanitizeLaundromatName('Clean-Fresh Laundry')).toBe('Clean-Fresh Laundry');
  });

  it('allows period: "J.R. Laundry"', () => {
    expect(sanitizeLaundromatName('J.R. Laundry')).toBe('J.R. Laundry');
  });

  it('allows parentheses: "Laundry (Main Branch)"', () => {
    expect(sanitizeLaundromatName('Laundry (Main Branch)')).toBe('Laundry (Main Branch)');
  });

  it('strips emoji characters', () => {
    expect(sanitizeLaundromatName('Laundry')).toBe('Laundry');
  });

  it('strips special characters like @ and #', () => {
    expect(sanitizeLaundromatName('Laundry@Home#1')).toBe('LaundryHome1');
  });

  it('strips exclamation marks', () => {
    expect(sanitizeLaundromatName('Laundry!')).toBe('Laundry');
  });

  it('truncates names longer than 50 characters', () => {
    const longName = 'A'.repeat(60);
    expect(sanitizeLaundromatName(longName)).toHaveLength(50);
  });

  it('keeps names exactly 50 characters long unchanged', () => {
    const exactName = 'A'.repeat(50);
    expect(sanitizeLaundromatName(exactName)).toBe(exactName);
  });

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeLaundromatName('  Laundry  ')).toBe('Laundry');
  });

  it('returns empty string for fully invalid input', () => {
    expect(sanitizeLaundromatName('!!@@##')).toBe('');
  });
});

describe('sanitizeAddress', () => {
  it('returns clean address unchanged', () => {
    const addr = '123 Main St, Quezon City';
    expect(sanitizeAddress(addr)).toBe(addr);
  });

  it('strips HTML tags from address', () => {
    expect(sanitizeAddress('<b>123 Main St</b>')).toBe('123 Main St');
  });

  it('truncates address longer than 200 characters', () => {
    const longAddress = 'A'.repeat(250);
    expect(sanitizeAddress(longAddress)).toHaveLength(200);
  });

  it('keeps addresses exactly 200 characters unchanged', () => {
    const exactAddress = 'A'.repeat(200);
    expect(sanitizeAddress(exactAddress)).toBe(exactAddress);
  });

  it('trims whitespace', () => {
    expect(sanitizeAddress('  123 Main St  ')).toBe('123 Main St');
  });

  it('strips script injection', () => {
    expect(sanitizeAddress('<script>evil()</script>123 Main St')).toBe('evil()123 Main St');
  });
});

describe('sanitizeNotes', () => {
  it('returns clean notes unchanged', () => {
    const notes = 'Customer prefers cold wash';
    expect(sanitizeNotes(notes)).toBe(notes);
  });

  it('strips HTML from notes', () => {
    expect(sanitizeNotes('<p>handle with care</p>')).toBe('handle with care');
  });

  it('truncates notes longer than 500 characters', () => {
    const longNotes = 'A'.repeat(600);
    expect(sanitizeNotes(longNotes)).toHaveLength(500);
  });

  it('keeps notes exactly 500 characters unchanged', () => {
    const exactNotes = 'A'.repeat(500);
    expect(sanitizeNotes(exactNotes)).toBe(exactNotes);
  });

  it('trims whitespace', () => {
    expect(sanitizeNotes('  some notes  ')).toBe('some notes');
  });
});

describe('sanitizeMachineLabel', () => {
  it('returns clean label unchanged: "M-01"', () => {
    expect(sanitizeMachineLabel('M-01')).toBe('M-01');
  });

  it('strips HTML from machine label', () => {
    expect(sanitizeMachineLabel('<b>Machine A</b>')).toBe('Machine A');
  });

  it('truncates labels longer than 20 characters', () => {
    const longLabel = 'A'.repeat(25);
    expect(sanitizeMachineLabel(longLabel)).toHaveLength(20);
  });

  it('keeps labels exactly 20 characters unchanged', () => {
    const exactLabel = 'A'.repeat(20);
    expect(sanitizeMachineLabel(exactLabel)).toBe(exactLabel);
  });

  it('trims whitespace', () => {
    expect(sanitizeMachineLabel('  Machine A  ')).toBe('Machine A');
  });

  it('handles empty input', () => {
    expect(sanitizeMachineLabel('')).toBe('');
  });
});

describe('sanitizeCustomerName', () => {
  it('returns clean name unchanged', () => {
    expect(sanitizeCustomerName('Juan Dela Cruz')).toBe('Juan Dela Cruz');
  });

  it('strips HTML tags', () => {
    expect(sanitizeCustomerName('<b>Juan</b>')).toBe('Juan');
  });

  it('truncates names longer than 60 characters', () => {
    const longName = 'A'.repeat(70);
    expect(sanitizeCustomerName(longName)).toHaveLength(60);
  });

  it('keeps names exactly 60 characters unchanged', () => {
    const exactName = 'A'.repeat(60);
    expect(sanitizeCustomerName(exactName)).toBe(exactName);
  });

  it('trims whitespace', () => {
    expect(sanitizeCustomerName('  Maria Santos  ')).toBe('Maria Santos');
  });

  it('handles empty input', () => {
    expect(sanitizeCustomerName('')).toBe('');
  });

  it('strips script tags', () => {
    expect(sanitizeCustomerName('<script>alert("xss")</script>Juan')).toBe('alert("xss")Juan');
  });
});
