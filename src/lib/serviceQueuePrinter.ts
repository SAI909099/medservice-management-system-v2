export interface ServiceQueueTicketPrintItem {
  id: number;
  service_name: string;
  queue_code: string;
  queue_date: string;
  patient_name: string;
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
  const patient = items[0]?.patient_name || '-';
  return `
    <html>
      <head>
        <title>Service Queue Ticket</title>
        <style>
          @page { size: 58mm auto; margin: 3mm; }
          body { width: 52mm; margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 12px; color: #111; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th, td { text-align: left; font-size: 11px; padding: 2px 0; }
          th:last-child, td:last-child { text-align: right; }
        </style>
      </head>
      <body>
        <div class="center bold">Medservise</div>
        <div class="center">Xizmat navbati</div>
        <div class="line"></div>
        <div><span class="bold">Bemor:</span> ${escapeHtml(patient)}</div>
        <div><span class="bold">Sana:</span> ${escapeHtml(printedAt)}</div>
        <div class="line"></div>
        <table>
          <thead>
            <tr><th>Xizmat</th><th>Navbat</th></tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
                  <tr>
                    <td>${escapeHtml(item.service_name)}</td>
                    <td>${escapeHtml(item.queue_code)}</td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
        <div class="line"></div>
        <div class="center">Rahmat</div>
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

export function printServiceQueueTickets(items: ServiceQueueTicketPrintItem[]): boolean {
  if (!items.length) return false;
  const popup = window.open('', '_blank', 'width=360,height=640');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildQueueTicketHtml(items));
  popup.document.close();
  return true;
}
