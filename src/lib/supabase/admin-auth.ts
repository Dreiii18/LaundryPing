import type { User } from '@supabase/supabase-js';

export function isAdmin(user: User): boolean {
  const emails = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
  if (!emails || !user.email) return false;
  const adminList = emails.split(',').map((e) => e.trim().toLowerCase());
  return adminList.includes(user.email.toLowerCase());
}

export function requireAdmin(user: User): { authorized: boolean } {
  return { authorized: isAdmin(user) };
}
