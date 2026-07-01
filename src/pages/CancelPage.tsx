import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Search, X, Loader2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface ChargeItem {
  id: number;
  charge_id: number;
  description: string;
  unit_price: string;
  total_price: string;
  service: number | null;
  is_cancelled: boolean;
}

interface Charge {
  id: number;
  patient_id: number;
  patient_name: string;
  status: string;
  total_amount: string;
  paid_amount: string;
  created_at: string;
  items: ChargeItem[];
}

interface PatientCharges {
  patient_id: number;
  patient_name: string;
  charges: Charge[];
}

interface CancelledItem {
  id: number;
  charge_id: number;
  patient_id: number;
  patient_name: string;
  service_name: string;
  description: string;
  total_price: number;
  cancel_note: string;
  cancelled_at: string;
}

const months = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

export function CancelPage() {
  const [patientSearch, setPatientSearch] = useState('');
  const [patientCharges, setPatientCharges] = useState<PatientCharges[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCharge, setSelectedCharge] = useState<Charge | null>(null);
  const [cancelItem, setCancelItem] = useState<ChargeItem | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelledItems, setCancelledItems] = useState<CancelledItem[]>([]);
  const [totalRefunded, setTotalRefunded] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'cancelled'>('search');

  const loadPatientCharges = async () => {
    setLoading(true);
    setError('');
    try {
      const query = patientSearch.trim();
      if (!query) {
        setPatientCharges([]);
        setLoading(false);
        return;
      }
      const data = await apiRequest<{ results: Array<{ id: number; first_name: string; last_name: string }> }>(
        `/patients/?search=${encodeURIComponent(query)}`
      );
      const patients = data.results || [];

      const allCharges: PatientCharges[] = [];
      for (const patient of patients) {
        try {
          const chargeData = await apiRequest<{ results: Charge[] }>(
            `/charges/?patient=${patient.id}`
          );
          const charges = (chargeData.results || []).filter(
            (c) => c.items.some((item) => !item.is_cancelled)
          );
          if (charges.length > 0) {
            allCharges.push({
              patient_id: patient.id,
              patient_name: `${patient.first_name} ${patient.last_name}`.trim(),
              charges,
            });
          }
        } catch {
          // skip
        }
      }
      setPatientCharges(allCharges);
    } catch {
      setPatientCharges([]);
      setError("Ma'lumotlarni yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const loadCancelledItems = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{
        year: number;
        month: number;
        total_refunded: number;
        count: number;
        items: CancelledItem[];
      }>(`/charges/cancelled-items/?year=${year}&month=${month}`);
      setCancelledItems(data.items || []);
      setTotalRefunded(data.total_refunded || 0);
    } catch {
      setCancelledItems([]);
      setTotalRefunded(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cancelled') {
      loadCancelledItems();
    }
  }, [activeTab, year, month]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearch.trim().length >= 2) {
        loadPatientCharges();
      } else {
        setPatientCharges([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleCancel = async () => {
    if (!selectedCharge || !cancelItem) return;
    setCancelLoading(true);
    setMessage('');
    try {
      const result = await apiRequest<{
        detail: string;
        refund_amount: number;
        charge_status: string;
      }>(`/charges/${selectedCharge.id}/cancel-item/`, {
        method: 'POST',
        body: JSON.stringify({
          charge_item_id: cancelItem.id,
          note: cancelNote,
        }),
      });
      setMessage(`Xizmat bekor qilindi. Qaytarilgan summa: ${result.refund_amount.toLocaleString()} so'm`);
      setCancelItem(null);
      setCancelNote('');
      setSelectedCharge(null);
      loadPatientCharges();
      if (activeTab === 'cancelled') {
        loadCancelledItems();
      }
    } catch (err: any) {
      setMessage(err.detail || "Xatolik yuz berdi.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bekor qilish</h2>
        <p className="text-sm text-gray-500">Xizmatlarni bekor qilish va qaytarish.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('search')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === 'search' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Xizmat qidirish
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`rounded-full px-4 py-2 text-sm font-medium ${activeTab === 'cancelled' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}
        >
          Bekor qilinganlar
        </button>
      </div>

      {message && (
        <div className={`rounded p-3 text-sm ${message.includes('Xatolik') ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {message}
        </div>
      )}

      {activeTab === 'search' ? (
        <>
          <div className="relative max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-600 sm:text-sm"
              placeholder="Bemor ismini kiriting (kamida 2 harf)..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
          </div>

          {loading && <p className="text-sm text-gray-500">Qidirilmoqda...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="space-y-4">
            {patientCharges.map((pc) => {
              const isExpanded = expandedPatient === pc.patient_id;
              return (
                <div key={pc.patient_id} className="rounded-lg border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedPatient(isExpanded ? null : pc.patient_id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">{pc.patient_name}</p>
                      <p className="text-sm text-gray-500">{pc.charges.length} ta charge</p>
                    </div>
                    {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4">
                      {pc.charges.map((charge) => (
                        <div key={charge.id} className="mb-3 rounded border border-gray-100 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Charge #{charge.id} - {charge.created_at.slice(0, 10)}</p>
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${charge.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : charge.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                              {charge.status === 'paid' ? "To'langan" : charge.status === 'partial' ? 'Qisman' : "To'lanmagan"}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {charge.items.map((item) => (
                              <div key={item.id} className={`flex items-center justify-between rounded px-3 py-2 text-sm ${item.is_cancelled ? 'bg-red-50 line-through opacity-60' : 'bg-gray-50'}`}>
                                <div className="flex-1">
                                  <span className="font-medium">{item.description}</span>
                                  {item.is_cancelled && (
                                    <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">Bekor qilingan</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-600">{Number(item.total_price).toLocaleString()} so'm</span>
                                  {!item.is_cancelled && (
                                    <button
                                      type="button"
                                      onClick={() => { setSelectedCharge(charge); setCancelItem(item); setCancelNote(''); }}
                                      className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                                    >
                                      Bekor qilish
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Oy:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="rounded border border-gray-300 px-3 py-2 text-sm"
              >
                {months.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Yil:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded bg-red-50 px-4 py-2">
              <span className="text-gray-600">Jami bekor qilingan:</span>
              <span className="ml-2 font-semibold text-red-700">{cancelledItems.length} ta</span>
            </div>
            <div className="rounded bg-amber-50 px-4 py-2">
              <span className="text-gray-600">Jami qaytarilgan:</span>
              <span className="ml-2 font-semibold text-amber-700">{totalRefunded.toLocaleString()} so'm</span>
            </div>
          </div>

          {loading && <p className="text-sm text-gray-500">Yuklanmoqda...</p>}

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bemor</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Xizmat</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Summa</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Izoh</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {cancelledItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                      Bekor qilingan xizmatlar topilmadi
                    </td>
                  </tr>
                ) : (
                  cancelledItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.patient_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.service_name}</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600">{item.total_price.toLocaleString()} so'm</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.cancel_note || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{item.cancelled_at ? new Date(item.cancelled_at).toLocaleDateString('uz-UZ') : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {cancelItem && selectedCharge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Xizmatni bekor qilish</h4>
              <button type="button" onClick={() => { setCancelItem(null); setSelectedCharge(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded bg-red-50 p-3">
              <p className="text-sm font-medium text-gray-900">{cancelItem.description}</p>
              <p className="text-sm text-gray-600">Summa: {Number(cancelItem.total_price).toLocaleString()} so'm</p>
              <p className="text-sm text-gray-600">Charge #{selectedCharge.id} | Bemor: {selectedCharge.patient_name}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bekor qilish sababi</label>
              <textarea
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                rows={2}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Sababni kiriting..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setCancelItem(null); setSelectedCharge(null); }}
                className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {cancelLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <XCircle className="h-4 w-4" />
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
