/**
 * Generates receipt HTML for thermal printing (48mm print width / 58mm paper).
 * Uses a hidden iframe and triggers window.print().
 */
import { escapeHtml } from '@/lib/utils/sanitize';

interface ReceiptData {
  shopName: string;
  shopAddress: string | null;
  shopContact: string | null;
  claimNumber: number | null;
  date: string; // ISO date string
  customerName: string | null;
  customerPhone: string | null;
  services: string[];
  servicePrices: Record<string, number>;
  payAmount: number;
  isPaid: boolean;
  paymentMethod: string | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  ewallet: 'E-wallet',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
};

function formatDate(isoDate: string): { date: string; time: string } {
  const d = new Date(isoDate);
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

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

function padInvoice(num: number | null): string {
  if (num == null) return '-----';
  return String(num).padStart(5, '0');
}

export function generateReceiptHtml(data: ReceiptData): string {
  const { date, time } = formatDate(data.date);
  const invoiceNum = padInvoice(data.claimNumber);
  const customerName = data.customerName || 'Walk-in';

  // Calculate per-service line items
  const lineItems = data.services.map((service) => {
    const price = data.servicePrices[service] ?? 0;
    return { name: service, price };
  });
  const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0);
  const total = data.payAmount ?? 0;
  const itemCount = lineItems.length;

  // Build service lines HTML
  const serviceLines = lineItems
    .map(
      (item) => `
      <tr>
        <td colspan="3" style="padding-top:4px;font-weight:bold;">${escapeHtml(item.name)}</td>
      </tr>
      <tr>
        <td>&nbsp;1.0 &nbsp;x &nbsp;${formatCurrency(item.price)}</td>
        <td></td>
        <td style="text-align:right;">${formatCurrency(item.price)}</td>
      </tr>`
    )
    .join('');

  // Payment section
  let paymentSection = '';
  if (data.isPaid) {
    const methodLabel = data.paymentMethod
      ? PAYMENT_METHOD_LABELS[data.paymentMethod] || data.paymentMethod
      : '';
    paymentSection = `
      <tr>
        <td colspan="2">PAYMENT RECEIVED:</td>
        <td style="text-align:right;">${formatCurrency(total)}</td>
      </tr>
      <tr><td colspan="3">${escapeHtml(methodLabel)}</td></tr>
      <tr>
        <td colspan="2">CHANGE AMOUNT:</td>
        <td style="text-align:right;">0.00</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align:center;padding-top:8px;">
          <span style="border:2px solid #c00;color:#c00;padding:2px 12px;font-weight:bold;font-size:14px;letter-spacing:2px;">PAID</span>
        </td>
      </tr>`;
  } else {
    paymentSection = `
      <tr>
        <td colspan="2">PAYMENT RECEIVED:</td>
        <td style="text-align:right;">0.00</td>
      </tr>
      <tr>
        <td colspan="2" style="font-weight:bold;">BALANCE</td>
        <td style="text-align:right;font-weight:bold;">${formatCurrency(total)}</td>
      </tr>`;
  }

  // Customer phone line (only if exists)
  const phoneLine = data.customerPhone
    ? `<tr><td colspan="3">MOBILE: &nbsp;${escapeHtml(data.customerPhone)}</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt #${invoiceNum}</title>
<style>
  @page {
    size: 58mm auto;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    width: 48mm;
    padding: 4mm 2mm;
    color: #000;
  }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  .center { text-align: center; }
  .divider {
    border-top: 1px dashed #000;
    margin: 6px 0;
  }
  .shop-name {
    font-size: 13px;
    font-weight: bold;
    text-decoration: underline;
  }
  .section-title {
    text-align: center;
    font-size: 10px;
    padding: 4px 0 2px;
  }
  .total-row td {
    font-weight: bold;
    font-size: 12px;
    padding-top: 4px;
  }
  .footer {
    text-align: center;
    padding-top: 8px;
    font-size: 10px;
    font-style: italic;
  }
  .signature {
    padding-top: 20px;
    text-align: center;
  }
  .signature-line {
    display: inline-block;
    width: 70%;
    border-bottom: 1px solid #000;
    margin-bottom: 2px;
  }
  @media print {
    body { width: 48mm; }
  }
</style>
</head>
<body>
  <!-- Shop Header -->
  <div class="center">
    <div class="shop-name">${escapeHtml(data.shopName)}</div>
    ${data.shopAddress ? `<div>${escapeHtml(data.shopAddress)}</div>` : ''}
    ${data.shopContact ? `<div>${escapeHtml(data.shopContact)}</div>` : ''}
  </div>

  <div class="divider"></div>

  <!-- Invoice Info -->
  <table>
    <tr><td colspan="3">INV#: ${invoiceNum}</td></tr>
    <tr><td colspan="3">DATE: ${date}</td></tr>
    <tr><td colspan="3">TIME: ${time}</td></tr>
  </table>

  <div class="divider"></div>

  <!-- Customer Info -->
  <div class="section-title">CUSTOMER INFORMATION</div>
  <table>
    <tr><td colspan="3">NAME: &nbsp;${escapeHtml(customerName)}</td></tr>
    ${phoneLine}
  </table>

  <div class="divider"></div>

  <!-- Services -->
  <table>
    ${serviceLines}
  </table>

  <div class="divider"></div>

  <!-- Totals -->
  <table>
    <tr>
      <td colspan="2">${itemCount} &nbsp;Item(s)</td>
      <td></td>
    </tr>
    <tr>
      <td colspan="2">SUBTOTAL</td>
      <td style="text-align:right;">${formatCurrency(subtotal)}</td>
    </tr>
    <tr class="total-row">
      <td colspan="2">TOTAL</td>
      <td style="text-align:right;">${formatCurrency(total)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <!-- Payment -->
  <table>
    ${paymentSection}
  </table>

  <div class="divider"></div>

  <!-- Staff Signature -->
  <div class="signature">
    <div>Processed by:</div>
    <div style="padding-top:16px;">
      <span class="signature-line"></span>
    </div>
    <div style="font-size:9px;">(Staff Signature)</div>
  </div>

  <div class="divider"></div>

  <!-- Footer -->
  <div class="footer">
    Acknowledgement Receipt<br>
    <strong>Thank you!</strong>
  </div>
</body>
</html>`;
}

export function printReceipt(data: ReceiptData): void {
  const html = generateReceiptHtml(data);
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  if (iframe.contentWindow) {
    iframe.contentWindow.onafterprint = cleanup;
  }
  doc.open();
  doc.write(html);
  doc.close();
  // Print after brief delay to ensure content is rendered
  setTimeout(() => {
    iframe.contentWindow?.print();
    // Fallback cleanup if onafterprint doesn't fire (e.g. print cancelled)
    setTimeout(() => { if (iframe.parentNode) iframe.remove(); }, 5000);
  }, 100);
}
