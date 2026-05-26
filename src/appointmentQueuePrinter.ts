export interface AppointmentQueuePrintItem {
  queue_number: string;
  patient_name: string;
  doctor_name: string;
  amount?: number;
  birth_year?: number | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039');
}

function buildAppointmentQueueHtml(item: AppointmentQueuePrintItem): string {
  const printedAt = new Date().toLocaleString();
  const amountStr = item.amount ? `${Number(item.amount).toLocaleString()} so'm` : '-';
  
  return `
    <html>
      <head>
        <title>Doktor Qabulu Navbati</title>
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
          .print-btn-wrap { margin-top: 6px; text-align: center; }
          @media print {
            .print-btn-wrap { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:13px;">Medservice</div>
        <div class="center">Doktor qabulu</div>
        <div class="line"></div>
        <div class="queue-hero">${escapeHtml(item.queue_number)}</div>
        <div class="meta">
          <div class="meta-row"><span class="bold">Bemor:</span><span>${escapeHtml(item.patient_name || '-')}</span></div>
          <div class="meta-row"><span class="bold">Tug'ilgan yil:</span><span>${item.birth_year || '-'}</span></div>
          <div class="meta-row"><span class="bold">Doktor:</span><span>${escapeHtml(item.doctor_name || '-')}</span></div>
          <div class="meta-row"><span class="bold">Summa:</span><span>${amountStr}</span></div>
          <div class="meta-row"><span class="bold">Sana:</span><span>${printedAt}</span></div>
        </div>
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

export function printAppointmentQueue(item: AppointmentQueuePrintItem): boolean {
  if (!item.queue_number) return false;
  const popup = window.open('', '_blank', 'width=360,height=640');
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildAppointmentQueueHtml(item));
  popup.document.close();
  return true;
}