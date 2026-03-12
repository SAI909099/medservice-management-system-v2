import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { ApiDoctor, ApiService, Paginated } from '@/lib/types';

type ServiceForm = {
  code: string;
  name: string;
  category: string;
  price: string;
};

export function Pricing() {
  const [services, setServices] = useState<ApiService[]>([]);
  const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
  const [form, setForm] = useState<ServiceForm>({ code: '', name: '', category: '', price: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [doctorPrices, setDoctorPrices] = useState<Record<number, string>>({});

  const loadServices = async () => {
    const [serviceRes, doctorRes] = await Promise.all([
      apiRequest<Paginated<ApiService>>('/services/'),
      apiRequest<Paginated<ApiDoctor>>('/doctor-prices/'),
    ]);
    setServices(serviceRes.results || []);
    setDoctors(doctorRes.results || []);
    setDoctorPrices(
      (doctorRes.results || []).reduce<Record<number, string>>((acc, doctor) => {
        acc[doctor.id] = doctor.appointment_price || '0';
        return acc;
      }, {}),
    );
  };

  useEffect(() => {
    loadServices().catch(() => setServices([]));
  }, []);

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code,
      name: form.name,
      category: form.category,
      price: form.price,
      is_active: true,
    };

    if (editingId) {
      await apiRequest(`/services/${editingId}/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest('/services/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    setForm({ code: '', name: '', category: '', price: '' });
    setEditingId(null);
    await loadServices();
  };

  const editService = (item: ApiService) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      category: item.category || '',
      price: item.price,
    });
  };

  const saveDoctorPrice = async (doctorId: number) => {
    const value = doctorPrices[doctorId] ?? '0';
    await apiRequest(`/doctor-prices/${doctorId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ appointment_price: value }),
    });
    await loadServices();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Xizmat narxlari</h2>
        <p className="text-sm text-gray-500">Xizmat qo'shish va narxini o'zgartirish (EKG, UZI va boshqalar).</p>
      </div>

      <form onSubmit={saveService} className="bg-white rounded-lg border border-gray-200 shadow p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="border rounded px-3 py-2" placeholder="Kod" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Xizmat nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Kategoriya" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Narxi" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <button className="rounded bg-teal-700 text-white px-4 py-2 hover:bg-teal-600 md:col-span-4 w-fit" type="submit">
          {editingId ? 'Yangilash' : "Xizmat qo'shish"}
        </button>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 shadow p-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Kod</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Nomi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Kategoriya</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Narxi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {services.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-sm">{s.code}</td>
                <td className="px-4 py-3 text-sm">{s.name}</td>
                <td className="px-4 py-3 text-sm">{s.category || '-'}</td>
                <td className="px-4 py-3 text-sm">{Number(s.price).toLocaleString()} so'm</td>
                <td className="px-4 py-3 text-sm">
                  <button className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200" onClick={() => editService(s)}>
                    Tahrirlash
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow p-4">
        <h3 className="font-semibold mb-3">Shifokor qabul narxlari</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Shifokor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Mutaxassislik</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Qabul narxi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {doctors.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 text-sm">{d.user_full_name || `Shifokor #${d.id}`}</td>
                <td className="px-4 py-3 text-sm">{d.specialty}</td>
                <td className="px-4 py-3 text-sm">
                  <input
                    className="border rounded px-3 py-1 w-40"
                    type="number"
                    min={0}
                    value={doctorPrices[d.id] ?? '0'}
                    onChange={(e) => setDoctorPrices((prev) => ({ ...prev, [d.id]: e.target.value }))}
                  />
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    className="rounded bg-teal-700 text-white px-3 py-1 hover:bg-teal-600"
                    onClick={() => saveDoctorPrice(d.id)}
                  >
                    Saqlash
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
