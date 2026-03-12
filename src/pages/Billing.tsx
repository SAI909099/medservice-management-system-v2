import React, { useEffect, useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { ApiCharge, Paginated } from '@/lib/types';

export function Billing() {
  const [charges, setCharges] = useState<ApiCharge[]>([]);

  useEffect(() => {
    apiRequest<Paginated<ApiCharge>>('/charges/')
      .then((res) => setCharges(res.results || []))
      .catch(() => setCharges([]));
  }, []);

  const statusLabel: Record<string, string> = {
    unpaid: 'To‘lanmadi',
    partial: 'Qisman',
    paid: 'To‘landi',
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            To'lovlar va Billing
          </h2>
          <p className="mt-1 text-sm text-gray-500">Bemorlar to'lovlari, qarzlar va moliyaviy amaliyotlar hisobi.</p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button type="button" className="inline-flex items-center justify-center rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600">
            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            Yangi to'lov qabul qilish
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Bemor</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Sana</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Umumiy summa</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">To'landi</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Qarz</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">To'lov usuli</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Holat</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Chek</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {charges.map((charge) => (
                    <tr key={charge.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">Bemor #{charge.patient}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{new Date(charge.created_at).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">{Number(charge.total_amount).toLocaleString()} UZS</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600 font-medium">{Number(charge.paid_amount).toLocaleString()} UZS</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-red-600 font-medium">
                        {Math.max(Number(charge.total_amount) - Number(charge.paid_amount), 0).toLocaleString()} UZS
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">-</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          charge.status === 'paid' ? 'bg-green-100 text-green-800' :
                          charge.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {statusLabel[charge.status] || charge.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button className="text-gray-400 hover:text-gray-600">
                          <Printer className="h-5 w-5" aria-hidden="true" />
                        </button>
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
