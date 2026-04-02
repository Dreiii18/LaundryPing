import { describe, it, expect, afterEach, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import { isAdmin, getAdminEmailList } from '../admin-auth';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeUser(email: string | undefined): User {
  return { id: 'user-1', email } as User;
}

// ---------------------------------------------------------------------------
// isAdmin
// ---------------------------------------------------------------------------

describe('isAdmin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any env mutations made during a test.
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_EMAIL;
  });

  it('returns true for an email that is in ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com,other@example.com';

    expect(isAdmin(makeUser('admin@example.com'))).toBe(true);
  });

  it('returns true with case-insensitive matching', () => {
    process.env.ADMIN_EMAILS = 'Admin@Example.COM';

    expect(isAdmin(makeUser('admin@example.com'))).toBe(true);
  });

  it('returns true when the user email is upper-cased but the env list is lower-cased', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';

    expect(isAdmin(makeUser('ADMIN@EXAMPLE.COM'))).toBe(true);
  });

  it('returns false for a non-admin email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';

    expect(isAdmin(makeUser('user@example.com'))).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is an empty string', () => {
    process.env.ADMIN_EMAILS = '';
    // ADMIN_EMAIL must also be absent so the fallback does not kick in.
    delete process.env.ADMIN_EMAIL;

    expect(isAdmin(makeUser('admin@example.com'))).toBe(false);
  });

  it('returns false when ADMIN_EMAILS is undefined', () => {
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_EMAIL;

    expect(isAdmin(makeUser('admin@example.com'))).toBe(false);
  });

  it('handles whitespace in a comma-separated list', () => {
    process.env.ADMIN_EMAILS = ' admin@example.com , super@example.com ';

    expect(isAdmin(makeUser('admin@example.com'))).toBe(true);
    expect(isAdmin(makeUser('super@example.com'))).toBe(true);
  });

  it('falls back to ADMIN_EMAIL when ADMIN_EMAILS is not set', () => {
    delete process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAIL = 'fallback@example.com';

    expect(isAdmin(makeUser('fallback@example.com'))).toBe(true);
  });

  it('returns false for a non-matching email when using ADMIN_EMAIL fallback', () => {
    delete process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAIL = 'fallback@example.com';

    expect(isAdmin(makeUser('other@example.com'))).toBe(false);
  });

  it('returns false when user has no email', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com';

    expect(isAdmin(makeUser(undefined))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAdminEmailList
// ---------------------------------------------------------------------------

describe('getAdminEmailList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_EMAIL;
  });

  it('returns emails from ADMIN_EMAILS', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com,other@example.com';

    expect(getAdminEmailList()).toEqual(['admin@example.com', 'other@example.com']);
  });

  it('returns lowercase emails', () => {
    process.env.ADMIN_EMAILS = 'Admin@Example.COM,Super@Example.COM';

    expect(getAdminEmailList()).toEqual(['admin@example.com', 'super@example.com']);
  });

  it('handles whitespace in a comma-separated list', () => {
    process.env.ADMIN_EMAILS = ' admin@example.com , super@example.com ';

    expect(getAdminEmailList()).toEqual(['admin@example.com', 'super@example.com']);
  });

  it('falls back to ADMIN_EMAIL when ADMIN_EMAILS is not set', () => {
    delete process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAIL = 'fallback@example.com';

    expect(getAdminEmailList()).toEqual(['fallback@example.com']);
  });

  it('returns empty array when no env var is set', () => {
    delete process.env.ADMIN_EMAILS;
    delete process.env.ADMIN_EMAIL;

    expect(getAdminEmailList()).toEqual([]);
  });

  it('filters out empty strings from the result', () => {
    process.env.ADMIN_EMAILS = 'admin@example.com,,other@example.com,';

    expect(getAdminEmailList()).toEqual(['admin@example.com', 'other@example.com']);
  });
});
