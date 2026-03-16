import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface RevenueItem {
  day?: string;
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

interface FinanceTimelineItem {
  date: string;
  income: string;
  output: string;
  net: string;
}

interface FinanceMethodItem {
  payment_method: string;
  total: string;
}

interface FinanceTypeItem {
  income_type?: string;
  created_by__role__name?: string | null;
  total: string;
  count: number;
}

interface IncomeItem {
  id: number;
  charge_id: number;
  amount: string;
  payment_method: string;
  created_at: string;
  income_type: 'doctor' | 'treatment' | 'service';
  charge__patient__first_name: string;
  charge__patient__last_name: string;
  flow_from_role?: string;
  flow_to_role?: string;
  flow_to?: string;
}

interface OutputItem {
  id: number;
  source: 'accountant' | 'cash_register';
  description: string;
  category: string;
  amount: string;
  spent_at: string;
  created_by__username?: string | null;
  created_by__role__name?: string | null;
  flow_from_role?: string;
  flow_to_role?: string;
}

interface ReportsPayload {
  daily_revenue: RevenueItem[];
  debtors: DebtorItem[];
  finance?: {
    period?: 'daily' | 'monthly' | 'yearly' | 'custom' | 'window';
    date_from?: string;
    date_to?: string;
    days: number;
    income_total: string;
    output_total: string;
    net_total: string;
    timeline: FinanceTimelineItem[];
    payment_methods: FinanceMethodItem[];
    income_by_type?: FinanceTypeItem[];
    output_by_role?: FinanceTypeItem[];
    recent_income: IncomeItem[];
    recent_outputs: OutputItem[];
  };
}

const paymentMethodLabel: Record<string, string> = {
  cash: 'Naqd',
  card: 'Karta',
  transfer: "O'tkazma",
  insurance: "Sug'urta",
};

const incomeTypeLabel: Record<string, string> = {
  doctor: 'Shifokor qabuli',
  treatment: 'Davolash xonasi',
  service: 'Xizmat',
};

const roleLabel: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  registrator: 'Registrator',
  cashier: 'Kassir',
  doctor: 'Shifokor',
  lab_staff: 'Lab xodimi',
  treatment_staff: 'Davolash xodimi',
  patient: 'Bemor',
  clinic: 'Klinika',
  unknown: "Noma'lum",
};

