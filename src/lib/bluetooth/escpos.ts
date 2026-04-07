import type { ReceiptData } from '@/lib/utils/receipt';

// ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const PAPER_CHARS: Record<string, number> = {
  '58mm': 32,
  '80mm': 48,
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  ewallet: 'E-wallet',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
};

const encoder = new TextEncoder();

function cmd(...bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

function text(str: string): Uint8Array {
  return encoder.encode(str);
}

// ESC/POS command helpers
const INIT = cmd(ESC, 0x40); // ESC @ — initialize
const ALIGN_LEFT = cmd(ESC, 0x61, 0x00);
const ALIGN_CENTER = cmd(ESC, 0x61, 0x01);
const BOLD_ON = cmd(ESC, 0x45, 0x01);
const BOLD_OFF = cmd(ESC, 0x45, 0x00);
const FONT_DOUBLE = cmd(GS, 0x21, 0x11); // double height + width
const FONT_NORMAL = cmd(GS, 0x21, 0x00);
const FEED_AND_CUT = cmd(ESC, 0x64, 0x04, GS, 0x56, 0x00); // feed 4 lines + full cut

function lineFeed(n = 1): Uint8Array {
  return new Uint8Array(Array(n).fill(LF));
}

function divider(width: number): Uint8Array {
  return text('-'.repeat(width) + '\n');
}

function padRight(str: string, width: number): string {
  return str.length >= width ? str.slice(0, width) : str + ' '.repeat(width - str.length);
}

function twoColumnLine(left: string, right: string, width: number): string {
  const rightLen = right.length;
  const leftMax = width - rightLen - 1;
  const leftStr = left.length > leftMax ? left.slice(0, leftMax) : padRight(left, leftMax);
  return leftStr + ' ' + right + '\n';
}

function centerText(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width) + '\n';
  const pad = Math.floor((width - str.length) / 2);
  return ' '.repeat(pad) + str + '\n';
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function padInvoice(num: number | null): string {
  if (num == null) return '-----';
  return String(num).padStart(5, '0');
}

function formatDate(isoDate: string): { date: string; time: string } {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return { date: '--', time: '--' };
  const date = d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Manila',
  });
  return { date, time };
}

/**
 * Concatenates multiple Uint8Arrays into one.
 */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Converts ReceiptData into ESC/POS byte commands for thermal printing.
 */
export function buildReceiptCommands(data: ReceiptData): Uint8Array {
  const width = PAPER_CHARS[data.paperSize ?? '58mm'] ?? 32;
  const { date, time } = formatDate(data.date);
  const invoiceNum = padInvoice(data.claimNumber);
  const customerName = data.customerName || 'Walk-in';

  const parts: Uint8Array[] = [];

  // Initialize printer
  parts.push(INIT);

  // --- Shop Header (centered, bold, double size) ---
  parts.push(ALIGN_CENTER, BOLD_ON, FONT_DOUBLE);
  parts.push(text(data.shopName + '\n'));
  parts.push(FONT_NORMAL, BOLD_OFF);

  if (data.shopAddress) {
    parts.push(text(data.shopAddress + '\n'));
  }
  if (data.shopContact) {
    parts.push(text(data.shopContact + '\n'));
  }

  parts.push(ALIGN_LEFT);
  parts.push(divider(width));

  // --- Invoice Info ---
  parts.push(text(`INV#: ${invoiceNum}\n`));
  parts.push(text(`DATE: ${date}\n`));
  parts.push(text(`TIME: ${time}\n`));

  parts.push(divider(width));

  // --- Customer Information ---
  parts.push(ALIGN_CENTER);
  parts.push(text(centerText('CUSTOMER INFORMATION', width)));
  parts.push(ALIGN_LEFT);
  parts.push(text(`NAME:  ${customerName}\n`));
  if (data.customerPhone) {
    parts.push(text(`MOBILE: ${data.customerPhone}\n`));
  }

  parts.push(divider(width));

  // --- Services ---
  const lineItems = data.services.map((service) => ({
    name: service,
    price: data.servicePrices[service] ?? 0,
  }));
  const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0);
  const total = data.payAmount ?? 0;

  for (const item of lineItems) {
    parts.push(BOLD_ON);
    parts.push(text(item.name + '\n'));
    parts.push(BOLD_OFF);
    parts.push(text(twoColumnLine(` 1.0 x ${formatCurrency(item.price)}`, formatCurrency(item.price), width)));
  }

  parts.push(divider(width));

  // --- Totals ---
  parts.push(text(twoColumnLine(`${lineItems.length} Item(s)`, '', width)));
  parts.push(text(twoColumnLine('SUBTOTAL', formatCurrency(subtotal), width)));
  parts.push(BOLD_ON);
  parts.push(text(twoColumnLine('TOTAL', formatCurrency(total), width)));
  parts.push(BOLD_OFF);

  parts.push(divider(width));

  // --- Payment ---
  if (data.isPaid) {
    const received = data.cashTendered != null ? data.cashTendered : total;
    const methodLabel = data.paymentMethod
      ? PAYMENT_METHOD_LABELS[data.paymentMethod] || data.paymentMethod
      : '';

    parts.push(text(twoColumnLine('PAYMENT RECEIVED:', formatCurrency(received), width)));
    if (methodLabel) {
      parts.push(text(methodLabel + '\n'));
    }
    if (data.cashTendered != null) {
      const change = Math.max(0, data.cashTendered - total);
      parts.push(text(twoColumnLine('CHANGE AMOUNT:', formatCurrency(change), width)));
    }
    parts.push(lineFeed());
    parts.push(ALIGN_CENTER, BOLD_ON);
    parts.push(text(centerText('*** PAID ***', width)));
    parts.push(BOLD_OFF, ALIGN_LEFT);
  } else {
    parts.push(text(twoColumnLine('PAYMENT RECEIVED:', '0.00', width)));
    parts.push(BOLD_ON);
    parts.push(text(twoColumnLine('BALANCE', formatCurrency(total), width)));
    parts.push(BOLD_OFF);
  }

  parts.push(divider(width));

  // --- Staff Signature ---
  parts.push(text('Processed by:\n'));
  parts.push(lineFeed(2));
  parts.push(ALIGN_CENTER);
  parts.push(text('_'.repeat(Math.floor(width * 0.6)) + '\n'));
  parts.push(text(centerText('(Staff Signature)', width)));
  parts.push(ALIGN_LEFT);

  parts.push(divider(width));

  // --- Footer ---
  parts.push(ALIGN_CENTER);
  parts.push(text(centerText('Acknowledgement Receipt', width)));
  parts.push(BOLD_ON);
  parts.push(text(centerText('Thank you!', width)));
  parts.push(BOLD_OFF, ALIGN_LEFT);

  // Feed and cut
  parts.push(FEED_AND_CUT);

  return concat(...parts);
}
