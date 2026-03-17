import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Paginated } from '@/lib/types';
import { printServiceQueueTickets } from '@/lib/serviceQueuePrinter';

type DoctorOption = {
  id: number;
  full_name: string;
  specialty: string;
  appointment_price: string;
  clinic_id: number | null;
};

type LabStaffOption = {
  id: number;
  full_name: string;
};

type ServiceOption = {
  id: number;
  name: string;
  category: string;
  price: string;
};

type StaffOptionsResponse = {
  doctors: DoctorOption[];
  lab_staff: LabStaffOption[];
  services: ServiceOption[];
};

type AppointmentItem = {
  id: number;
  patient_name: string;
  patient_gender: string;
  patient_date_of_birth: string | null;
  doctor_name: string;
  scheduled_at: string;
  status: string;
};

type ServiceQueueTicket = {
  id: number;
  service_id: number;
  service_name: string;
  queue_code: string;
  queue_date: string;
  status: string;
  patient_name: string;
};

type RegistrationForm = {
  first_name: string;
  last_name: string;
  gender: string;
  birth_year: string;
  phone: string;
  address: string;
  reason: string;
  doctor: string;
  service_ids: number[];
};

function extractApiError(error: unknown): string {
  if (!error || typeof error !== 'object') return "Ro'yxatga olishda xatolik yuz berdi.";
  const e = error as Record<string, unknown>;
  if (typeof e.detail === 'string') return e.detail;
  for (const value of Object.values(e)) {
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
    if (typeof value === 'string') return value;
  }
  return "Ro'yxatga olishda xatolik yuz berdi.";
}