export function Dashboard() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customDateFrom, setCustomDateFrom] = useState(todayIso);
  const [customDateTo, setCustomDateTo] = useState(todayIso);
  const [appliedCustomDateFrom, setAppliedCustomDateFrom] = useState(todayIso);
  const [appliedCustomDateTo, setAppliedCustomDateTo] = useState(todayIso);
  const [data, setData] = useState<ReportsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [showIncomeDetails, setShowIncomeDetails] = useState(false);
  const [showOutputDetails, setShowOutputDetails] = useState(false);

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
        setData(null);
        setError("Dashboard ma'lumotlarini yuklab bo'lmadi.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, appliedCustomDateFrom, appliedCustomDateTo]);

  const summary = useMemo(() => {
    const finance = data?.finance;
    return {
      income: Number(finance?.income_total || 0),
      output: Number(finance?.output_total || 0),
      net: Number(finance?.net_total || 0),
      debtors: data?.debtors?.length || 0,
    };
  }, [data]);

  const maxTimelineValue = useMemo(() => {
    const values = (data?.finance?.timeline || []).flatMap((x) => [Number(x.income || 0), Number(x.output || 0)]);
    return Math.max(...values, 1);
  }, [data]);

  const lineChart = useMemo(() => {
    const rows = data?.finance?.timeline || [];
    const chartWidth = 760;
    const chartHeight = 250;
    const leftPad = 14;
    const rightPad = 60;
    const topPad = 16;
    const bottomPad = 36;
    const innerWidth = chartWidth - leftPad - rightPad;
    const innerHeight = chartHeight - topPad - bottomPad;
    const safeMax = Math.max(maxTimelineValue, 1);

    const toY = (value: number) => topPad + innerHeight - (value / safeMax) * innerHeight;
    const toX = (index: number) => leftPad + (rows.length <= 1 ? innerWidth / 2 : (index / (rows.length - 1)) * innerWidth);

    const points = rows.map((row, index) => {
      const income = Number(row.income || 0);
      const output = Number(row.output || 0);
      const x = toX(index);
      return {
        key: row.date,
        x,
        incomeY: toY(income),
        outputY: toY(output),
        day: new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' }),
      };
    });

    const baseline = topPad + innerHeight;
    const incomeLine = points.map((p) => `${p.x},${p.incomeY}`).join(' ');
    const outputLine = points.map((p) => `${p.x},${p.outputY}`).join(' ');
    const incomeArea = points.length
      ? `M ${points[0].x} ${baseline} ${points.map((p) => `L ${p.x} ${p.incomeY}`).join(' ')} L ${points[points.length - 1].x} ${baseline} Z`
      : '';

    return {
      chartWidth,
      chartHeight,
      leftPad,
      rightPad,
      topPad,
      innerHeight,
      baseline,
      points,
      incomeLine,
      outputLine,
      incomeArea,
      axisLabels: [safeMax, Math.round(safeMax * 0.66), Math.round(safeMax * 0.33), 0],
    };
  }, [data, maxTimelineValue]);

  const methodTotal = useMemo(
    () => (data?.finance?.payment_methods || []).reduce((acc, row) => acc + Number(row.total || 0), 0),
    [data],
  );

  const pieGradient = useMemo(() => {
    const items = data?.finance?.payment_methods || [];
    const colors = ['#0d9488', '#2563eb', '#f59e0b', '#7c3aed', '#ef4444'];
    if (!items.length || methodTotal <= 0) {
      return 'conic-gradient(#e5e7eb 0 100%)';
    }
    let start = 0;
    const chunks: string[] = [];
    items.forEach((item, idx) => {
      const pct = (Number(item.total || 0) / methodTotal) * 100;
      const end = start + pct;
      chunks.push(`${colors[idx % colors.length]} ${start}% ${end}%`);
      start = end;
    });
    return `conic-gradient(${chunks.join(', ')})`;
  }, [data, methodTotal]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Boshqaruv paneli</h2>
          <p className="text-xs text-gray-500 sm:text-sm">Daromad, chiqim va oqimlar bo'yicha batafsil ko'rinish.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'daily', label: 'Kunlik' },
            { key: 'monthly', label: 'Oylik' },
            { key: 'yearly', label: 'Yillik' },
            { key: 'custom', label: 'Kalendar' },
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
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="min-w-[140px] rounded border px-2 py-1 text-xs"
              />
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="min-w-[140px] rounded border px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setAppliedCustomDateFrom(customDateFrom || todayIso);
                  setAppliedCustomDateTo(customDateTo || todayIso);
                }}
                className="rounded border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100"
              >
                Qo'llash
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Jami daromad</p>
          <p className="text-xl font-bold text-emerald-900">{summary.income.toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-700">Jami chiqim</p>
          <p className="text-xl font-bold text-rose-900">{summary.output.toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm text-teal-700">Sof natija</p>
          <p className="text-xl font-bold text-teal-900">{summary.net.toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">Qarzdorlar soni</p>
          <p className="text-xl font-bold text-amber-900">{summary.debtors}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow xl:col-span-2">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-900">Daromad va chiqim grafigi</h3>
            <button
              type="button"
              onClick={() => setShowDailyDetails((prev) => !prev)}
              className="rounded border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {showDailyDetails ? 'Batafsil yopish' : "Batafsil ko'rish"}
            </button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 sm:p-3">
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${lineChart.chartWidth} ${lineChart.chartHeight}`} className="h-52 min-w-[680px] w-full sm:h-60 sm:min-w-0">
              {[0, 1, 2, 3].map((i) => {
                const y = lineChart.topPad + (lineChart.innerHeight / 3) * i;
                return (
                  <line
                    key={i}
                    x1={lineChart.leftPad}
                    y1={y}
                    x2={lineChart.chartWidth - lineChart.rightPad}
                    y2={y}
                    stroke="#d1d5db"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {lineChart.incomeArea ? <path d={lineChart.incomeArea} fill="rgba(16,185,129,0.15)" /> : null}
              {lineChart.incomeLine ? <polyline points={lineChart.incomeLine} fill="none" stroke="#059669" strokeWidth="3" /> : null}
              {lineChart.outputLine ? <polyline points={lineChart.outputLine} fill="none" stroke="#dc2626" strokeWidth="3" /> : null}

              {lineChart.points.map((p) => (
                <g key={p.key}>
                  <circle cx={p.x} cy={p.incomeY} r="3" fill="#059669" />
                  <circle cx={p.x} cy={p.outputY} r="3" fill="#dc2626" />
                  <text x={p.x} y={lineChart.baseline + 18} textAnchor="middle" fontSize="10" fill="#6b7280">
                    {p.day}
                  </text>
                </g>
              ))}

              {lineChart.axisLabels.map((val, idx) => {
                const y = lineChart.topPad + (lineChart.innerHeight / 3) * idx + 4;
                return (
                  <text key={`${val}-${idx}`} x={lineChart.chartWidth - lineChart.rightPad + 8} y={y} fontSize="10" fill="#9ca3af">
                    {Number(val).toLocaleString()}
                  </text>
                );
              })}
              </svg>
            </div>
          </div>

          {showDailyDetails ? (
            <div className="mt-3 max-h-72 overflow-auto rounded border">
              <table className="min-w-[560px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Sana</th>
                    <th className="px-3 py-2 text-right text-emerald-700">Daromad</th>
                    <th className="px-3 py-2 text-right text-rose-700">Chiqim</th>
                    <th className="px-3 py-2 text-right text-teal-700">Sof</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data?.finance?.timeline || []).map((row) => (
                    <tr key={row.date}>
                      <td className="px-3 py-2">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right">{Number(row.income).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{Number(row.output).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium">{Number(row.net).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {loading ? <p className="mt-2 text-xs text-gray-500">Yuklanmoqda...</p> : null}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h3 className="mb-3 font-semibold text-gray-900">To'lov usullari diagrammasi</h3>
          <div className="mx-auto h-40 w-40 rounded-full" style={{ background: pieGradient }} />
          <div className="mt-4 space-y-2 text-sm">
            {(data?.finance?.payment_methods || []).map((row) => (
              <div key={row.payment_method} className="flex items-center justify-between rounded border px-2 py-1.5">
                <span className="truncate">{paymentMethodLabel[row.payment_method] || row.payment_method}</span>
                <span className="font-medium">{Number(row.total).toLocaleString()}</span>
              </div>
            ))}
            {(data?.finance?.payment_methods || []).length === 0 && !loading ? (
              <p className="text-gray-500">Ma'lumot yo'q.</p>
            ) : null}
          </div>

          <h4 className="mb-2 mt-4 text-sm font-semibold text-gray-800">Daromad turi</h4>
          <div className="space-y-2 text-xs">
            {(data?.finance?.income_by_type || []).map((row, idx) => (
              <div key={`${row.income_type || 'unknown'}-${idx}`} className="flex items-center justify-between rounded border px-2 py-1.5">
                <span>{incomeTypeLabel[row.income_type || ''] || row.income_type || "Noma'lum"}</span>
                <span>{Number(row.total).toLocaleString()} ({row.count})</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-900">Kirim oqimi</h3>
            <button
              type="button"
              onClick={() => setShowIncomeDetails((prev) => !prev)}
              className="rounded border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {showIncomeDetails ? 'Batafsil yopish' : "Batafsil ko'rish"}
            </button>
          </div>
          <div className="text-sm text-gray-600">
            So'nggi kirimlar soni: <span className="font-semibold text-gray-900">{data?.finance?.recent_income?.length || 0}</span>
          </div>
          {showIncomeDetails ? (
            <div className="mt-3 space-y-2 text-sm">
              {(data?.finance?.recent_income || []).map((row) => (
                <div key={row.id} className="rounded border px-3 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="font-medium text-gray-900 break-words">
                      {(row.charge__patient__first_name || '').trim()} {(row.charge__patient__last_name || '').trim()}
                    </p>
                    <p className="font-semibold text-emerald-700 sm:text-right">{Number(row.amount).toLocaleString()} so'm</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {roleLabel[row.flow_from_role || 'patient'] || row.flow_from_role || "Noma'lum"} {'->'} {roleLabel[row.flow_to_role || 'cashier'] || row.flow_to_role || "Noma'lum"} | {incomeTypeLabel[row.income_type] || row.income_type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {row.flow_to || '-'} | {paymentMethodLabel[row.payment_method] || row.payment_method} | {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {(data?.finance?.recent_income || []).length === 0 && !loading ? (
                <p className="text-gray-500">Kirimlar topilmadi.</p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-900">Chiqim oqimi</h3>
            <button
              type="button"
              onClick={() => setShowOutputDetails((prev) => !prev)}
              className="rounded border px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {showOutputDetails ? 'Batafsil yopish' : "Batafsil ko'rish"}
            </button>
          </div>
          <div className="text-sm text-gray-600">
            So'nggi chiqimlar soni: <span className="font-semibold text-gray-900">{data?.finance?.recent_outputs?.length || 0}</span>
          </div>
          {showOutputDetails ? (
            <div className="mt-3 space-y-2 text-sm">
              {(data?.finance?.recent_outputs || []).map((row) => (
                <div key={row.id} className="rounded border px-3 py-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{row.description}</p>
                      <p className="text-xs text-gray-500">{row.category || '-'} | {new Date(row.spent_at).toLocaleDateString()}</p>
                    </div>
                    <p className="font-semibold text-rose-700 sm:text-right">{Number(row.amount).toLocaleString()} so'm</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {roleLabel[row.flow_from_role || row.created_by__role__name || 'unknown'] || row.created_by__role__name || "Noma'lum"} {'->'} {roleLabel[row.flow_to_role || 'clinic'] || 'Klinika'}
                  </p>
                  {row.created_by__username ? <p className="text-xs text-gray-400">Foydalanuvchi: {row.created_by__username}</p> : null}
                </div>
              ))}
              {(data?.finance?.recent_outputs || []).length === 0 && !loading ? (
                <p className="text-gray-500">Chiqimlar topilmadi.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <h3 className="mb-3 font-semibold text-gray-900">So'nggi kunlar tushumi</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.daily_revenue || []).slice(0, 12).map((row, idx) => (
            <div key={`${row.day || 'day'}-${idx}`} className="rounded border px-3 py-2 text-sm">
              <p className="text-gray-500">{row.day ? new Date(row.day).toLocaleDateString() : '-'}</p>
              <p className="font-semibold text-gray-900">{Number(row.total).toLocaleString()} so'm</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
