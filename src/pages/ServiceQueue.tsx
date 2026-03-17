import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { printServiceQueueTickets } from '@/lib/serviceQueuePrinter';

type ServiceOption = {
  id: number;
  name: string;
  category: string;
  price: string;
};

type ServiceQueueTicket = {
  id: number;
  patient: number;
  patient_name: string;
  service: number;
  service_name: string;
  appointment: number | null;
  queue_date: string;
  sequence_number: number;
  queue_code: string;
  status: 'waiting' | 'completed' | 'cancelled';
  created_at: string;
};

type StaffOptionsResponse = {
  services: ServiceOption[];
};

type Paginated<T> = {
  results: T[];
};

export function ServiceQueue() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [rows, setRows] = useState<ServiceQueueTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [status, setStatus] = useState<'all' | 'waiting' | 'completed' | 'cancelled'>('all');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (serviceId) params.set('service_id', serviceId);
      if (status !== 'all') params.set('status', status);
      const res = await apiRequest<Paginated<ServiceQueueTicket>>(`/appointments/service-queue/?${params.toString()}`);
      setRows(res.results || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiRequest<StaffOptionsResponse>('/appointments/staff-options/')
      .then((res) => setServices(res.services || []))
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    load();
  }, [serviceId, status, date]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Xizmat navbati</h2>
        <p className="text-sm text-gray-500">Xizmatlar bo'yicha kunlik navbat raqamlari (A001/B001).</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          className="border rounded px-3 py-2"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select className="border rounded px-3 py-2" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          <option value="">Barcha xizmatlar</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <select className="border rounded px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as 'all' | 'waiting' | 'completed' | 'cancelled')}>
          <option value="all">Barcha holatlar</option>
          <option value="waiting">Kutilmoqda</option>
          <option value="completed">Tugallangan</option>
          <option value="cancelled">Bekor qilingan</option>
        </select>
        <button
          type="button"
          onClick={() => printServiceQueueTickets(rows)}
          className="rounded border border-indigo-300 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          Print ro'yxat
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Navbat</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bemor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Xizmat</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sana</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Vaqt</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Holat</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-sm font-semibold text-indigo-700">{row.queue_code}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.patient_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.service_name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.queue_date}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{new Date(row.created_at).toLocaleTimeString()}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{row.status}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <button
                    type="button"
                    onClick={() => printServiceQueueTickets([row])}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? <p className="px-4 py-3 text-sm text-gray-500">Yuklanmoqda...</p> : null}
        {!loading && rows.length === 0 ? <p className="px-4 py-3 text-sm text-gray-500">Navbat yozuvlari topilmadi.</p> : null}
      </div>
    </div>
  );
}
