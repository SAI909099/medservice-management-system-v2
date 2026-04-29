import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type MRTQueueItem = {
  id: number;
  queue_code: string;
  service_name: string;
  service_id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  patient_dob: string | null;
  patient_gender: string;
  body_parts: string[];
  referring_doctor: string;
  status: 'waiting' | 'completed' | 'cancelled';
  queue_date: string;
  charge_id: number | null;
  charge_status: 'unpaid' | 'partial' | 'paid' | null;
  total_amount: string;
  paid_amount: string;
  created_at: string;
};

type ServiceOption = {
  id: number;
  name: string;
};

type Paginated<T> = {
  results: T[];
};

export function MRTQueue() {
  const [rows, setRows] = useState<MRTQueueItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const loadServices = async () => {
    const res = await apiRequest<{ services: ServiceOption[] }>('/appointments/staff-options/');
    const mrtServices = (res.services || []).filter((s: ServiceOption & { has_options?: boolean }) => (s as any).has_options);
    setServices(mrtServices);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('date', date);
      if (serviceId) params.set('service_id', serviceId);
      const res = await apiRequest<{ results: MRTQueueItem[] }>(`/appointments/mrt-queue/?${params.toString()}`);
      setRows(res.results || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices().catch(() => setServices([]));
  }, []);

  useEffect(() => {
    load();
  }, [serviceId, date]);

  const updateStatus = async (id: number, newStatus: string) => {
    await apiRequest(`/appointments/update-ticket-status/`, {
      method: 'PATCH',
      body: JSON.stringify({ ticket_id: id, status: newStatus }),
    });
    await load();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      waiting: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      waiting: 'Kutilmoqda',
      completed: 'Yakunlangan',
      cancelled: 'Bekor',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentBadge = (status: string | null) => {
    if (!status) return <span className="text-gray-400">-</span>;
    const styles: Record<string, string> = {
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      unpaid: 'To\'lanmagan',
      partial: 'Qisman',
      paid: 'To\'langan',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">MRT Navbati</h2>
        <p className="text-sm text-gray-500">MRT va boshqa ko'p variantli xizmatlar bo'yicha navbat.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          className="border rounded px-3 py-2"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          <option value="">Barcha xizmatlar</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="rounded bg-teal-700 text-white px-4 py-2 hover:bg-teal-600"
        >
          Yangilash
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Yuklanmoqda...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Navbat topilmadi</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Navbat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Xizmat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Bemor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tug'ilgan</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Jins</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Yuborgan shifokor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tanlangan qismlar</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">To'lov</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Holat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.queue_code}</td>
                  <td className="px-4 py-3 text-sm">{row.service_name}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{row.patient_name}</div>
                    <div className="text-gray-500 text-xs">{row.patient_phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.patient_dob ? new Date(row.patient_dob).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.patient_gender === 'erkak' ? 'Erkak' : row.patient_gender === 'ayol' ? 'Ayol' : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {row.referring_doctor || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {row.body_parts.length > 0 ? (
                        row.body_parts.map((part, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                            {part}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col gap-1">
                      {getPaymentBadge(row.charge_status)}
                      {row.charge_id && (
                        <span className="text-xs text-gray-500">
                          {Number(row.paid_amount).toLocaleString()} / {Number(row.total_amount).toLocaleString()} so'm
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {row.status === 'waiting' && (
                        <>
                          <button
                            onClick={() => updateStatus(row.id, 'completed')}
                            className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                          >
                            Yakunlash
                          </button>
                          <button
                            onClick={() => updateStatus(row.id, 'cancelled')}
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                          >
                            Bekor
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}