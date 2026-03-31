/**
 * SMS templates for laundry completion notifications.
 * Each must fit within a single 160-character GSM-7 SMS segment
 * even with a 25-character shop name.
 */
const TEMPLATES = [
  (name: string) =>
    `Tapos na po ang labada mo sa ${name}. Ready na po for pickup. Salamat sa pagtitiwala!`,
  (name: string) =>
    `Ready na po ang labada mo sa ${name}. Maaari na po itong i-pickup. Maraming salamat!`,
  (name: string) =>
    `Hi! Tapos na po ang labada mo sa ${name}. Pwede na po itong i-pickup. Salamat!`,
  (name: string) =>
    `Magandang balita! Ready na po ang labada mo sa ${name}. Paki-pickup na po kapag available. Salamat!`,
  (name: string) =>
    `Update mula sa ${name}: Tapos na po ang labada mo at ready na for pickup. Maraming salamat!`,
];

/**
 * Builds a randomized Tagalog SMS message for laundry completion.
 * Rotates through 5 templates to keep messages fresh.
 * Shop names > 25 chars are truncated with ellipsis.
 * Optionally appends customer name if it fits in 160 chars.
 */
export function buildLaundryDoneMessage(
  shopName: string,
  customerName?: string | null,
): string {
  const truncatedName = shopName.length > 25
    ? shopName.slice(0, 22) + '...'
    : shopName;

  const index = Math.floor(Math.random() * TEMPLATES.length);
  const base = TEMPLATES[index](truncatedName);

  if (customerName) {
    const withName = `${base} - ${customerName}`;
    if (withName.length <= 160) return withName;
  }

  return base;
}

/**
 * Checks if a message fits within a single SMS segment.
 * GSM-7: 160 chars per segment
 * Unicode (UCS-2): 70 chars per segment
 */
export function getMessageSegmentCount(message: string): number {
  // Check if message contains non-GSM-7 characters
  const gsm7Chars = /^[@\u00a3\$\u00a5\u00e8\u00e9\u00f9\u00ec\u00f2\u00c7\n\u00d8\u00f8\r\u00c5\u00e5\u0394_\u03a6\u0393\u039b\u03a9\u03a0\u03a8\u03a3\u0398\u039e\u00c6\u00e6\u00df\u00c9 !"#\u00a4%&'()*+,\-.\/0-9:;<=>?\u00a1A-Za-z\u00c4\u00d6\u00d1\u00dc\u00a7\u00bf\u00e4\u00f6\u00f1\u00fc\u00e0\^{}\[~\]|\u20ac]*$/;
  const isGsm7 = gsm7Chars.test(message);

  if (isGsm7) {
    if (message.length <= 160) return 1;
    return Math.ceil(message.length / 153); // Multipart uses 153 chars/segment
  } else {
    if (message.length <= 70) return 1;
    return Math.ceil(message.length / 67); // Multipart UCS-2 uses 67 chars/segment
  }
}
