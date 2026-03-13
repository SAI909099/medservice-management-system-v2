import React, { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { apiRequest } from '@/lib/api';

interface LedgerRow {
  patient_id: number;
  patient_name: string;
  charge_count: number;
  total_amount: string;
  paid_amount: string;
  debt_amount: string;
  status: 'unpaid' | 'partial' | 'paid' | 'prepaid';
  last_charge_at: string;
}

interface LedgerPrintRow {
  date: string;
  source: string;
  description: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

interface LedgerPrintPayload {
  patient_id: number;
  patient_name: string;
  total_amount: string;
  paid_amount: string;
  debt_amount: string;
  status: 'unpaid' | 'partial' | 'paid' | 'prepaid';
  rows: LedgerPrintRow[];
}

export function Billing() {
  const [rows, setRows] = useState<LedgerRow[]>([]);

  useEffect(() => {
    apiRequest<{ results: LedgerRow[] }>('/charges/patient-ledger/')
      .then((res) => setRows(res.results || []))
      .catch(() => setRows([]));
  }, []);

  const statusLabel: Record<string, string> = {
    unpaid: 'To‘lanmadi',
    partial: 'Qisman',
    paid: 'To‘landi',
    prepaid: "Oldindan to'langan",
  };

  const printLedger = async (patientId: number) => {
    const payload = await apiRequest<LedgerPrintPayload>(`/charges/patient-ledger/${patientId}/print/`);
    const statusText = statusLabel[payload.status] || payload.status;

    const printHtml = `
      <html>
      <head>
        <title>Billing - ${payload.patient_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { margin-bottom: 8px; }
          p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f7f7f7; text-align: left; }
        </style>
      </head>
      <body>
        <h2>Bemor billing varaqasi</h2>
        <p><strong>Bemor:</strong> ${payload.patient_name}</p>
        <p><strong>Holat:</strong> ${statusText}</p>
        <p><strong>Jami:</strong> ${Number(payload.total_amount).toLocaleString()} so'm</p>
        <p><strong>To'langan:</strong> ${Number(payload.paid_amount).toLocaleString()} so'm</p>
        <p><strong>Qarz:</strong> ${Number(payload.debt_amount).toLocaleString()} so'm</p>
        <table>
          <thead>
            <tr>
              <th>Sana</th>
              <th>Manba</th>
              <th>Xizmat</th>
              <th>Soni</th>
              <th>Narxi</th>
              <th>Jami</th>
            </tr>
          </thead>
          <tbody>
            ${payload.rows
              .map(
                (r) => `
              <tr>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>${r.source}</td>
                <td>${r.description}</td>
                <td>${r.quantity}</td>
                <td>${Number(r.unit_price).toLocaleString()} so'm</td>
                <td>${Number(r.total_price).toLocaleString()} so'm</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const popup = window.open('', '_blank', 'width=1100,height=800');
    if (!popup) return;
    popup.document.write(printHtml);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Bemorlar bo'yicha billing
          </h2>
          <p className="mt-1 text-sm text-gray-500">Har bir bemor uchun umumiy xizmatlar bitta qatorda jamlanadi.</p>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Bemor</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Xizmatlar soni</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Umumiy summa</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">To'landi</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Qarz</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Holat</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Oxirgi sana</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Print</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rows.map((row) => (
                    <tr key={row.patient_id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{row.patient_name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{row.charge_count}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{Number(row.total_amount).toLocaleString()} so'm</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600 font-medium">{Number(row.paid_amount).toLocaleString()} so'm</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 font-medium">
                        {Number(row.debt_amount).toLocaleString()} so'm
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          row.status === 'paid' ? 'bg-green-100 text-green-800' :
                          row.status === 'prepaid' ? 'bg-cyan-100 text-cyan-800' :
                          row.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {statusLabel[row.status] || row.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(row.last_charge_at).toLocaleDateString()}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => printLedger(row.patient_id)} className="text-gray-400 hover:text-gray-600">
                          <Printer className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
