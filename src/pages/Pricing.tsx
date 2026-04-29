import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { ApiDoctor, ApiService, ApiServiceOption, Paginated } from '@/lib/types';

type ServiceForm = {
  code: string;
  name: string;
  category: string;
  price: string;
  has_options: boolean;
};

export function Pricing() {
  const [services, setServices] = useState<ApiService[]>([]);
  const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
  const [form, setForm] = useState<ServiceForm>({ code: '', name: '', category: '', price: '', has_options: false });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [doctorPrices, setDoctorPrices] = useState<Record<number, string>>({});

  const [optionsModalService, setOptionsModalService] = useState<ApiService | null>(null);
  const [optionForm, setOptionForm] = useState({ name: '', price: '' });

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
      has_options: form.has_options,
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

    setForm({ code: '', name: '', category: '', price: '', has_options: false });
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
      has_options: item.has_options || false,
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

  const addOption = async () => {
    if (!optionsModalService || !optionForm.name || !optionForm.price) return;
    await apiRequest(`/services/${optionsModalService.id}/options/`, {
      method: 'POST',
      body: JSON.stringify({ name: optionForm.name, price: optionForm.price, is_active: true }),
    });
    setOptionForm({ name: '', price: '' });
    await loadServices();
    const updated = services.find((s) => s.id === optionsModalService.id);
    if (updated) setOptionsModalService(updated);
  };

  const deleteOption = async (optionId: number) => {
    if (!optionsModalService) return;
    await apiRequest(`/services/${optionsModalService.id}/options/${optionId}/`, {
      method: 'DELETE',
    });
    await loadServices();
    const updated = services.find((s) => s.id === optionsModalService.id);
    if (updated) setOptionsModalService(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Xizmat narxlari</h2>
        <p className="text-sm text-gray-500">Xizmat qo'shish va narxini o'zgartirish (EKG, UZI va boshqalar).</p>
      </div>

      <form onSubmit={saveService} className="bg-white rounded-lg border border-gray-200 shadow p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="border rounded px-3 py-2" placeholder="Kod" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Xizmat nomi" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="border rounded px-3 py-2" placeholder="Kategoriya" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="border rounded px-3 py-2" placeholder="Narxi" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={form.has_options} onChange={(e) => setForm({ ...form, has_options: e.target.checked })} />
            Variantlari bor
          </label>
        </div>
        <button className="rounded bg-teal-700 text-white px-4 py-2 hover:bg-teal-600 md:col-span-5 w-fit" type="submit">
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
              <th className="px-4 py-3 text-left text-sm font-semibold">Variantlar</th>
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
                  {s.has_options ? (
                    <button
                      className="text-teal-700 hover:underline text-sm"
                      onClick={() => setOptionsModalService(s)}
                    >
                      {s.options?.length || 0} ta variant
                    </button>
                  ) : (
                    <span className="text-gray-400">Yo'q</span>
                  )}
                </td>
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

      {optionsModalService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{optionsModalService.name} - Variantlar</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setOptionsModalService(null)}>
                ✕
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                className="border rounded px-3 py-2 flex-1"
                placeholder="Variant nomi (masalan: Bosh)"
                value={optionForm.name}
                onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 w-24"
                placeholder="Narxi"
                type="number"
                min={0}
                value={optionForm.price}
                onChange={(e) => setOptionForm({ ...optionForm, price: e.target.value })}
              />
              <button className="rounded bg-teal-700 text-white px-4 py-2 hover:bg-teal-600" onClick={addOption}>
                +
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {optionsModalService.options?.map((opt) => (
                <div key={opt.id} className="flex justify-between items-center border rounded px-3 py-2">
                  <span>{opt.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-teal-700 font-medium">{Number(opt.price).toLocaleString()} so'm</span>
                    <button className="text-red-600 hover:text-red-800 text-sm" onClick={() => deleteOption(opt.id)}>
                      O'chirish
                    </button>
                  </div>
                </div>
              ))}
              {(!optionsModalService.options || optionsModalService.options.length === 0) && (
                <p className="text-gray-500 text-center py-4">Variantlar yo'q</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}