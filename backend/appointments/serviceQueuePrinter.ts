export interface ServiceQueueTicketPrintItem {
  id: number;
  service_name: string;
  queue_code: string;
  queue_date: string;
  patient_name: string;
  birth_year?: number | null;
  status?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildQueueTicketHtml(items: ServiceQueueTicketPrintItem[]): string {
  const printedAt = new Date().toLocaleString();
  return `
    <html>
      <head>
        <title>Service Queue Ticket</title>
        <style>
          @page { size: 58mm auto; margin: 3mm; }
          body { width: 52mm; margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 11px; color: #111; }
          .line { border-top: 1px dashed #000; margin: 4px 0; }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .ticket { padding: 2px 0; }
          .ticket + .ticket { margin-top: 6px; border-top: 1px dashed #000; padding-top: 6px; }
          .queue-hero {
            text-align: center;
            font-size: 48px;
            line-height: 1;
            font-weight: 800;
            letter-spacing: 1.5px;
            margin: 4px 0 6px;
          }
          .meta { font-size: 10px; line-height: 1.3; }
          .meta-row { display: flex; justify-content: space-between; gap: 8px; margin: 1px 0; }
          .print-btn-wrap { margin-top: 6px; text-align: center; }
          @media print {
            .print-btn-wrap { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="center bold">Medservise</div>
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
                  <div class="meta-row"><span class="bold">Chop etildi:</span><span>${escapeHtml(printedAt)}</span></div>
                </div>
              </div>
            `,
          )
          .join('')}
        <div class="line"></div>
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

export function printServiceQueueTickets(items: ServiceQueueTicketPrintItem[]): boolean {
  if (!items.length) return false;
  const popup = window.open('', '_blank', 'width=360,height=640');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildQueueTicketHtml(items));
  popup.document.close();
  return true;
}
