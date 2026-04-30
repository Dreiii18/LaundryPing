import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedUser } from '@/lib/supabase/auth-helpers';
import { sanitizeLaundromatName, sanitizeAddress, sanitizeContactNumber } from '@/lib/utils/sanitize';

const updateSettingsSchema = z.object({
  name: z.string().min(1, 'Shop name is required').max(50, 'Shop name must be 50 characters or less').optional(),
  address: z.string().max(200, 'Address must be 200 characters or less').optional().nullable(),
  available_services: z.array(z.string().min(1).max(50)).min(1).max(20).optional(),
  service_prices: z.record(z.string().min(1).max(50), z.number().min(0).max(99999))
    .refine(obj => Object.keys(obj).length <= 20, 'Maximum 20 service prices')
    .optional(),
  service_weights: z.record(z.string().min(1).max(50), z.number().min(0).max(9999))
    .refine(obj => Object.keys(obj).length <= 20, 'Maximum 20 service weights')
    .optional(),
  service_types: z.record(z.string().min(1).max(50), z.enum(['per_load', 'per_kg', 'fixed']))
    .refine(obj => Object.keys(obj).length <= 20, 'Maximum 20 service types')
    .optional(),
  contact_number: z.string().max(20, 'Contact number must be 20 characters or less').optional().nullable(),
  rush_fee: z.number().min(0, 'Rush fee must be 0 or more').max(99999).optional(),
  receipt_paper_size: z.enum(['58mm', '80mm']).optional(),
  sms_queue_template: z
    .string()
    .max(480, 'Queue template must be 480 characters or less')
    .transform((s) => s.replace(/\r/g, ''))
    .optional()
    .nullable(),
  sms_completion_template: z
    .string()
    .max(480, 'Completion template must be 480 characters or less')
    .transform((s) => s.replace(/\r/g, ''))
    .optional()
    .nullable(),
});

export async function GET() {
  try {
    const { laundromat, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        id: laundromat.id,
        name: laundromat.name,
        address: laundromat.address,
        available_services: laundromat.available_services,
        service_prices: laundromat.service_prices,
        service_weights: laundromat.service_weights,
        service_types: laundromat.service_types,
        rush_fee: laundromat.rush_fee,
        contact_number: laundromat.contact_number,
        receipt_paper_size: laundromat.receipt_paper_size,
        sms_queue_template: laundromat.sms_queue_template,
        sms_completion_template: laundromat.sms_completion_template,
      },
    });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { laundromat, supabase, error } = await getAuthenticatedUser();

    if (error === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error === 'Laundromat not found' || !laundromat) {
      return NextResponse.json({ error: 'Laundromat not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const updateData: Record<string, string | string[] | Record<string, number> | Record<string, string> | number | null> = {};

    if (parsed.data.name !== undefined) {
      const sanitizedName = sanitizeLaundromatName(parsed.data.name);
      if (!sanitizedName) {
        return NextResponse.json(
          { error: 'Shop name contains only invalid characters' },
          { status: 400 }
        );
      }
      updateData.name = sanitizedName;
    }

    if (parsed.data.address !== undefined) {
      updateData.address = parsed.data.address
        ? sanitizeAddress(parsed.data.address)
        : null;
    }

    if (parsed.data.available_services !== undefined) {
      const deduplicated = [...new Set(parsed.data.available_services.map((s) => s.trim()).filter(Boolean))];
      if (deduplicated.length === 0) {
        return NextResponse.json(
          { error: 'At least one service is required' },
          { status: 400 }
        );
      }
      updateData.available_services = deduplicated;
    }

    if (parsed.data.service_prices !== undefined) {
      // Filter to only keys that match current available_services
      const validServices = new Set(
        (parsed.data.available_services ?? (updateData.available_services as string[] | undefined) ?? laundromat.available_services)
      );
      updateData.service_prices = Object.fromEntries(
        Object.entries(parsed.data.service_prices).filter(([k]) => validServices.has(k))
      );
    }

    if (parsed.data.service_weights !== undefined) {
      const validServices = new Set(
        (parsed.data.available_services ?? (updateData.available_services as string[] | undefined) ?? laundromat.available_services)
      );
      updateData.service_weights = Object.fromEntries(
        Object.entries(parsed.data.service_weights).filter(([k]) => validServices.has(k))
      );
    }

    if (parsed.data.service_types !== undefined) {
      const validServices = new Set(
        (parsed.data.available_services ?? (updateData.available_services as string[] | undefined) ?? laundromat.available_services)
      );
      updateData.service_types = Object.fromEntries(
        Object.entries(parsed.data.service_types).filter(([k]) => validServices.has(k))
      );
    }

    if (parsed.data.contact_number !== undefined) {
      const sanitized = parsed.data.contact_number
        ? sanitizeContactNumber(parsed.data.contact_number)
        : null;
      updateData.contact_number = sanitized || null;
    }

    if (parsed.data.rush_fee !== undefined) {
      updateData.rush_fee = parsed.data.rush_fee;
    }

    if (parsed.data.receipt_paper_size !== undefined) {
      updateData.receipt_paper_size = parsed.data.receipt_paper_size;
    }

    if (parsed.data.sms_queue_template !== undefined) {
      // Empty string → null so the renderer falls back to the default.
      updateData.sms_queue_template = parsed.data.sms_queue_template?.trim()
        ? parsed.data.sms_queue_template
        : null;
    }

    if (parsed.data.sms_completion_template !== undefined) {
      updateData.sms_completion_template = parsed.data.sms_completion_template?.trim()
        ? parsed.data.sms_completion_template
        : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('laundromats')
      .update(updateData)
      .eq('id', laundromat.id)
      .select('id, name, address, available_services, service_prices, service_weights, service_types, rush_fee, contact_number, receipt_paper_size, sms_queue_template, sms_completion_template')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ settings: updated });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
