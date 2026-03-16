import React, { useEffect, useMemo, useState } from 'react';
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
  finance?: {
    period?: 'daily' | 'monthly' | 'yearly' | 'custom' | 'window';
    date_from?: string;
    date_to?: string;
    income_total: string;
    output_total: string;
    net_total: string;
    timeline: Array<{
      date: string;
      income: string;
      output: string;
      net: string;
    }>;
  };
}

export function Reports() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customDateFrom, setCustomDateFrom] = useState(todayIso);
  const [customDateTo, setCustomDateTo] = useState(todayIso);
  const [appliedCustomDateFrom, setAppliedCustomDateFrom] = useState(todayIso);
  const [appliedCustomDateTo, setAppliedCustomDateTo] = useState(todayIso);
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('period', period);
        if (period === 'custom') {
          params.set('date_from', appliedCustomDateFrom);
          params.set('date_to', appliedCustomDateTo);
        }
        const res = await apiRequest<ReportsPayload>(`/reports/?${params.toString()}`);
        setData(res);
      } catch {
        setData({ daily_revenue: [], monthly_revenue: [], debtors: [] });
        setError("Hisobot ma'lumotlarini yuklab bo'lmadi.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, appliedCustomDateFrom, appliedCustomDateTo]);

  const periodLabel = useMemo(() => {
    if (period === 'daily') return 'Kunlik';
    if (period === 'monthly') return 'Oylik';
    if (period === 'yearly') return 'Yillik';
    if (period === 'custom') return `${appliedCustomDateFrom} - ${appliedCustomDateTo}`;
    return '';
  }, [period, appliedCustomDateFrom, appliedCustomDateTo]);

  const timelineRows = data?.finance?.timeline || [];

  const exportExcel = () => {
    const rows = [
      ['Sana', 'Daromad', 'Chiqim', 'Sof'],
      ...timelineRows.map((row) => [
        new Date(row.date).toLocaleDateString(),
        String(row.income),
        String(row.output),
        String(row.net),
      ]),
    ];
    const csv = rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildPrintableHtml = () => {
    const rows = timelineRows
      .map(
        (row) =>
          `<tr><td>${new Date(row.date).toLocaleDateString()}</td><td>${Number(row.income).toLocaleString()}</td><td>${Number(row.output).toLocaleString()}</td><td>${Number(row.net).toLocaleString()}</td></tr>`
      )
      .join('');
    return `
      <html>
        <head>
          <title>Hisobot - ${periodLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { color: #555; margin-top: 0; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; }
            .summary { display: flex; gap: 24px; margin-top: 12px; font-size: 13px; }
            .summary strong { display: block; font-size: 16px; color: #111827; }
          </style>
        </head>
        <body>
          <h1>Hisobot</h1>
          <p>Filter: ${periodLabel}</p>
          <div class="summary">
            <div>Jami daromad<strong>${Number(data?.finance?.income_total || 0).toLocaleString()} so'm</strong></div>
            <div>Jami chiqim<strong>${Number(data?.finance?.output_total || 0).toLocaleString()} so'm</strong></div>
            <div>Sof natija<strong>${Number(data?.finance?.net_total || 0).toLocaleString()} so'm</strong></div>
          </div>
          <table>
            <thead><tr><th>Sana</th><th>Daromad</th><th>Chiqim</th><th>Sof</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4">Maʼlumot yoʼq</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `;
  };

  const openPrintWindow = (title: string) => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(buildPrintableHtml().replace('<title>Hisobot', `<title>${title}`));
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const exportPdf = () => {
    openPrintWindow('Hisobot PDF');
  };

  const printReport = () => {
    openPrintWindow('Hisobot print');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hisobotlar</h2>
          <p className="text-sm text-gray-500">Filter, jadval va eksport (Excel/PDF/Print).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportExcel} className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100">Excel</button>
          <button type="button" onClick={exportPdf} className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100">PDF</button>
          <button type="button" onClick={printReport} className="rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">Print</button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'daily', label: 'Kunlik' },
            { key: 'monthly', label: 'Oylik' },
            { key: 'yearly', label: 'Yillik' },
            { key: 'custom', label: 'Sana oralig‘i' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key as 'daily' | 'monthly' | 'yearly' | 'custom')}
              className={`rounded-full px-3 py-1 text-xs font-medium ${period === item.key ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {item.label}
            </button>
          ))}
          {period === 'custom' ? (
            <>
              <input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} className="rounded border px-2 py-1 text-xs" />
              <input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} className="rounded border px-2 py-1 text-xs" />
              <button
                type="button"
                onClick={() => {
                  setAppliedCustomDateFrom(customDateFrom || todayIso);
                  setAppliedCustomDateTo(customDateTo || todayIso);
                }}
                className="rounded border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100"
              >
                Qo‘llash
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Jami daromad</p>
          <p className="text-2xl font-bold text-emerald-900">{Number(data?.finance?.income_total || 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">Jami chiqim</p>
          <p className="text-2xl font-bold text-rose-900">{Number(data?.finance?.output_total || 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm text-teal-700">Sof natija</p>
          <p className="text-2xl font-bold text-teal-900">{Number(data?.finance?.net_total || 0).toLocaleString()} so'm</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="font-semibold">Hisobot jadvali ({periodLabel})</h3>
          {loading ? <span className="text-xs text-gray-500">Yuklanmoqda...</span> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Sana</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Daromad</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Chiqim</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Sof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {timelineRows.map((row) => (
                <tr key={row.date}>
                  <td className="px-4 py-3 text-gray-700">{new Date(row.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{Number(row.income).toLocaleString()} so'm</td>
                  <td className="px-4 py-3 text-right text-gray-700">{Number(row.output).toLocaleString()} so'm</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{Number(row.net).toLocaleString()} so'm</td>
                </tr>
              ))}
              {!loading && timelineRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-gray-500" colSpan={4}>Ma'lumot topilmadi.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold">Kunlik tushum</div>
          <div className="p-4 space-y-2 text-sm max-h-72 overflow-y-auto">
            {(data?.daily_revenue || []).map((item, idx) => (
              <div key={idx} className="flex justify-between"><span>{item.day ? new Date(item.day).toLocaleDateString() : '-'}</span><span>{Number(item.total).toLocaleString()} UZS</span></div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="px-4 py-3 border-b border-gray-200 font-semibold">Oylik tushum</div>
          <div className="p-4 space-y-2 text-sm max-h-72 overflow-y-auto">
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
