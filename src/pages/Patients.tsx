import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, X, Loader2, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { ApiPatient, Paginated, ApiDoctor, ApiService } from '@/lib/types';
import { printCombinedReceipt } from '@/lib/appointmentQueuePrinter';

interface PatientWithVisits extends ApiPatient {
  last_visit?: string;
}

interface ServiceOption {
  id: number;
  name: string;
  price: string;
  is_active: boolean;
}

interface ServiceWithOptions extends ApiService {
  options: ServiceOption[];
}

interface StaffOptions {
  doctors: ApiDoctor[];
  services: ServiceWithOptions[];
}

const months = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
];

function EditPatientModal({
  patient,
  onClose,
  onSuccess
}: {
  patient: PatientWithVisits;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState(`${patient.first_name} ${patient.last_name}`.trim());
  const [middleName, setMiddleName] = useState(patient.middle_name || '');
  const [phone, setPhone] = useState(patient.phone || '');
  const [gender, setGender] = useState(patient.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(patient.date_of_birth || '');
  const [address, setAddress] = useState(patient.address || '');
  const [passportId, setPassportId] = useState((patient as any).passport_id || '');
  const [notes, setNotes] = useState((patient as any).notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : firstName;

      await apiRequest(`/patients/${patient.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName.trim(),
          phone: phone.trim(),
          gender,
          date_of_birth: dateOfBirth || null,
          address: address.trim(),
          passport_id: passportId.trim(),
          notes: notes.trim(),
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.detail || err.first_name?.[0] || err.last_name?.[0] || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Bemor ma'lumotlarini tahrirlash</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FIO (To'liq ism) *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Masalan: Ahmad Qodirov"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Otasining ismi</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jinsi</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Tanlang</option>
                  <option value="male">Erkak</option>
                  <option value="female">Ayol</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tug'ilgan sana</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pasport ID</label>
                <input
                  type="text"
                  value={passportId}
                  onChange={(e) => setPassportId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eslatmalar</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm text-white hover:bg-teal-600 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Saqlash
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function NewAppointmentModal({
  patient,
  onClose,
  onSuccess
}: {
  patient: PatientWithVisits;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [doctors, setDoctors] = useState<ApiDoctor[]>([]);
  const [services, setServices] = useState<ServiceWithOptions[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number | ''>('');
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [serviceOptions, setServiceOptions] = useState<Record<number, number[]>>({});
  const [complaint, setComplaint] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitResult, setSubmitResult] = useState<{
    patient_name: string;
    patient_birth_year?: number | null;
    queue_number: string;
    doctor_name: string;
    appointment_charge_total: number;
    service_queue_tickets: Array<{
      id: number;
      service_id: number;
      service_name: string;
      queue_code: string;
      queue_date: string;
      status: string;
      patient_name: string;
    }>;
  } | null>(null);

  useEffect(() => {
    const loadStaffOptions = async () => {
      try {
        const data = await apiRequest<StaffOptions>('/appointments/staff-options/');
        setDoctors(data.doctors || []);
        setServices(data.services || []);
      } catch (err) {
        console.error('Failed to load staff options:', err);
      }
    };
    loadStaffOptions();
  }, []);

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    if (!selectedServices.includes(serviceId)) {
      setServiceOptions(prev => ({ ...prev, [serviceId]: [] }));
    }
  };

  const handleOptionToggle = (serviceId: number, optionId: number) => {
    setServiceOptions(prev => {
      const current = prev[serviceId] || [];
      return {
        ...prev,
        [serviceId]: current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId]
      };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const serviceOptionsPayload = Object.entries(serviceOptions)
        .filter(([_, opts]) => opts.length > 0)
        .map(([serviceId, optionIds]) => ({
          service_id: parseInt(serviceId),
          option_ids: optionIds
        }));

      const result = await apiRequest<{
        patient_name: string;
        queue_number: string;
        doctor_name: string;
        appointment_charge_total: number;
        service_queue_tickets: Array<{
          id: number;
          service_id: number;
          service_name: string;
          queue_code: string;
          queue_date: string;
          status: string;
          patient_name: string;
        }>;
      }>('/appointments/create-for-patient/', {
        method: 'POST',
        body: JSON.stringify({
          patient: patient.id,
          doctor: selectedDoctor || null,
          service_ids: selectedServices,
          service_options: serviceOptionsPayload,
          complaint: complaint
        })
      });

      setSubmitResult(result);

      printCombinedReceipt({
        doctor_queue: result.queue_number ? {
          queue_number: result.queue_number,
          patient_name: result.patient_name,
          doctor_name: result.doctor_name || '',
          amount: result.appointment_charge_total,
          birth_year: result.patient_birth_year,
        } : undefined,
        service_tickets: result.service_queue_tickets?.map(t => ({
          ...t,
          birth_year: result.patient_birth_year,
        })),
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.detail || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Yangi qabul - {patient.first_name} {patient.last_name}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {submitResult && (
            <div className="mb-4 rounded-md bg-teal-50 p-3 text-sm text-teal-700">
              Ro'yxatga olindi!
              {submitResult.queue_number && <span className="ml-2 font-medium">Navbat: {submitResult.queue_number}</span>}
              {submitResult.doctor_name && <span className="ml-2">Shifokor: {submitResult.doctor_name}</span>}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shifokor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Shifokor tanlang</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} - {doc.specialty} ({doc.appointment_price} sum)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xizmatlar
              </label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                {services.map(service => (
                  <div key={service.id} className="flex flex-col">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {service.name} - {service.price === '0' ? '(bepul)' : `${service.price} sum`}
                      </span>
                    </label>
                    {service.has_options && selectedServices.includes(service.id) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {service.options?.map(opt => (
                          <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={serviceOptions[service.id]?.includes(opt.id) || false}
                              onChange={() => handleOptionToggle(service.id, opt.id)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs text-gray-600">
                              {opt.name} - {opt.price} sum
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shikoyat / Sabab
              </label>
              <textarea
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Shikoyatni kiriting..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Qo'shish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Patients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<PatientWithVisits[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithVisits | null>(null);
  const [editingPatient, setEditingPatient] = useState<PatientWithVisits | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const loadPatients = useCallback(async (page: number, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const data = await apiRequest<Paginated<PatientWithVisits>>(`/patients/?${params.toString()}`);
      setPatients(data.results || []);
      setTotalCount(data.count || 0);
    } catch {
      setPatients([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients(currentPage, searchTerm);
  }, [currentPage, searchTerm, refreshKey, loadPatients]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleAppointmentSuccess = () => {
    setRefreshKey(k => k + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div>
      {selectedPatient && (
        <NewAppointmentModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onSuccess={handleAppointmentSuccess}
        />
      )}

      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSuccess={handleAppointmentSuccess}
        />
      )}

      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Bemorlar
          </h2>
          <p className="mt-1 text-sm text-gray-500">Klinika bemorlarining to'liq ro'yxati va ularning ma'lumotlari.</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative rounded-md shadow-sm max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
            placeholder="Ism yoki telefon raqami orqali qidirish..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">F.I.SH.</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Telefon</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Jinsi / Tug'ilgan sanasi</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Manzil</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Amallar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                        <p className="mt-2">Yuklanmoqda...</p>
                      </td>
                    </tr>
                  ) : patients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        Bemorlar topilmadi
                      </td>
                    </tr>
                  ) : (
                    patients.map((person) => (
                      <tr key={person.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {person.first_name} {person.last_name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.phone || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {person.gender === 'male' ? 'Erkak' : person.gender === 'female' ? 'Ayol' : person.gender || '-'}, {person.date_of_birth || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.address || '-'}</td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => setSelectedPatient(person)}
                              className="text-teal-700 hover:text-teal-900 font-medium"
                            >
                              + Qabul
                            </button>
                            <button
                              onClick={() => setEditingPatient(person)}
                              className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-800 font-medium"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Tahrirlash
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {totalCount > pageSize && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Jami: {totalCount} bemor | Sahifa {currentPage} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Oldingi
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keyingi
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
