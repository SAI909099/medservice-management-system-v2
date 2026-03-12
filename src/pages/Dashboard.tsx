import React, { useEffect, useMemo, useState } from 'react';
import { Users, Calendar, Activity, CreditCard } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { ApiAppointment, ApiCharge, ApiPatient, Paginated } from '@/lib/types';

export function Dashboard() {
  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
  const [charges, setCharges] = useState<ApiCharge[]>([]);

  useEffect(() => {
    const load = async () => {
      const [patientsRes, appointmentsRes, chargesRes] = await Promise.all([
        apiRequest<Paginated<ApiPatient>>('/patients/?page_size=5'),
        apiRequest<Paginated<ApiAppointment>>('/appointments/?page_size=5'),
        apiRequest<Paginated<ApiCharge>>('/charges/?page_size=20'),
      ]);
      setPatients(patientsRes.results || []);
      setAppointments(appointmentsRes.results || []);
      setCharges(chargesRes.results || []);
    };

    load().catch(() => {
      setPatients([]);
      setAppointments([]);
      setCharges([]);
    });
  }, []);

  const dailyRevenue = useMemo(
    () => charges.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0),
    [charges],
  );

  const stats = [
    { name: 'Jami bemorlar', stat: patients.length.toString(), icon: Users, color: 'bg-teal-500' },
    { name: 'Bugungi qabullar', stat: appointments.length.toString(), icon: Calendar, color: 'bg-cyan-500' },
    { name: 'Kutayotgan tahlillar', stat: '12', icon: Activity, color: 'bg-emerald-500' },
    { name: 'Kunlik tushum', stat: `${dailyRevenue.toLocaleString()} UZS`, icon: CreditCard, color: 'bg-teal-700' },
  ];

  const appointmentStatusLabel: Record<string, string> = {
    pending: 'Kutilmoqda',
    in_progress: 'Jarayonda',
    completed: 'Yakunlandi',
    cancelled: 'Bekor qilingan',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight mb-6">
        Boshqaruv Paneli
      </h2>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="relative overflow-hidden rounded-lg bg-white/90 border border-teal-100 px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6">
            <dt>
              <div className={`absolute rounded-md ${item.color} p-3`}>
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{item.stat}</p>
            </dd>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Appointments */}
        <div className="bg-white/90 border border-teal-100 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">So'nggi qabullar</h3>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {appointments.slice(0, 4).map((apt) => (
                <li key={apt.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{apt.patient_name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {apt.doctor_name} - {new Date(apt.scheduled_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                        apt.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointmentStatusLabel[apt.status] || apt.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white/90 border border-teal-100 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">So'nggi to'lovlar</h3>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {charges.slice(0, 4).map((charge) => (
                <li key={charge.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">Charge #{charge.id}</p>
                      <p className="text-sm text-gray-500 truncate">{new Date(charge.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{Number(charge.paid_amount).toLocaleString()} UZS</p>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        charge.status === 'paid' ? 'bg-green-100 text-green-800' :
                        charge.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {charge.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
