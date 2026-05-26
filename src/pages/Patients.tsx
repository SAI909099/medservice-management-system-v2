import React, { useEffect, useState } from 'react';
import { Plus, Search, X, Loader2, Printer } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { ApiPatient, Paginated, ApiDoctor, ApiService } from '@/lib/types';
import { printServiceQueueTickets } from '@/lib/serviceQueuePrinter';
import { printAppointmentQueue } from '@/lib/appointmentQueuePrinter';

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

      if (result.service_queue_tickets?.length) {
        printServiceQueueTickets(result.service_queue_tickets);
      }
      if (result.queue_number) {
        printAppointmentQueue({
          queue_number: result.queue_number,
          patient_name: result.patient_name,
          doctor_name: result.doctor_name || '',
          amount: result.appointment_charge_total,
        });
      }

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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadPatients = async () => {
      const query = searchTerm.trim();
      const data = await apiRequest<Paginated<ApiPatient>>(
        `/patients/${query ? `?search=${encodeURIComponent(query)}` : ''}`,
      );
      setPatients(data.results || []);
    };
    loadPatients().catch(() => setPatients([]));
  }, [searchTerm]);

  const handleAppointmentSuccess = () => {
    setRefreshKey(k => k + 1);
  };

  useEffect(() => {
    const loadPatients = async () => {
      const query = searchTerm.trim();
      const data = await apiRequest<Paginated<ApiPatient>>(
        `/patients/${query ? `?search=${encodeURIComponent(query)}` : ''}`,
      );
      setPatients(data.results || []);
    };
    loadPatients().catch(() => setPatients([]));
  }, [searchTerm, refreshKey]);

  return (
    <div>
      {selectedPatient && (
        <NewAppointmentModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
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
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button type="button" className="inline-flex items-center justify-center rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Yangi bemor qo'shish
          </button>
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Oxirgi tashrif</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Amallar</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {patients.map((person) => (
                    <tr key={person.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {person.first_name} {person.last_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.phone}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.gender || '-'}, {person.date_of_birth || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.address}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.last_visit || '-'}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setSelectedPatient(person)}
                            className="text-teal-700 hover:text-teal-900 font-medium"
                          >
                            + Qabul
                          </button>
                          <a href="#" className="text-teal-700 hover:text-blue-900">
                            Ko'rish
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}