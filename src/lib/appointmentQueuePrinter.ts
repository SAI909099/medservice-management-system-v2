export interface AppointmentQueuePrintItem {
  queue_number: string;
  patient_name: string;
  doctor_name: string;
  amount?: number;
  birth_year?: number | null;
}

export interface ServiceQueueTicketPrintItem {
  id: number;
  service_name: string;
  queue_code: string;
  queue_date: string;
  patient_name: string;
  birth_year?: number | null;
  status?: string;
}

export interface CombinedReceiptData {
  doctor_queue?: AppointmentQueuePrintItem;
  service_tickets?: ServiceQueueTicketPrintItem[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildDoctorQueueSection(item: AppointmentQueuePrintItem): string {
  const amountStr = item.amount ? `${Number(item.amount).toLocaleString()} so'm` : '-';
  return `
    <div class="receipt-section">
      <div class="center bold" style="font-size:13px;">Medservice</div>
      <div class="center">Doktor qabuli</div>
      <div class="line"></div>
      <div class="queue-hero">${escapeHtml(item.queue_number)}</div>
      <div class="meta">
        <div class="meta-row"><span class="bold">Bemor:</span><span>${escapeHtml(item.patient_name || '-')}</span></div>
        <div class="meta-row"><span class="bold">Tug'ilgan yil:</span><span>${item.birth_year || '-'}</span></div>
        <div class="meta-row"><span class="bold">Doktor:</span><span>${escapeHtml(item.doctor_name || '-')}</span></div>
        <div class="meta-row"><span class="bold">Summa:</span><span>${amountStr}</span></div>
      </div>
      <div class="line"></div>
    </div>
  `;
}

function buildServiceQueueSection(items: ServiceQueueTicketPrintItem[]): string {
  if (!items.length) return '';
  return `
    <div class="receipt-section">
      <div class="center bold" style="font-size:13px;">Medservice</div>
      <div class="center">Xizmat navbati</div>
      <div class="line"></div>
      ${items
        .map(
          (item) => `
            <div class="ticket">
              <div class="queue-hero">${escapeHtml(item.queue_code)}</div>
              <div class="meta">
                <div class="meta-row"><span class="bold">Bemor:</span><span>${escapeHtml(item.patient_name || '-')}</span></div>
                <div class="meta-row"><span class="bold">Tug'ilgan yil:</span><span>${item.birth_year || '-'}</span></div>
                <div class="meta-row"><span class="bold">Xizmat:</span><span>${escapeHtml(item.service_name || '-')}</span></div>
                <div class="meta-row"><span class="bold">Sana:</span><span>${escapeHtml(item.queue_date || '-')}</span></div>
              </div>
            </div>
          `,
        )
        .join('')}
      <div class="line"></div>
    </div>
  `;
}

function buildCombinedReceiptHtml(data: CombinedReceiptData): string {
  const printedAt = new Date().toLocaleString();
  const hasDoctor = !!data.doctor_queue?.queue_number;
  const hasServices = (data.service_tickets?.length ?? 0) > 0;

  const doctorSection = hasDoctor ? buildDoctorQueueSection(data.doctor_queue!) : '';
  const serviceSection = hasServices ? buildServiceQueueSection(data.service_tickets!) : '';

  return `
    <html>
      <head>
        <title>Navbat cheki</title>
        <style>
          @page { size: 58mm auto; margin: 3mm; }
          body { width: 52mm; margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 11px; color: #111; }
          .line { border-top: 1px dashed #000; margin: 4px 0; }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .queue-hero {
            text-align: center;
            font-size: 42px;
            line-height: 1.1;
            font-weight: 800;
            letter-spacing: 1px;
            margin: 6px 0 8px;
          }
          .meta { font-size: 10px; line-height: 1.4; }
          .meta-row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
          .ticket { padding: 2px 0; }
          .ticket + .ticket { margin-top: 6px; border-top: 1px dashed #000; padding-top: 6px; }
          .receipt-section + .receipt-section { margin-top: 10px; border-top: 2px dashed #000; padding-top: 10px; }
          .print-btn-wrap { margin-top: 6px; text-align: center; }
          @media print {
            .print-btn-wrap { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${doctorSection}
        ${serviceSection}
        <div class="center" style="font-size:9px; color:#666;">Chop etildi: ${escapeHtml(printedAt)}</div>
        <div class="center">Rahmat</div>
        <div class="print-btn-wrap">
          <button onclick="window.print()" style="font-size:12px; padding:4px 10px;">Print</button>
        </div>
        <script>
          function triggerPrint() {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 450);
          }
          if (document.readyState === 'complete') {
            triggerPrint();
          } else {
            window.addEventListener('load', triggerPrint);
          }
        </script>
      </body>
    </html>
  `;
}

export function printAppointmentQueue(item: AppointmentQueuePrintItem): boolean {
  if (!item.queue_number) return false;
  const popup = window.open('', '_blank', 'width=360,height=640');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildCombinedReceiptHtml({ doctor_queue: item }));
  popup.document.close();
  return true;
}

export function printServiceQueueTickets(items: ServiceQueueTicketPrintItem[]): boolean {
  if (!items.length) return false;
  const popup = window.open('', '_blank', 'width=360,height=640');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildCombinedReceiptHtml({ service_tickets: items }));
  popup.document.close();
  return true;
}

export function printCombinedReceipt(data: CombinedReceiptData): boolean {
  const hasDoctor = !!data.doctor_queue?.queue_number;
  const hasServices = (data.service_tickets?.length ?? 0) > 0;
  if (!hasDoctor && !hasServices) return false;

  const popup = window.open('', '_blank', 'width=360,height=640');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildCombinedReceiptHtml(data));
  popup.document.close();
  return true;
}