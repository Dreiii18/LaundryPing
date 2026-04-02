import type { User } from '@supabase/supabase-js';

export function getAdminEmailList(): string[] {
  const emails = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
  if (!emails) return [];
  return emails.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdmin(user: User): boolean {
  if (!user.email) return false;
  const adminList = getAdminEmailList();
  if (adminList.length === 0) return false;
  return adminList.includes(user.email.toLowerCase());
}

export function requireAdmin(user: User): { authorized: boolean } {
  return { authorized: isAdmin(user) };
}
