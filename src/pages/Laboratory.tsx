import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface LabReferral {
  id: number;
  patient: number;
  doctor: number | null;
  service: number;
  status: string;
  result_text: string;
  result_at: string | null;
}

interface Paginated<T> {
  results: T[];
}

export function Laboratory() {
  const [items, setItems] = useState<LabReferral[]>([]);

  useEffect(() => {
    apiRequest<Paginated<LabReferral>>('/lab-referrals/')
      .then((res) => setItems(res.results || []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Laboratoriya</h2>
        <p className="text-sm text-gray-500">Yo‘llanma holatlari va natijalar.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bemor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Xizmat</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Holat</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Natija</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-gray-900">#{item.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">#{item.patient}</td>
                <td className="px-4 py-3 text-sm text-gray-600">#{item.service}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.status}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.result_text || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
