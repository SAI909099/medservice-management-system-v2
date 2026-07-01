import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface PatientPayment {
  patient_id: number;
  patient_name: string;
  total_paid: number;
}

interface DoctorAppointmentSalary {
  doctor_id: number;
  doctor_name: string;
  specialty: string;
  salary_percentage: number;
  treatment_income: number;
  patient_count: number;
  calculated_salary: number;
  paid_amount: number;
  remaining: number;
  patients: PatientPayment[];
}

interface SalaryResponse {
  year: number;
  month: number;
  day: number | null;
  doctors: DoctorAppointmentSalary[];
}

const months = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

export function DoctorAppointmentSalaries() {
  const [loading, setLoading] = useState(false);
  const [salaryData, setSalaryData] = useState<DoctorAppointmentSalary[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState<number | null>(new Date().getDate());
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [payingDoctor, setPayingDoctor] = useState<DoctorAppointmentSalary | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payingLoading, setPayingLoading] = useState(false);
  const [expandedDoctor, setExpandedDoctor] = useState<number | null>(null);

  const loadSalaryData = () => {
    setLoading(true);
    let url = `/doctors/appointment-salary-summary/?year=${year}&month=${month}`;
    if (day !== null) {
      url += `&day=${day}`;
    }
    apiRequest<SalaryResponse>(url)
      .then((res) => {
        setSalaryData(res.doctors || []);
      })
      .catch(() => {
        setSalaryData([]);
        setMessage("Ma'lumotlarni yuklashda xatolik.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSalaryData();
  }, [year, month, day]);

  const updatePercentage = async (doctorId: number) => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0 || value > 100) {
      setMessage("Foiz 0-100 oralig'ida bo'lishi kerak.");
      return;
    }
    try {
      await apiRequest(`/doctors/${doctorId}/appointment-salary-percentage/`, {
        method: 'PATCH',
        body: JSON.stringify({ percentage: value }),
      });
      setMessage("Foiz muvaffaqiyatli yangilandi.");
      setEditingId(null);
      loadSalaryData();
    } catch {
      setMessage("Xatolik yuz berdi.");
    }
  };

  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDoctor) return;
    
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage("To'g'ri summa kiriting.");
      return;
    }

    setPayingLoading(true);
    setMessage('');
    try {
      await apiRequest('/doctors/pay-appointment-salary/', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: payingDoctor.doctor_id,
          amount: payAmount,
          note: payNote,
        }),
      });
      setMessage(`Maosh to'landi: ${Number(payAmount).toLocaleString()} so'm`);
      setPayingDoctor(null);
      setPayAmount('');
      setPayNote('');
      loadSalaryData();
    } catch (err) {
      if (err && typeof err === 'object' && typeof (err as Record<string, unknown>).detail === 'string') {
        setMessage((err as Record<string, string>).detail);
      } else {
        setMessage("Xatolik yuz berdi.");
      }
    } finally {
      setPayingLoading(false);
    }
  };

  const totalIncome = salaryData.reduce((sum, d) => sum + d.treatment_income, 0);
  const totalSalary = salaryData.reduce((sum, d) => sum + d.calculated_salary, 0);
  const totalPaid = salaryData.reduce((sum, d) => sum + d.paid_amount, 0);
  const totalRemaining = salaryData.reduce((sum, d) => sum + d.remaining, 0);
  const totalPatients = salaryData.reduce((sum, d) => sum + d.patient_count, 0);

  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shifokorlar qabul maoshlari</h2>
          <p className="text-sm text-gray-500">Qabul qilgan bemorlardan tushgan to'lovdan shifokor ulushi.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Kun:</label>
          <select
            value={day ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setDay(val ? parseInt(val) : null);
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Barcha kunlar</option>
            {dayOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
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

      {message && (
        <div className={`rounded p-3 text-sm ${message.includes('muvaffaqiyat') || message.includes("to'landi") ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="rounded bg-blue-50 px-4 py-2">
          <span className="text-gray-600">Jami tushum:</span>
          <span className="ml-2 font-semibold text-blue-700">{totalIncome.toLocaleString()} so'm</span>
        </div>
        <div className="rounded bg-purple-50 px-4 py-2">
          <span className="text-gray-600">Jami bemorlar:</span>
          <span className="ml-2 font-semibold text-purple-700">{totalPatients}</span>
        </div>
        <div className="rounded bg-green-50 px-4 py-2">
          <span className="text-gray-600">Jami maosh:</span>
          <span className="ml-2 font-semibold text-green-700">{totalSalary.toLocaleString()} so'm</span>
        </div>
        <div className="rounded bg-teal-50 px-4 py-2">
          <span className="text-gray-600">To'langan:</span>
          <span className="ml-2 font-semibold text-teal-700">{totalPaid.toLocaleString()} so'm</span>
        </div>
        <div className="rounded bg-amber-50 px-4 py-2">
          <span className="text-gray-600">Qoldiq:</span>
          <span className="ml-2 font-semibold text-amber-700">{totalRemaining.toLocaleString()} so'm</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Shifokor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Mutaxassislik</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Bemorlar</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Foiz (%)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Qabul tushumi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Maosh hisoblangan</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">To'langan</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Qoldiq</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                  Yuklanmoqda...
                </td>
              </tr>
            ) : salaryData.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                  Ma'lumot topilmadi
                </td>
              </tr>
            ) : (
              salaryData.map((doc) => {
                const isExpanded = expandedDoctor === doc.doctor_id;
                const hasPatients = doc.patients && doc.patients.length > 0;
                return (
                  <React.Fragment key={doc.doctor_id}>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {hasPatients ? (
                            <button
                              type="button"
                              onClick={() => setExpandedDoctor(isExpanded ? null : doc.doctor_id)}
                              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          ) : (
                            <span className="w-4" />
                          )}
                          <span className="font-medium">{doc.doctor_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{doc.specialty}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{doc.patient_count}</td>
                      <td className="px-4 py-3 text-sm">
                        {editingId === doc.doctor_id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                              min="0"
                              max="100"
                            />
                            <button
                              onClick={() => updatePercentage(doc.doctor_id)}
                              className="rounded bg-teal-600 px-2 py-1 text-xs text-white"
                            >
                              Saqlash
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded bg-gray-400 px-2 py-1 text-xs text-white"
                            >
                              Bekor
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => { setEditingId(doc.doctor_id); setEditValue(String(doc.salary_percentage)); }}
                            className="cursor-pointer rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
                          >
                            {doc.salary_percentage}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{doc.treatment_income.toLocaleString()} so'm</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-700">
                        {doc.calculated_salary.toLocaleString()} so'm
                      </td>
                      <td className="px-4 py-3 text-sm text-teal-700">
                        {doc.paid_amount.toLocaleString()} so'm
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-amber-700">
                        {doc.remaining.toLocaleString()} so'm
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => { setPayingDoctor(doc); setPayAmount(String(doc.remaining)); setPayNote(''); }}
                          disabled={doc.remaining <= 0}
                          className="rounded bg-teal-700 px-3 py-1 text-xs font-medium text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          To'lash
                        </button>
                      </td>
                    </tr>
                    {isExpanded && hasPatients ? (
                      <tr>
                        <td colSpan={9} className="bg-gray-50 px-4 py-3">
                          <div className="ml-6 border-l-2 border-teal-200 pl-4">
                            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">Bemorlar va to'lovlar</p>
                            <table className="w-full">
                              <thead>
                                <tr>
                                  <th className="px-3 py-1 text-left text-xs font-semibold text-gray-500">Bemor</th>
                                  <th className="px-3 py-1 text-right text-xs font-semibold text-gray-500">To'langan summa</th>
                                  <th className="px-3 py-1 text-right text-xs font-semibold text-gray-500">Shifokor ulushi ({doc.salary_percentage}%)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {doc.patients.map((pat) => (
                                  <tr key={pat.patient_id} className="hover:bg-gray-100">
                                    <td className="px-3 py-1.5 text-sm text-gray-800">{pat.patient_name}</td>
                                    <td className="px-3 py-1.5 text-sm text-right text-gray-700">{pat.total_paid.toLocaleString()} so'm</td>
                                    <td className="px-3 py-1.5 text-sm text-right font-medium text-green-700">
                                      {Math.round(pat.total_paid * doc.salary_percentage / 100).toLocaleString()} so'm
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {payingDoctor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Maosh to'lash</h4>
              <button
                type="button"
                onClick={() => setPayingDoctor(null)}
                className="rounded border px-2 py-1 text-sm"
              >
                Yopish
              </button>
            </div>
            <p className="mb-2 text-sm text-gray-700">{payingDoctor.doctor_name}</p>
            <p className="mb-1 text-xs text-gray-500">
              Hisoblangan maosh: {payingDoctor.calculated_salary.toLocaleString()} so'm
            </p>
            <p className="mb-1 text-xs text-teal-600">
              To'langan: {payingDoctor.paid_amount.toLocaleString()} so'm
            </p>
            <p className="mb-3 text-xs font-medium text-amber-600">
              Qoldiq: {payingDoctor.remaining.toLocaleString()} so'm
            </p>
            <form onSubmit={handlePaySalary} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700">Summa</label>
                <input
                  className="w-full rounded border px-3 py-2 text-sm"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Izoh (ixtiyoriy)</label>
                <textarea
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Izoh"
                  rows={2}
                />
              </div>
              <button
                type="submit"
                disabled={payingLoading}
                className="w-full rounded bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
              >
                {payingLoading ? 'Saqlanmoqda...' : "To'lash"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
