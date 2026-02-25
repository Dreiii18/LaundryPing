import type { User } from '@supabase/supabase-js';

export function isAdmin(user: User): boolean {
  return !!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL;
}

export function requireAdmin(user: User): { authorized: boolean } {
  return { authorized: isAdmin(user) };
}
