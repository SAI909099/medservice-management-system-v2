import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface TimelineRow {
  date: string;
  income: string;
  output: string;
  net: string;
}

interface MethodRow {
  payment_method: string;
  total: string;
}

interface IncomeRow {
  id: number;
  charge_id: number;
  amount: string;
  payment_method: string;
  created_at: string;
  income_type: 'doctor' | 'treatment' | 'service';
  charge__notes: string;
  charge__patient__first_name: string;
  charge__patient__last_name: string;
}

interface OutputRow {
  id: number;
  source: 'accountant' | 'cash_register';
  description: string;
  category: string;
  note: string;
  amount: string;
  spent_at: string;
  created_by__username: string;
  created_by__role__name: string;
}

interface FinancePayload {
  days: number;
  income_total: string;
  output_total: string;
  net_total: string;
  timeline: TimelineRow[];
  payment_methods: MethodRow[];
  recent_income: IncomeRow[];
  recent_outputs: OutputRow[];
  recent_income_pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  recent_outputs_pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

interface Doctor {
  id: number;
  user_full_name: string;
}

interface ReferringDoctor {
  id: number;
  full_name: string;
  clinic_name: string;
}

const methodLabel: Record<string, string> = {
  cash: 'Naqd',
  card: 'Karta',
  transfer: "O'tkazma",
  insurance: "Sug'urta",
};

const incomeTypeLabel: Record<string, string> = {
  doctor: "Shifokor to'lovi",
  treatment: "Yotoq/davolash to'lovi",
  service: "Xizmat to'lovi",
};

const methodColor: string[] = ['#0d9488', '#2563eb', '#ea580c', '#7c3aed', '#0891b2'];
const expenseCategories = [
  "Komunal to'lov",
  'Ijara',
  'Oylik',
  "Jihoz xaridi",
  'Dori-darmon',
  'Transport',
  'Shifokor bonusi',
  'Boshqa',
] as const;

const paymentMethods = ['cash', 'card', 'transfer'] as const;

export function Accountant() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly' | 'custom'>('monthly');
  const [customDateFrom, setCustomDateFrom] = useState(todayIso);
  const [customDateTo, setCustomDateTo] = useState(todayIso);
  const [appliedCustomDateFrom, setAppliedCustomDateFrom] = useState(todayIso);
  const [appliedCustomDateTo, setAppliedCustomDateTo] = useState(todayIso);
  const [incomePage, setIncomePage] = useState(1);
  const [outputPage, setOutputPage] = useState(1);
  const [data, setData] = useState<FinancePayload | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [referringDoctors, setReferringDoctors] = useState<ReferringDoctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({ full_name: '', phone: '', clinic_name: '' });
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: expenseCategories[0],
    customCategory: '',
    note: '',
    amount: '',
    spent_at: new Date().toISOString().slice(0, 10),
    doctor_id: '',
    payment_method: 'cash',
  });

  useEffect(() => {
    async function loadDoctors() {
      try {
        const doctorsRes = await apiRequest<{ results: Doctor[] }>('/doctors/simple_list/');
        console.log('Doctors response:', doctorsRes);
        if (doctorsRes?.results) {
          setDoctors(doctorsRes.results);
        } else if (Array.isArray(doctorsRes)) {
          setDoctors(doctorsRes);
        } else {
          setDoctors([]);
        }
        
        const refDoctorsRes = await apiRequest<{ results: ReferringDoctor[] }>('/referring-doctors/');
        console.log('Referring doctors response:', refDoctorsRes);
        if (refDoctorsRes?.results) {
          setReferringDoctors(refDoctorsRes.results);
        } else if (Array.isArray(refDoctorsRes)) {
          setReferringDoctors(refDoctorsRes);
        } else {
          setReferringDoctors([]);
        }
      } catch (e) {
        console.error('Error loading doctors:', e);
        setDoctors([]);
        setReferringDoctors([]);
      }
    }
    loadDoctors();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (period === 'custom') {
        params.set('date_from', appliedCustomDateFrom);
        params.set('date_to', appliedCustomDateTo);
      }
      params.set('income_page', String(incomePage));
      params.set('income_page_size', '10');
      params.set('output_page', String(outputPage));
      params.set('output_page_size', '10');
      const res = await apiRequest<FinancePayload>(`/report-expenses/finance-overview/?${params.toString()}`);
      setData(res);
    } catch {
      setData(null);
      setMessage("Buxgalteriya ma'lumotlarini yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, appliedCustomDateFrom, appliedCustomDateTo, incomePage, outputPage]);

  useEffect(() => {
    setIncomePage(1);
    setOutputPage(1);
  }, [period, appliedCustomDateFrom, appliedCustomDateTo]);

  const periodLabel = useMemo(() => {
    if (period === 'daily') return 'kunlik';
    if (period === 'monthly') return 'oylik';
    if (period === 'yearly') return 'yillik';
    if (period === 'custom') return `${appliedCustomDateFrom} - ${appliedCustomDateTo}`;
    return '';
  }, [period, appliedCustomDateFrom, appliedCustomDateTo]);

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      if (expenseForm.category === 'Shifokor bonusi' && bulkMode) {
        const internalCount = doctors.length;
        const externalCount = referringDoctors.length;
        const totalCount = internalCount + externalCount;
        if (totalCount === 0) {
          setMessage("Shifokor topilmadi.");
          return;
        }
        const doctorList = doctors.map(d => `i:${d.id}`).join(', ');
        const refList = referringDoctors.map(r => `r:${r.id}`).join(', ');
        const note = `Jami ${totalCount} ta shifokor (${internalCount} ichki, ${externalCount} tashqi). ${expenseForm.note.trim() ? '\n' + expenseForm.note.trim() : ''}\nShifokorlar: ${doctorList}${refList ? '; ' + refList : ''}`;
        await apiRequest('/report-expenses/', {
          method: 'POST',
          body: JSON.stringify({
            source: 'accountant',
            description: `Shifokorlar bonusi (${totalCount} kishi)`,
            category: 'Shifokor bonusi',
            note: note,
            amount: expenseForm.amount,
            spent_at: expenseForm.spent_at,
          }),
        });
        setMessage(`${totalCount} ta shifokorga jami ${Number(expenseForm.amount).toLocaleString()} so'm bonus ajratildi.`);
      } else {
        const payload: Record<string, string> = {
          source: 'accountant',
          description: expenseForm.description.trim() || 'Chiqim',
          category: expenseForm.category === 'Boshqa' ? expenseForm.customCategory.trim() : expenseForm.category,
          note: expenseForm.note.trim(),
          amount: expenseForm.amount,
          spent_at: expenseForm.spent_at,
        };
        if (expenseForm.category === 'Shifokor bonusi' && expenseForm.doctor_id) {
          const [type, id] = expenseForm.doctor_id.split(':');
          if (type === 'i') {
            const doc = doctors.find(d => String(d.id) === id);
            payload.description = `Bonusi: ${doc?.user_full_name || 'Shifokor'}`;
            payload.note = (expenseForm.note.trim() ? expenseForm.note.trim() + '\n' : '') + `doctor_id:i:${id}`;
          } else {
            const ref = referringDoctors.find(r => String(r.id) === id);
            payload.description = `Bonusi: ${ref?.full_name || 'Shifokor'}`;
            payload.note = (expenseForm.note.trim() ? expenseForm.note.trim() + '\n' : '') + `doctor_id:r:${id}`;
          }
        }
        await apiRequest('/report-expenses/', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setMessage("Chiqim saqlandi.");
      }
      setExpenseForm({
        description: '',
        category: expenseCategories[0],
        customCategory: '',
        note: '',
        amount: '',
        spent_at: new Date().toISOString().slice(0, 10),
        doctor_id: '',
        payment_method: 'cash',
      });
      await loadData();
    } catch (err) {
      setMessage("Chiqimni saqlashda xatolik.");
      console.error(err);
    }
  };

  const addReferringDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.full_name.trim()) {
      setMessage("Shifokor ismi kiritilishi shart.");
      return;
    }
    try {
      await apiRequest('/referring-doctors/', {
        method: 'POST',
        body: JSON.stringify({
          full_name: newDoctor.full_name.trim(),
          phone: newDoctor.phone.trim(),
          clinic_name: newDoctor.clinic_name.trim(),
        }),
      });
      setNewDoctor({ full_name: '', phone: '', clinic_name: '' });
      setShowAddDoctor(false);
      setMessage("Tashqi shifokor qo'shildi.");
      const res = await apiRequest<{ results: ReferringDoctor[] }>('/referring-doctors/');
      setReferringDoctors(Array.isArray(res?.results) ? res.results : []);
    } catch {
      setMessage("Shifokor qo'shishda xatolik.");
    }
  };

  const maxValue = useMemo(() => {
    const values = (data?.timeline || []).flatMap((x) => [Number(x.income || 0), Number(x.output || 0)]);
    return Math.max(...values, 1);
  }, [data]);

  const lineChart = useMemo(() => {
    const rows = data?.timeline || [];
    const chartWidth = 760;
    const chartHeight = 220;
    const leftPad = 14;
    const rightPad = 58;
    const topPad = 16;
    const bottomPad = 34;
    const innerWidth = chartWidth - leftPad - rightPad;
    const innerHeight = chartHeight - topPad - bottomPad;
    const safeMax = Math.max(maxValue, 1);

    const toY = (value: number) => topPad + innerHeight - (value / safeMax) * innerHeight;
    const toX = (index: number) => leftPad + (rows.length <= 1 ? innerWidth / 2 : (index / (rows.length - 1)) * innerWidth);

    const points = rows.map((row, index) => {
      const income = Number(row.income || 0);
      const output = Number(row.output || 0);
      const x = toX(index);
      const weekday = new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' });
      return {
        key: row.date,
        x,
        weekday,
        incomeY: toY(income),
        outputY: toY(output),
      };
    });

    const incomeLine = points.map((p) => `${p.x},${p.incomeY}`).join(' ');
    const outputLine = points.map((p) => `${p.x},${p.outputY}`).join(' ');
    const baseline = topPad + innerHeight;
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
  }, [data, maxValue]);

  const methodTotal = useMemo(
    () => (data?.payment_methods || []).reduce((acc, item) => acc + Number(item.total || 0), 0),
    [data],
  );

  const pieGradient = useMemo(() => {
    const items = data?.payment_methods || [];
    if (items.length === 0 || methodTotal <= 0) {
      return 'conic-gradient(#e5e7eb 0 100%)';
    }
    let start = 0;
    const segments: string[] = [];
    items.forEach((item, idx) => {
      const pct = (Number(item.total || 0) / methodTotal) * 100;
      const end = start + pct;
      segments.push(`${methodColor[idx % methodColor.length]} ${start}% ${end}%`);
      start = end;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [data, methodTotal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Buxgalteriya</h2>
          <p className="text-sm text-gray-500">Daromad, chiqim va sof natijani grafiklarda ko'rish.</p>
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
                className="rounded border px-2 py-1 text-xs"
              />
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="rounded border px-2 py-1 text-xs"
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-800">Jami daromad</p>
          <p className="text-2xl font-bold text-emerald-900">{Number(data?.income_total || 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-800">Jami chiqim</p>
          <p className="text-2xl font-bold text-rose-900">{Number(data?.output_total || 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
          <p className="text-sm text-teal-800">Sof natija</p>
          <p className="text-2xl font-bold text-teal-900">{Number(data?.net_total || 0).toLocaleString()} so'm</p>
        </div>
      </div>

      {message ? <p className="text-sm text-teal-700">{message}</p> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow xl:col-span-2">
          <h3 className="mb-3 font-semibold text-gray-900">Daromad vs Chiqim (kunlik)</h3>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <svg viewBox={`0 0 ${lineChart.chartWidth} ${lineChart.chartHeight}`} className="h-56 w-full">
              {[0, 1, 2, 3].map((idx) => {
                const y = lineChart.topPad + (lineChart.innerHeight / 3) * idx;
                return (
                  <line
                    key={idx}
                    x1={lineChart.leftPad}
                    y1={y}
                    x2={lineChart.chartWidth - lineChart.rightPad}
                    y2={y}
                    stroke="#d1d5db"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {lineChart.incomeArea ? <path d={lineChart.incomeArea} fill="rgba(59,130,246,0.15)" /> : null}
              {lineChart.incomeLine ? <polyline points={lineChart.incomeLine} fill="none" stroke="#2563eb" strokeWidth="3" /> : null}
              {lineChart.outputLine ? <polyline points={lineChart.outputLine} fill="none" stroke="#f59e0b" strokeWidth="3" /> : null}

              {lineChart.points.map((p) => (
                <g key={p.key}>
                  <circle cx={p.x} cy={p.incomeY} r="3.5" fill="#2563eb" />
                  <circle cx={p.x} cy={p.outputY} r="3.5" fill="#f59e0b" />
                  <text x={p.x} y={lineChart.baseline + 18} textAnchor="middle" fontSize="10" fill="#6b7280">
                    {p.weekday}
                  </text>
                </g>
              ))}

              {lineChart.axisLabels.map((val, idx) => {
                const y = lineChart.topPad + (lineChart.innerHeight / 3) * idx + 4;
                return (
                  <text
                    key={`${val}-${idx}`}
                    x={lineChart.chartWidth - lineChart.rightPad + 8}
                    y={y}
                    fontSize="10"
                    fill="#9ca3af"
                  >
                    {Number(val).toLocaleString()}
                  </text>
                );
              })}
            </svg>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-semibold text-blue-700">Daromad</p>
                <p className="text-xl font-bold text-slate-900">{Number(data?.income_total || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-semibold text-amber-600">Chiqim</p>
                <p className="text-xl font-bold text-slate-900">{Number(data?.output_total || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          {loading ? <p className="mt-3 text-sm text-gray-500">Yuklanmoqda...</p> : null}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h3 className="mb-3 font-semibold text-gray-900">To'lov usullari diagrammasi</h3>
          <div className="mx-auto h-40 w-40 rounded-full" style={{ background: pieGradient }} />
          <div className="mt-4 space-y-2">
            {(data?.payment_methods || []).map((item, idx) => (
              <div key={item.payment_method} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: methodColor[idx % methodColor.length] }} />
                  {methodLabel[item.payment_method] || item.payment_method}
                </span>
                <span>{Number(item.total).toLocaleString()} so'm</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h3 className="mb-3 font-semibold text-gray-900">Chiqim qo'shish</h3>
          <form onSubmit={submitExpense} className="space-y-3">
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Chiqim nomi (ixtiyoriy)"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
            />
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}
              required
            >
              {expenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {expenseForm.category === 'Boshqa' ? (
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Kategoriyani kiriting"
                value={expenseForm.customCategory}
                onChange={(e) => setExpenseForm((p) => ({ ...p, customCategory: e.target.value }))}
                required
              />
            ) : null}

            {expenseForm.category === 'Shifokor bonusi' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={bulkMode}
                      onChange={(e) => setBulkMode(e.target.checked)}
                    />
                    Barcha shifokorlarga bir xil suma berish
                  </label>
                </div>
                
                {bulkMode ? (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <p className="text-sm font-medium">Barcha shifokorlarga bonus:</p>
                    <div className="text-xs text-gray-600">
                      Ichki shifokorlar: {doctors.length} ta
                    </div>
                    <div className="text-xs text-gray-600">
                      Tashqi shifokorlar (yo'naltiruvchi): {referringDoctors.length} ta
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={expenseForm.doctor_id}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, doctor_id: e.target.value }))}
                      required
                    >
                      <option value="">Shifokorni tanlang</option>
                      <optgroup label="Ichki shifokorlar">
                        {doctors.map((doc) => (
                          <option key={`internal-${doc.id}`} value={`i:${doc.id}`}>
                            {doc.user_full_name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Tashqi shifokorlar (yo'naltiruvchi)">
                        {referringDoctors.map((ref) => (
                          <option key={`ref-${ref.id}`} value={`r:${ref.id}`}>
                            {ref.full_name} {ref.clinic_name ? `(${ref.clinic_name})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    {!showAddDoctor ? (
                      <button
                        type="button"
                        onClick={() => setShowAddDoctor(true)}
                        className="text-xs text-teal-600 hover:underline"
                      >
                        + Yangi tashqi shifokor qo'shish
                      </button>
                    ) : (
                      <div className="rounded border border-teal-200 bg-teal-50 p-2 space-y-2">
                        <input
                          className="w-full rounded border px-2 py-1 text-sm"
                          placeholder="Shifokor FIO"
                          value={newDoctor.full_name}
                          onChange={(e) => setNewDoctor((p) => ({ ...p, full_name: e.target.value }))}
                        />
                        <input
                          className="w-full rounded border px-2 py-1 text-sm"
                          placeholder="Telefon (ixtiyoriy)"
                          value={newDoctor.phone}
                          onChange={(e) => setNewDoctor((p) => ({ ...p, phone: e.target.value }))}
                        />
                        <input
                          className="w-full rounded border px-2 py-1 text-sm"
                          placeholder="Klinika nomi (ixtiyoriy)"
                          value={newDoctor.clinic_name}
                          onChange={(e) => setNewDoctor((p) => ({ ...p, clinic_name: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={addReferringDoctor}
                            className="rounded bg-teal-600 px-2 py-1 text-xs text-white"
                          >
                            Saqlash
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddDoctor(false);
                              setNewDoctor({ full_name: '', phone: '', clinic_name: '' });
                            }}
                            className="rounded border border-gray-300 px-2 py-1 text-xs"
                          >
                            Bekor
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : null}
            <textarea
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Qo'shimcha ma'lumot (ixtiyoriy)"
              value={expenseForm.note}
              onChange={(e) => setExpenseForm((p) => ({ ...p, note: e.target.value }))}
              rows={3}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Summa"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={expenseForm.payment_method}
                onChange={(e) => setExpenseForm((p) => ({ ...p, payment_method: e.target.value }))}
              >
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {methodLabel[m]}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="date"
                value={expenseForm.spent_at}
                onChange={(e) => setExpenseForm((p) => ({ ...p, spent_at: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="rounded bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600">
              Chiqim saqlash
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h3 className="mb-3 font-semibold text-gray-900">Oxirgi chiqimlar</h3>
          <div className="space-y-2 text-sm">
            {(data?.recent_outputs || []).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{row.description}</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        row.source === 'cash_register'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.source === 'cash_register' ? 'Kassa chiqimi' : 'Buxgalteriya chiqimi'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{row.category || '-'} | {new Date(row.spent_at).toLocaleDateString()}</p>
                  {row.created_by__username ? <p className="text-xs text-gray-400">Kiritdi: {row.created_by__username}</p> : null}
                  {row.note ? <p className="text-xs text-gray-400">{row.note}</p> : null}
                </div>
                <p className="font-semibold text-rose-700">{Number(row.amount).toLocaleString()} so'm</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Sahifa {data?.recent_outputs_pagination?.page || 1} / {data?.recent_outputs_pagination?.total_pages || 1}
              {' '}({data?.recent_outputs_pagination?.total || 0} ta)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOutputPage((p) => Math.max(1, p - 1))}
                disabled={(data?.recent_outputs_pagination?.page || 1) <= 1}
                className="rounded border px-3 py-1 text-xs disabled:opacity-50"
              >
                Oldingi
              </button>
              <button
                type="button"
                onClick={() =>
                  setOutputPage((p) => Math.min(data?.recent_outputs_pagination?.total_pages || 1, p + 1))
                }
                disabled={(data?.recent_outputs_pagination?.page || 1) >= (data?.recent_outputs_pagination?.total_pages || 1)}
                className="rounded border px-3 py-1 text-xs disabled:opacity-50"
              >
                Keyingi
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <h3 className="mb-3 font-semibold text-gray-900">Kirimlar ({periodLabel})</h3>
        <div className="space-y-2 text-sm">
          {(data?.recent_income || []).map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded border px-3 py-2">
              <div>
                <p className="font-medium text-gray-900">
                  {(row.charge__patient__first_name || '').trim()} {(row.charge__patient__last_name || '').trim()}
                </p>
                <p className="text-xs text-gray-500">
                  {incomeTypeLabel[row.income_type] || row.income_type} | {methodLabel[row.payment_method] || row.payment_method} |{' '}
                  {new Date(row.created_at).toLocaleString()} | Charge #{row.charge_id}
                </p>
                {row.charge__notes ? <p className="text-xs text-gray-400">{row.charge__notes}</p> : null}
              </div>
              <p className="font-semibold text-emerald-700">{Number(row.amount).toLocaleString()} so'm</p>
            </div>
          ))}
          {!loading && (data?.recent_income || []).length === 0 ? <p className="text-sm text-gray-500">Kirim topilmadi.</p> : null}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Sahifa {data?.recent_income_pagination?.page || 1} / {data?.recent_income_pagination?.total_pages || 1}
            {' '}({data?.recent_income_pagination?.total || 0} ta)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIncomePage((p) => Math.max(1, p - 1))}
              disabled={(data?.recent_income_pagination?.page || 1) <= 1}
              className="rounded border px-3 py-1 text-xs disabled:opacity-50"
            >
              Oldingi
            </button>
            <button
              type="button"
              onClick={() =>
                setIncomePage((p) => Math.min(data?.recent_income_pagination?.total_pages || 1, p + 1))
              }
              disabled={(data?.recent_income_pagination?.page || 1) >= (data?.recent_income_pagination?.total_pages || 1)}
              className="rounded border px-3 py-1 text-xs disabled:opacity-50"
            >
              Keyingi
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
