import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { ApiPatient, Paginated } from '@/lib/types';

export function Patients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<ApiPatient[]>([]);

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

  return (
    <div>
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
                      <span className="sr-only">Tahrirlash</span>
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
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">-</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <a href="#" className="text-teal-700 hover:text-blue-900">
                          Ko'rish<span className="sr-only">, {person.first_name} {person.last_name}</span>
                        </a>
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
