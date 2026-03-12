import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface RevenueItem {
  day?: string;
  month?: string;
  total: string;
}

interface DebtorItem {
  id: number;
  patient__first_name: string;
  patient__last_name: string;
  total_amount: string;
  paid_amount: string;
  status: string;
}

interface ReportsPayload {
  daily_revenue: RevenueItem[];
  monthly_revenue: RevenueItem[];
  debtors: DebtorItem[];
}

export function Reports() {
  const [data, setData] = useState<ReportsPayload | null>(null);

  useEffect(() => {
    apiRequest<ReportsPayload>('/reports/')
      .then(setData)
      .catch(() => setData({ daily_revenue: [], monthly_revenue: [], debtors: [] }));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hisobotlar</h2>
        <p className="text-sm text-gray-500">Kunlik/oylik tushum va qarzdorlar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold">Kunlik tushum</div>
          <div className="p-4 space-y-2 text-sm">
            {(data?.daily_revenue || []).map((item, idx) => (
              <div key={idx} className="flex justify-between"><span>{item.day ? new Date(item.day).toLocaleDateString() : '-'}</span><span>{Number(item.total).toLocaleString()} UZS</span></div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold">Oylik tushum</div>
          <div className="p-4 space-y-2 text-sm">
            {(data?.monthly_revenue || []).map((item, idx) => (
              <div key={idx} className="flex justify-between"><span>{item.month ? new Date(item.month).toLocaleDateString() : '-'}</span><span>{Number(item.total).toLocaleString()} UZS</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="px-4 py-3 border-b border-gray-200 font-semibold">Qarzdor bemorlar</div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Charge</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bemor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Jami</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">To‘langan</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Holat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {(data?.debtors || []).map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 text-sm text-gray-900">#{d.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{d.patient__first_name} {d.patient__last_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{Number(d.total_amount).toLocaleString()} UZS</td>
                <td className="px-4 py-3 text-sm text-gray-600">{Number(d.paid_amount).toLocaleString()} UZS</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {d.status === 'unpaid' ? 'To‘lanmagan' : d.status === 'partial' ? 'Qisman to‘langan' : d.status === 'paid' ? 'To‘langan' : d.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