export function Appointments() {
  const [form, setForm] = useState<RegistrationForm>({
    first_name: '',
    last_name: '',
    gender: '',
    birth_year: '',
    phone: '',
    address: '',
    reason: '',
    doctor: '',
    service_ids: [],
  });
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [labStaff, setLabStaff] = useState<LabStaffOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [lastQueueTickets, setLastQueueTickets] = useState<ServiceQueueTicket[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const totalAmount = useMemo(() => {
    const doctorPrice = Number(doctors.find((d) => String(d.id) === form.doctor)?.appointment_price || 0);
    const servicesTotal = services
      .filter((service) => form.service_ids.includes(service.id))
      .reduce((acc, service) => acc + Number(service.price || 0), 0);
    return doctorPrice + servicesTotal;
  }, [doctors, services, form.doctor, form.service_ids]);

  const loadInitial = async () => {
    const [staffRes, appointmentRes] = await Promise.all([
      apiRequest<StaffOptionsResponse>('/appointments/staff-options/'),
      apiRequest<Paginated<AppointmentItem>>('/appointments/'),
    ]);
    setDoctors(staffRes.doctors || []);
    setLabStaff(staffRes.lab_staff || []);
    setServices(staffRes.services || []);
    setAppointments(appointmentRes.results || []);
  };

  useEffect(() => {
    loadInitial().catch(() => {
      setDoctors([]);
      setLabStaff([]);
      setServices([]);
      setAppointments([]);
    });
  }, []);

  const toggleService = (serviceId: number) => {
    setForm((prev) => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter((id) => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }));
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const birthYearNum = form.birth_year ? Number(form.birth_year) : null;
      const registerRes = await apiRequest<{
        patient_id: number;
        appointment_id: number | null;
        created_charge_ids: number[];
        appointment_charge_total: string;
        service_charge_total: string;
        grand_total: string;
        service_queue_tickets: ServiceQueueTicket[];
      }>('/appointments/register/', {
        method: 'POST',
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          gender: form.gender,
          birth_year: birthYearNum,
          phone: form.phone,
          address: form.address,
          complaint: form.reason,
          doctor: form.doctor ? Number(form.doctor) : null,
          service_ids: form.service_ids,
        }),
      });

      setMessage(
        `Ro'yxatga olindi. Qabul: ${Number(registerRes.appointment_charge_total).toLocaleString()} so'm, ` +
          `Xizmatlar: ${Number(registerRes.service_charge_total).toLocaleString()} so'm, ` +
          `Jami: ${Number(registerRes.grand_total).toLocaleString()} so'm (to'lanmagan).`,
      );
      setLastQueueTickets(registerRes.service_queue_tickets || []);
      if (registerRes.service_queue_tickets?.length) {
        const printed = printServiceQueueTickets(registerRes.service_queue_tickets);
        if (!printed) {
          setMessage((prev) => `${prev} Navbat cheki popup blok bo'lgani uchun chiqmay qoldi.`);
        }
      }
      setForm({
        first_name: '',
        last_name: '',
        gender: '',
        birth_year: '',
        phone: '',
        address: '',
        reason: '',
        doctor: '',
        service_ids: [],
      });
      await loadInitial();
    } catch (error) {
      setMessage(extractApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ro'yxatga olish</h2>
        <p className="text-sm text-gray-500">Bemor ma'lumotlari, shifokor tanlash va xizmatlar bo'yicha jami to'lovni ko'rsatish.</p>
      </div>

      <form onSubmit={submitRegistration} className="bg-white rounded-lg border border-gray-200 shadow p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="border rounded px-3 py-2" placeholder="Ism" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          <input className="border rounded px-3 py-2" placeholder="Familiya" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          <select className="border rounded px-3 py-2" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} required>
            <option value="">Jinsini tanlang</option>
            <option value="erkak">Erkak</option>
            <option value="ayol">Ayol</option>
          </select>
          <input
            className="border rounded px-3 py-2"
            type="number"
            min={1900}
            max={new Date().getFullYear()}
            placeholder="Tug'ilgan yili (masalan: 1998)"
            value={form.birth_year}
            onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
          />
          <input className="border rounded px-3 py-2" placeholder="Telefon raqam" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Manzil" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="Tashrif sababi" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <select className="border rounded px-3 py-2" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })}>
            <option value="">Shifokorsiz (faqat xizmat)</option>
            <optgroup label="Shifokorlar">
              {doctors.map((d) => (
                <option key={`doc-${d.id}`} value={d.id}>
                  {d.full_name} ({d.specialty}) - {Number(d.appointment_price || 0).toLocaleString()} so'm
                </option>
              ))}
            </optgroup>
            <optgroup label="Lab xodimlari (faqat ko'rish)">
              {labStaff.map((s) => (
                <option key={`lab-${s.id}`} value="" disabled>
                  {s.full_name}
                </option>
              ))}
            </optgroup>
          </select>
          <div className="border rounded px-3 py-2 bg-teal-50 text-sm text-teal-800 flex items-center">
            Qabul vaqti: avtomatik hozirgi vaqt (now)
          </div>
          <div className="md:col-span-2 rounded border border-gray-200 p-3">
            <p className="mb-2 text-sm font-medium text-gray-700">Qo'shimcha xizmatlar (MRT, UZI va boshqalar)</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.service_ids.includes(service.id)}
                      onChange={() => toggleService(service.id)}
                    />
                    <span>{service.name}</span>
                  </span>
                  <span className="text-teal-700">{Number(service.price || 0).toLocaleString()} so'm</span>
                </label>
              ))}
              {services.length === 0 ? <p className="text-sm text-gray-500">Faol xizmatlar topilmadi.</p> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 border rounded px-4 py-3">
          <span className="font-medium">Jami to'lov summasi:</span>
          <span className="text-lg font-bold text-teal-700">{totalAmount.toLocaleString()} so'm</span>
        </div>

        {message ? <p className="text-sm text-teal-700">{message}</p> : null}
        {lastQueueTickets.length > 0 ? (
          <div className="rounded border border-indigo-200 bg-indigo-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-indigo-800">Xizmat navbat raqamlari</p>
              <button
                type="button"
                onClick={() => printServiceQueueTickets(lastQueueTickets)}
                className="rounded border border-indigo-300 bg-white px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
              >
                Print
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {lastQueueTickets.map((ticket) => (
                <span key={ticket.id} className="rounded bg-white px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200">
                  {ticket.service_name}: {ticket.queue_code}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <button disabled={submitting} className="rounded bg-teal-700 text-white px-4 py-2 hover:bg-teal-600 disabled:opacity-60" type="submit">
          {submitting ? "Saqlanmoqda..." : "Ro'yxatga olish"}
        </button>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 shadow p-4">
        <h3 className="font-semibold mb-3">So'nggi ro'yxatga olishlar</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Bemor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Jinsi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Tug'ilgan yili</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Shifokor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Sana</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Holat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-sm">{a.patient_name}</td>
                <td className="px-4 py-3 text-sm">{a.patient_gender || '-'}</td>
                <td className="px-4 py-3 text-sm">{a.patient_date_of_birth ? new Date(a.patient_date_of_birth).getFullYear() : '-'}</td>
                <td className="px-4 py-3 text-sm">{a.doctor_name}</td>
                <td className="px-4 py-3 text-sm">{new Date(a.scheduled_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
