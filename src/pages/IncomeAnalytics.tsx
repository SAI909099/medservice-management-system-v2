import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type PeriodFilter = 'today' | 'month' | '30d' | 'custom';
type GroupByFilter = 'day' | 'month';

interface SourceTotals {
  doctor: string;
  treatment_room: string;
  service: string;
  other: string;
}

interface TimelineRow {
  period_value: string;
  total: string;
}

interface DoctorRow {
  charge__appointment__doctor_id: number;
  charge__appointment__doctor__user__first_name: string;
  charge__appointment__doctor__user__last_name: string;
  charge__appointment__doctor__specialty: string;
  total: string;
  payments_count: number;
}

interface TreatmentRoomRow {
  charge__treatment_referral__room_id: number;
  charge__treatment_referral__room__name: string;
  total: string;
  payments_count: number;
}

interface IncomeAnalyticsPayload {
  period: string;
  group_by: string;
  date_from: string;
  date_to: string;
  income_total: string;
  sources: SourceTotals;
  timeline: TimelineRow[];
  doctor_breakdown: DoctorRow[];
  treatment_room_breakdown: TreatmentRoomRow[];
  service_breakdown: unknown[];
  other_breakdown: unknown[];
}

export function IncomeAnalytics() {
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [groupBy, setGroupBy] = useState<GroupByFilter>('day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IncomeAnalyticsPayload | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      params.set('group_by', groupBy);
      if (period === 'custom') {
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
      }
      const res = await apiRequest<IncomeAnalyticsPayload>(`/reports/income-analytics/?${params.toString()}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, groupBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daromad analitikasi</h2>
          <p className="text-sm text-gray-500">Shifokor, davolash xonasi va boshqa daromadlar kesimida hisobot.</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          Yangilash
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setPeriod('today')} className={`rounded-full px-3 py-1 text-xs font-medium ${period === 'today' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>1 kun</button>
          <button type="button" onClick={() => setPeriod('month')} className={`rounded-full px-3 py-1 text-xs font-medium ${period === 'month' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>1 oy</button>
          <button type="button" onClick={() => setPeriod('30d')} className={`rounded-full px-3 py-1 text-xs font-medium ${period === '30d' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>30 kun</button>
          <button type="button" onClick={() => setPeriod('custom')} className={`rounded-full px-3 py-1 text-xs font-medium ${period === 'custom' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>Oraliq</button>
          <select
            className="rounded border px-2 py-1 text-xs"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupByFilter)}
          >
            <option value="day">Kunlik</option>
            <option value="month">Oylik</option>
          </select>
        </div>

        {period === 'custom' ? (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded border px-3 py-2 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded border px-3 py-2 text-sm" />
            <button type="button" onClick={loadData} className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Qo'llash</button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">Jami daromad</p>
          <p className="text-xl font-bold text-emerald-900">{Number(data?.income_total || 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-700">Shifokor</p>
          <p className="text-xl font-bold text-blue-900">{Number(data?.sources?.doctor || 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
          <p className="text-xs text-cyan-700">Davolash xonasi</p>
          <p className="text-xl font-bold text-cyan-900">{Number(data?.sources?.treatment_room || 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Service</p>
          <p className="text-xl font-bold text-amber-900">{Number(data?.sources?.service || 0).toLocaleString()} so'm</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-700">Boshqa</p>
          <p className="text-xl font-bold text-slate-900">{Number(data?.sources?.other || 0).toLocaleString()} so'm</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h3 className="mb-3 font-semibold text-gray-900">Shifokor bo'yicha daromad</h3>
          <div className="space-y-2 text-sm">
            {(data?.doctor_breakdown || []).map((row) => (
              <div key={row.charge__appointment__doctor_id} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <p className="font-medium text-gray-900">
                    {(row.charge__appointment__doctor__user__first_name || '').trim()} {(row.charge__appointment__doctor__user__last_name || '').trim()}
                  </p>
                  <p className="text-xs text-gray-500">{row.charge__appointment__doctor__specialty || '-'} | To'lovlar: {row.payments_count}</p>
                </div>
                <p className="font-semibold text-blue-700">{Number(row.total).toLocaleString()} so'm</p>
              </div>
            ))}
            {!loading && (data?.doctor_breakdown || []).length === 0 ? <p className="text-sm text-gray-500">Ma'lumot topilmadi.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <h3 className="mb-3 font-semibold text-gray-900">Davolash xonasi daromadi</h3>
          <div className="space-y-2 text-sm">
            {(data?.treatment_room_breakdown || []).map((row) => (
              <div key={row.charge__treatment_referral__room_id} className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <p className="font-medium text-gray-900">{row.charge__treatment_referral__room__name || 'Noma’lum xona'}</p>
                  <p className="text-xs text-gray-500">To'lovlar: {row.payments_count}</p>
                </div>
                <p className="font-semibold text-cyan-700">{Number(row.total).toLocaleString()} so'm</p>
              </div>
            ))}
            {!loading && (data?.treatment_room_breakdown || []).length === 0 ? <p className="text-sm text-gray-500">Ma'lumot topilmadi.</p> : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <h3 className="mb-3 font-semibold text-gray-900">Vaqt bo'yicha daromad ({data?.group_by === 'month' ? 'oylik' : 'kunlik'})</h3>
        <div className="space-y-2 text-sm">
          {(data?.timeline || []).map((row, idx) => (
            <div key={idx} className="flex items-center justify-between rounded border px-3 py-2">
              <p className="text-gray-700">{new Date(row.period_value).toLocaleDateString()}</p>
              <p className="font-semibold text-emerald-700">{Number(row.total).toLocaleString()} so'm</p>
            </div>
          ))}
          {!loading && (data?.timeline || []).length === 0 ? <p className="text-sm text-gray-500">Ma'lumot topilmadi.</p> : null}
        </div>
      </section>
    </div>
  );
}
