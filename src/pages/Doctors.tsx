import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface DoctorItem {
  id: number;
  user_full_name: string;
  specialty: string;
  is_active: boolean;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface WorkItem {
  id: number;
  scheduled_at: string;
  patient_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  complaint: string;
}

interface AppointmentDetail {
  id: number;
  patient_name: string;
  doctor_name: string;
  scheduled_at: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  complaint: string;
  notes: string;
  created_at: string;
}

export function Doctors() {
  const { user } = useAuth();
  const isDoctorRole = user?.role?.name === 'doctor';

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [worklist, setWorklist] = useState<WorkItem[]>([]);

  const [todayOnly, setTodayOnly] = useState(true);
  const [search, setSearch] = useState('');

  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDoctorList = async () => {
    const res = await apiRequest<Paginated<DoctorItem>>('/doctors/');
    setDoctors(res.results || []);
  };

  const loadWorklist = async () => {
    setLoading(true);
    try {
      if (isDoctorRole) {
        const params = new URLSearchParams();
        params.set('today', todayOnly ? '1' : '0');
        params.set('page', String(page));
        params.set('page_size', String(pageSize));
        if (search.trim()) params.set('search', search.trim());

        const res = await apiRequest<Paginated<WorkItem>>(`/doctors/my-worklist/?${params.toString()}`);
        setWorklist(res.results || []);
        setTotalCount(res.count || 0);
      } else if (selectedDoctor) {
        const res = await apiRequest<any[]>(`/doctors/${selectedDoctor}/worklist/`);
        const normalized: WorkItem[] = (res || []).map((x: any) => ({
          id: x.appointment_id,
          scheduled_at: x.scheduled_at,
          patient_name: x.patient,
          status: x.status,
          complaint: x.complaint,
        }));
        setWorklist(normalized);
        setTotalCount(normalized.length);
      } else {
        setWorklist([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [todayOnly, search, isDoctorRole]);

  useEffect(() => {
    if (isDoctorRole) {
      const timer = setTimeout(() => {
        loadWorklist().catch(() => {
          setWorklist([]);
          setTotalCount(0);
        });
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [todayOnly, search, isDoctorRole, page]);

  useEffect(() => {
    if (isDoctorRole) return;
    loadDoctorList().catch(() => setDoctors([]));
  }, [isDoctorRole]);

  useEffect(() => {
    if (!isDoctorRole && selectedDoctor) {
      loadWorklist().catch(() => {
        setWorklist([]);
        setTotalCount(0);
      });
    }
  }, [selectedDoctor, isDoctorRole]);

  const filteredWorklist = useMemo(() => {
    return worklist.filter((w) => {
      if (!showCompleted && w.status === 'completed') return false;
      if (!showCancelled && w.status === 'cancelled') return false;
      return true;
    });
  }, [worklist, showCompleted, showCancelled]);

  const updateStatus = async (item: WorkItem, status: WorkItem['status']) => {
    await apiRequest(`/appointments/${item.id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await loadWorklist();
    if (selectedAppointment?.id === item.id) {
      await openDetails(item.id);
    }
  };

  const openDetails = async (appointmentId: number) => {
    setDetailLoading(true);
    try {
      const detail = await apiRequest<AppointmentDetail>(`/appointments/${appointmentId}/`);
      setSelectedAppointment(detail);
    } finally {
      setDetailLoading(false);
    }
  };

  const statusLabel: Record<WorkItem['status'], string> = {
    pending: 'Kutilmoqda',
    in_progress: 'Jarayonda',
    completed: 'Yakunlandi',
    cancelled: 'Bekor qilingan',
  };
  const statusClass: Record<WorkItem['status'], string> = {
    pending: 'bg-amber-100 text-amber-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Shifokor sahifasi</h2>
        <p className="text-sm text-gray-500">Bugungi qabullar, qidiruv, filter, pagination va tezkor holat yangilash.</p>
      </div>

      {!isDoctorRole ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow p-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Shifokorni tanlang:</label>
            <select
              className="border rounded px-3 py-2"
              value={selectedDoctor ?? ''}
              onChange={(e) => setSelectedDoctor(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Tanlang</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.user_full_name} ({doc.specialty})</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} />
            Faqat bugungi qabullar
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
            Yakunlanganlar
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
            Bekor qilinganlar
          </label>
          <input
            className="border rounded px-3 py-2 text-sm md:col-span-2"
            placeholder="Bemor yoki tashrif sababi bo'yicha qidirish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Qabullar ro'yxati</h3>
          {loading ? <span className="text-sm text-gray-500">Yuklanmoqda...</span> : null}
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bemor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Vaqt</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Tashrif sababi</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Holat</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredWorklist.map((w) => (
              <tr key={w.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{w.patient_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(w.scheduled_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{w.complaint || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusClass[w.status]}`}>
                    {statusLabel[w.status] || w.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => updateStatus(w, 'in_progress')} className="rounded bg-amber-100 px-2 py-1 text-xs hover:bg-amber-200">Jarayonga o'tkazish</button>
                    <button onClick={() => updateStatus(w, 'completed')} className="rounded bg-emerald-100 px-2 py-1 text-xs hover:bg-emerald-200">Yakunlash</button>
                    <button onClick={() => updateStatus(w, 'cancelled')} className="rounded bg-red-100 px-2 py-1 text-xs hover:bg-red-200">Bekor qilish</button>
                    <button onClick={() => openDetails(w.id)} className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200">Batafsil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {isDoctorRole ? (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span>Jami: {totalCount} ta</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded border px-3 py-1 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Oldingi
              </button>
              <span>{page} / {maxPage}</span>
              <button
                className="rounded border px-3 py-1 disabled:opacity-50"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              >
                Keyingi
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {selectedAppointment ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-lg shadow-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Qabul tafsilotlari #{selectedAppointment.id}</h4>
              <button onClick={() => setSelectedAppointment(null)} className="text-sm rounded border px-2 py-1">Yopish</button>
            </div>
            {detailLoading ? (
              <p className="text-sm text-gray-500">Yuklanmoqda...</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Bemor:</span> {selectedAppointment.patient_name}</p>
                <p><span className="font-medium">Shifokor:</span> {selectedAppointment.doctor_name}</p>
                <p><span className="font-medium">Vaqt:</span> {new Date(selectedAppointment.scheduled_at).toLocaleString()}</p>
                <p>
                  <span className="font-medium">Holat:</span>{' '}
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusClass[selectedAppointment.status]}`}>
                    {statusLabel[selectedAppointment.status]}
                  </span>
                </p>
                <p><span className="font-medium">Tashrif sababi:</span> {selectedAppointment.complaint || '-'}</p>
                <p><span className="font-medium">Izoh:</span> {selectedAppointment.notes || '-'}</p>
                <p><span className="font-medium">Yaratilgan:</span> {new Date(selectedAppointment.created_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
