/**
 * SMS template rendering for laundry notifications.
 *
 * Templates are free-form strings with `{{variable}}` placeholders. Only the
 * variables in ALLOWED_VARS are substituted — any other `{{x}}` in the template
 * renders as empty string. This is defense-in-depth: even if an owner writes
 * `{{customer_phone}}` into their template, no sensitive field leaks.
 */

export const DEFAULT_QUEUE_TEMPLATE =
  '[{{shop_name}}] Salamat! Nakapila na po ang laundry niyo. I-text po namin pag tapos na. - {{shop_name}}';

export const DEFAULT_COMPLETION_TEMPLATE =
  '[{{shop_name}}] Hi {{customer_name}}, ready na po ang laundry niyo! Salamat po. - {{shop_name}}';

export const ALLOWED_VARS = ['shop_name', 'customer_name', 'job_id'] as const;
export type TemplateVar = (typeof ALLOWED_VARS)[number];
export type TemplateVars = Partial<Record<TemplateVar, string>>;

const ALLOWED_VAR_SET: ReadonlySet<string> = new Set(ALLOWED_VARS);

export function renderSmsTemplate(
  template: string | null | undefined,
  fallback: string,
  vars: TemplateVars,
): string {
  const trimmed = template?.trim();
  const tpl = trimmed && trimmed.length > 0 ? template! : fallback;
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    ALLOWED_VAR_SET.has(key) ? (vars[key as TemplateVar] ?? '') : '',
  );
}

/**
 * Checks if a message fits within a single SMS segment.
 * GSM-7: 160 chars per segment
 * Unicode (UCS-2): 70 chars per segment
 */
export function getMessageSegmentCount(message: string): number {
  // Check if message contains non-GSM-7 characters
  const gsm7Chars = /^[@£\$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-.\/0-9:;<=>?¡A-Za-zÄÖÑÜ§¿äöñüà\^{}\[~\]|€]*$/;
  const isGsm7 = gsm7Chars.test(message);

  if (isGsm7) {
    if (message.length <= 160) return 1;
    return Math.ceil(message.length / 153); // Multipart uses 153 chars/segment
  } else {
    if (message.length <= 70) return 1;
    return Math.ceil(message.length / 67); // Multipart UCS-2 uses 67 chars/segment
  }
}
