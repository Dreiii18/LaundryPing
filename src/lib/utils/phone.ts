import { z } from 'zod';

const PH_MOBILE_REGEX = /^(\+?63|0)9\d{9}$/;

export function isValidPhNumber(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return PH_MOBILE_REGEX.test(cleaned);
}

export function normalizeToLocal(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+63')) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith('63')) return `0${cleaned.slice(2)}`;
  if (cleaned.startsWith('0')) return cleaned;
  throw new Error(`Cannot normalize PH number: ${phone}`);
}

export function normalizeToInternational(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+63')) return cleaned;
  if (cleaned.startsWith('63')) return `+${cleaned}`;
  if (cleaned.startsWith('0')) return `+63${cleaned.slice(1)}`;
  throw new Error(`Cannot normalize PH number: ${phone}`);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `09xx-xxx-${last4}`;
}

export const phoneSchema = z.string().refine(
  (val) => isValidPhNumber(val),
  { message: 'Please enter a valid Philippine mobile number (e.g., 09171234567)' }
);
