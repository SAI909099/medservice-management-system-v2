import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Paginated } from '@/lib/types';

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

type StaffOptionsResponse = {
  doctors: DoctorOption[];
  lab_staff: LabStaffOption[];
};

type AppointmentItem = {
  id: number;
  patient_name: string;
  doctor_name: string;
  scheduled_at: string;
  status: string;
};

type RegistrationForm = {
  first_name: string;
  last_name: string;
  age: string;
  phone: string;
  address: string;
  reason: string;
  doctor: string;
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
  const { user } = useAuth();
  const [form, setForm] = useState<RegistrationForm>({
    first_name: '',
    last_name: '',
    age: '',
    phone: '',
    address: '',
    reason: '',
    doctor: '',
  });
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [labStaff, setLabStaff] = useState<LabStaffOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const totalAmount = useMemo(
    () => {
      const doctorPrice = Number(doctors.find((d) => String(d.id) === form.doctor)?.appointment_price || 0);
      return doctorPrice;
    },
    [doctors, form.doctor],
  );

  const loadInitial = async () => {
    const [staffRes, appointmentRes] = await Promise.all([
      apiRequest<StaffOptionsResponse>('/appointments/staff-options/'),
      apiRequest<Paginated<AppointmentItem>>('/appointments/'),
    ]);
    setDoctors(staffRes.doctors || []);
    setLabStaff(staffRes.lab_staff || []);
    setAppointments(appointmentRes.results || []);
  };

  useEffect(() => {
    loadInitial().catch(() => {
      setDoctors([]);
      setLabStaff([]);
      setAppointments([]);
    });
  }, []);

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const selectedDoctor = doctors.find((d) => String(d.id) === form.doctor);
      if (!selectedDoctor) {
        setMessage("Shifokor topilmadi. Qayta tanlang.");
        setSubmitting(false);
        return;
      }
      const clinicId = selectedDoctor.clinic_id ?? user?.clinic ?? null;

      const patient = await apiRequest<{ id: number }>('/patients/', {
        method: 'POST',
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          age: form.age ? Number(form.age) : null,
          phone: form.phone,
          address: form.address,
          ...(clinicId ? { clinic: clinicId } : {}),
        }),
      });

      const appointment = await apiRequest<{ id: number }>('/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          patient: patient.id,
          doctor: selectedDoctor.id,
          complaint: form.reason,
        }),
      });

      const doctor = selectedDoctor;
      const items = [
        ...(doctor && Number(doctor.appointment_price) > 0
          ? [{
              description: `Qabul: ${doctor.full_name}`,
              quantity: 1,
              unit_price: doctor.appointment_price,
              total_price: doctor.appointment_price,
            }]
          : []),
      ];

      if (items.length > 0) {
        await apiRequest('/charges/', {
          method: 'POST',
          body: JSON.stringify({
            patient: patient.id,
            appointment: appointment.id,
            notes: form.reason,
            items,
          }),
        });
      }

      setMessage(`Ro'yxatga olindi. Jami to'lov: ${totalAmount.toLocaleString()} so'm (to'lanmagan).`);
      setForm({
        first_name: '',
        last_name: '',
        age: '',
        phone: '',
        address: '',
        reason: '',
        doctor: '',
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Ism" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          <input className="border rounded px-3 py-2" placeholder="Familiya" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          <input className="border rounded px-3 py-2" type="number" min={0} placeholder="Yosh" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="Telefon raqam" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Manzil" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <textarea className="border rounded px-3 py-2 md:col-span-2" placeholder="Tashrif sababi" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <select className="border rounded px-3 py-2" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} required>
            <option value="">Shifokorni tanlang</option>
            <optgroup label="Shifokorlar">
              {doctors.map((d) => (
                <option key={`doc-${d.id}`} value={d.id}>
                  {d.full_name} ({d.specialty}) - {Number(d.appointment_price || 0).toLocaleString()} so'm
                </option>
              ))}
            </optgroup>
            <optgroup label="Lab xodimlari (faqat ko'rish)">
              {labStaff.map((s) => (
                <option key={`lab-${s.id}`} value="" disabled>{s.full_name}</option>
              ))}
            </optgroup>
          </select>
          <div className="border rounded px-3 py-2 bg-teal-50 text-sm text-teal-800 flex items-center">
            Qabul vaqti: avtomatik hozirgi vaqt (now)
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 border rounded px-4 py-3">
          <span className="font-medium">Jami to'lov summasi:</span>
          <span className="text-lg font-bold text-teal-700">{totalAmount.toLocaleString()} so'm</span>
        </div>

        {message ? <p className="text-sm text-teal-700">{message}</p> : null}

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
              <th className="px-4 py-3 text-left text-sm font-semibold">Shifokor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Sana</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Holat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-sm">{a.patient_name}</td>
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
