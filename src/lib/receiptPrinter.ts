export interface ReceiptPaymentAllocation {
  payment_id: number;
  receipt_no: string;
  applied_amount: string;
  charge_id: number;
  charge_source: 'qabul' | 'yotoq' | 'boshqa' | string;
  charge_date: string;
}

export interface PaymentApplyResponse {
  patient_id: number;
  patient_name: string;
  clinic_name?: string;
  branch_name?: string;
  entered_amount: string;
  applied_amount: string;
  debt_before: string;
  debt_after: string;
  advance_amount: string;
  payments: ReceiptPaymentAllocation[];
}

interface PrintReceiptOptions {
  paymentMethod: 'cash' | 'card' | 'transfer' | 'insurance';
  note?: string;
  cashierName?: string;
}

const sourceLabel: Record<string, string> = {
  qabul: 'Qabul',
  yotoq: "Yotoq to'lovi",
  boshqa: 'Boshqa',
};

const methodLabel: Record<string, string> = {
  cash: 'Naqd',
  card: 'Karta',
  transfer: "O'tkazma",
  insurance: "Sug'urta",
};

function money(value: string | number): string {
  return `${Number(value || 0).toLocaleString()} so'm`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildReceiptHtml(payload: PaymentApplyResponse, options: PrintReceiptOptions): string {
  const printedAt = new Date().toLocaleString();
  const receipts = payload.payments.map((item) => item.receipt_no).join(', ') || '-';
  const clinic = payload.clinic_name || 'Medservise';
  const branch = payload.branch_name || '-';
  const cashier = options.cashierName || '-';
  const note = options.note?.trim() || '-';

  return `
    <html>
      <head>
        <title>Receipt ${escapeHtml(payload.patient_name || '')}</title>
        <style>
          @page { size: 58mm auto; margin: 3mm; }
          body { width: 52mm; margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 11px; color: #111; }
          .line { border-top: 1px dashed #000; margin: 4px 0; }
          .center { text-align: center; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .muted { color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th, td { text-align: left; font-size: 10px; padding: 2px 0; vertical-align: top; }
          th:last-child, td:last-child { text-align: right; }
          .bold { font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="center bold">${escapeHtml(clinic)}</div>
        <div class="center muted">${escapeHtml(branch)}</div>
        <div class="line"></div>
        <div class="row"><span>Receipt:</span><span>${escapeHtml(receipts)}</span></div>
        <div class="row"><span>Sana:</span><span>${escapeHtml(printedAt)}</span></div>
        <div class="row"><span>Bemor:</span><span>${escapeHtml(payload.patient_name || '-')}</span></div>
        <div class="row"><span>Kassir:</span><span>${escapeHtml(cashier)}</span></div>
        <div class="row"><span>Usul:</span><span>${escapeHtml(methodLabel[options.paymentMethod] || options.paymentMethod)}</span></div>
        <div class="line"></div>
        <div class="row"><span>To'lov:</span><span class="bold">${money(payload.applied_amount)}</span></div>
        <div class="row"><span>Qarz oldin:</span><span>${money(payload.debt_before)}</span></div>
        <div class="row"><span>Qarz keyin:</span><span>${money(Math.max(Number(payload.debt_after || 0), 0))}</span></div>
        <div class="row"><span>Oldindan:</span><span>${money(payload.advance_amount)}</span></div>
        <div class="line"></div>
        <div class="bold">Taqsimot:</div>
        <table>
          <thead>
            <tr><th>Manba</th><th>Sana</th><th>Summa</th></tr>
          </thead>
          <tbody>
            ${payload.payments
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(sourceLabel[item.charge_source] || item.charge_source)}</td>
                    <td>${escapeHtml(item.charge_date || '-')}</td>
                    <td>${money(item.applied_amount)}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
        <div class="line"></div>
        <div><span class="muted">Izoh:</span> ${escapeHtml(note)}</div>
        <div class="center muted" style="margin-top:4px;">Rahmat!</div>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>
      </body>
    </html>
  `;
}

export function printPaymentReceipt(payload: PaymentApplyResponse, options: PrintReceiptOptions): boolean {
  const popup = window.open('', '_blank', 'width=360,height=640');
  if (!popup) {
    return false;
  }
  popup.document.open();
  popup.document.write(buildReceiptHtml(payload, options));
  popup.document.close();
  return true;
}

export function openReceiptPrintWindow(): Window | null {
  return window.open('', '_blank', 'width=360,height=640');
}

export function printPaymentReceiptToWindow(
  popup: Window | null,
  payload: PaymentApplyResponse,
  options: PrintReceiptOptions,
): boolean {
  if (!popup) {
    return false;
  }
  popup.document.open();
  popup.document.write(buildReceiptHtml(payload, options));
  popup.document.close();
  return true;
}
