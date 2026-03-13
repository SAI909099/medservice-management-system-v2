import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type BillingStatus = 'unpaid' | 'partial' | 'paid' | 'prepaid';

interface TreatmentRoomCharge {
  patient_id: number;
  patient_name: string;
  status: BillingStatus;
  total_amount: string;
  paid_amount: string;
  debt_amount: string;
  advance_amount: string;
  charge_count: number;
  last_charge_at: string;
}

interface Paginated<T> {
  results: T[];
  count?: number;
}

export function TreatmentRoomBilling() {
  const [items, setItems] = useState<TreatmentRoomCharge[]>([]);
  const [status, setStatus] = useState<'all' | BillingStatus>('all');
  const [todayOnly, setTodayOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paymentTarget, setPaymentTarget] = useState<TreatmentRoomCharge | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'insurance'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (todayOnly) params.set('today', '1');
      const res = await apiRequest<Paginated<TreatmentRoomCharge>>(`/charges/treatment-room/?${params.toString()}`);
      setItems(res.results || []);
    } catch {
      setItems([]);
      setMessage("Ma'lumotlarni yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [status, todayOnly]);

  const generateDailyCharges = async () => {
    setMessage('');
    try {
      const res = await apiRequest<{ created: number; existing: number; date: string }>('/charges/generate-treatment-daily/', {
        method: 'POST',
      });
      setMessage(`Kunlik hisob-kitob: yangi ${res.created} ta, oldindan mavjud ${res.existing} ta (${res.date}).`);
      await loadItems();
    } catch {
      setMessage("Kunlik hisob-kitobni yaratishda xatolik.");
    }
  };

  const openPaymentModal = (row: TreatmentRoomCharge) => {
    const debt = Math.max(Number(row.debt_amount || 0), 0);
    setPaymentTarget(row);
    setPaymentAmount(debt > 0 ? String(debt) : '');
    setPaymentMethod('cash');
    setPaymentNote('');
  };

  const closePaymentModal = () => {
    setPaymentTarget(null);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentSubmitting(false);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    setPaymentSubmitting(true);
    setMessage('');
    try {
      const res = await apiRequest<{ applied_amount: string; debt_before: string; debt_after: string; advance_amount: string }>(
        '/charges/treatment-pay-by-patient/',
        {
        method: 'POST',
        body: JSON.stringify({
          patient_id: paymentTarget.patient_id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          note: paymentNote,
        }),
      });
      setMessage(
        `To'lov qabul qilindi: ${Number(res.applied_amount).toLocaleString()} so'm. Qarz: ${Number(
          res.debt_before,
        ).toLocaleString()} -> ${Math.max(Number(res.debt_after), 0).toLocaleString()} so'm${
          Number(res.advance_amount) > 0
            ? `, Oldindan to'langan: ${Number(res.advance_amount).toLocaleString()} so'm`
            : ''
        }.`,
      );
      await loadItems();
      closePaymentModal();
    } catch (err) {
      if (err && typeof err === 'object' && typeof (err as Record<string, unknown>).detail === 'string') {
        setMessage((err as Record<string, string>).detail);
      } else {
        setMessage("To'lovni saqlashda xatolik.");
      }
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const statusLabel: Record<BillingStatus, string> = {
    unpaid: "To'lanmagan",
    partial: 'Qisman',
    paid: "To'langan",
    prepaid: "Oldindan to'langan",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Yotoq to'lovlari</h2>
          <p className="text-sm text-gray-500">Davolash xonasidagi bemorlar bo'yicha umumiy to'lov holati.</p>
        </div>
        <button
          type="button"
          onClick={generateDailyCharges}
          className="rounded bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
        >
          Kunlik charge yaratish
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatus('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${status === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Barchasi
        </button>
        <button
          type="button"
          onClick={() => setStatus('unpaid')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${status === 'unpaid' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'}`}
        >
          To'lanmagan
        </button>
        <button
          type="button"
          onClick={() => setStatus('partial')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${status === 'partial' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}
        >
          Qisman
        </button>
        <button
          type="button"
          onClick={() => setStatus('paid')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${status === 'paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}
        >
          To'langan
        </button>
        <button
          type="button"
          onClick={() => setStatus('prepaid')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${status === 'prepaid' ? 'bg-cyan-600 text-white' : 'bg-cyan-100 text-cyan-700'}`}
        >
          Oldindan to'langan
        </button>
        <label className="ml-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} />
          Faqat bugungi kun
        </label>
      </div>

      {message ? <p className="text-sm text-teal-700">{message}</p> : null}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bemor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Charge soni</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Jami</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">To'langan</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Qarz</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Holat</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Oxirgi sana</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((row) => (
              <tr key={row.patient_id}>
                <td className="px-4 py-3 text-sm text-gray-900">{row.patient_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.charge_count}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{Number(row.total_amount).toLocaleString()} so'm</td>
                <td className="px-4 py-3 text-sm text-gray-700">{Number(row.paid_amount).toLocaleString()} so'm</td>
                <td className="px-4 py-3 text-sm text-gray-700">{Number(row.debt_amount).toLocaleString()} so'm</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      row.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : row.status === 'prepaid'
                          ? 'bg-cyan-100 text-cyan-700'
                        : row.status === 'partial'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {statusLabel[row.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{new Date(row.last_charge_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={() => openPaymentModal(row)}
                    disabled={row.status === 'paid'}
                    className="rounded bg-teal-700 px-3 py-1 text-xs font-medium text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    To'lov qilish
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? <p className="px-4 py-3 text-sm text-gray-500">Yuklanmoqda...</p> : null}
      </div>

      {paymentTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">To'lov qabul qilish</h4>
              <button type="button" onClick={closePaymentModal} className="rounded border px-2 py-1 text-sm">
                Yopish
              </button>
            </div>
            <p className="mb-2 text-sm text-gray-700">{paymentTarget.patient_name}</p>
            <p className="mb-3 text-xs text-gray-500">
              Qarz: {Math.max(Number(paymentTarget.debt_amount || 0), 0).toLocaleString()} so'm
            </p>
            <form onSubmit={submitPayment} className="space-y-3">
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="To'lov summasi"
                required
              />
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'transfer' | 'insurance')}
              >
                <option value="cash">Naqd</option>
                <option value="card">Karta</option>
                <option value="transfer">O'tkazma</option>
                <option value="insurance">Sug'urta</option>
              </select>
              <textarea
                className="w-full rounded border px-3 py-2 text-sm"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Izoh (ixtiyoriy)"
              />
              <button
                type="submit"
                disabled={paymentSubmitting}
                className="w-full rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
              >
                {paymentSubmitting ? 'Saqlanmoqda...' : "To'lovni saqlash"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
