import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface TreatmentArea {
  id: number;
  name: string;
  area_type: 'floor' | 'apartment';
  clinic: number;
  branch: number | null;
  is_active: boolean;
}

interface TreatmentRoom {
  id: number;
  name: string;
  clinic: number;
  branch: number | null;
  area: number | null;
  area_name?: string;
  area_type?: 'floor' | 'apartment';
  capacity: number;
  daily_price: string;
  is_active: boolean;
  occupied_count?: number;
  occupancy_status?: 'free' | 'partial' | 'full';
  current_patients?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
  }>;
}

interface TreatmentReferral {
  id: number;
  patient: number;
  room: number;
  room_name?: string;
  service_name: string;
  status: string;
}

interface Paginated<T> {
  results: T[];
}

interface ClinicOption {
  id: number;
  name: string;
}

interface BranchOption {
  id: number;
  clinic: number;
  name: string;
}

function extractApiError(error: unknown): string {
  if (!error || typeof error !== 'object') return "So'rovda xatolik yuz berdi.";
  const e = error as Record<string, unknown>;
  if (typeof e.detail === 'string') return e.detail;
  for (const [key, value] of Object.entries(e)) {
    if (Array.isArray(value) && value.length > 0) {
      return `${key}: ${String(value[0])}`;
    }
    if (typeof value === 'string') {
      return `${key}: ${value}`;
    }
  }
  return "So'rovda xatolik yuz berdi.";
}

export function TreatmentRooms() {
  const { user } = useAuth();
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [areas, setAreas] = useState<TreatmentArea[]>([]);
  const [rooms, setRooms] = useState<TreatmentRoom[]>([]);
  const [referrals, setReferrals] = useState<TreatmentReferral[]>([]);

  const [areaType, setAreaType] = useState<'floor' | 'apartment'>('floor');
  const [areaName, setAreaName] = useState('');
  const [areaSubmitting, setAreaSubmitting] = useState(false);

  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('1');
  const [dailyPrice, setDailyPrice] = useState('0');
  const [roomSubmitting, setRoomSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [selectedClinicId, setSelectedClinicId] = useState<string>(user?.clinic ? String(user.clinic) : '');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branch ? String(user.branch) : '');

  const canChooseClinic = !user?.clinic;
  const effectiveClinicId = user?.clinic ?? (selectedClinicId ? Number(selectedClinicId) : null);
  const effectiveBranchId = user?.branch ?? (selectedBranchId ? Number(selectedBranchId) : null);
  const filteredBranches = branches.filter((b) => b.clinic === effectiveClinicId);

  const loadData = async () => {
    const [areasRes, roomsRes, referralsRes, clinicsRes, branchesRes] = await Promise.all([
      apiRequest<Paginated<TreatmentArea>>('/treatment-areas/'),
      apiRequest<Paginated<TreatmentRoom>>('/treatment-rooms/'),
      apiRequest<Paginated<TreatmentReferral>>('/treatment-referrals/'),
      apiRequest<Paginated<ClinicOption>>('/clinics/'),
      apiRequest<Paginated<BranchOption>>('/branches/'),
    ]);
    setAreas(areasRes.results || []);
    setRooms(roomsRes.results || []);
    setReferrals(referralsRes.results || []);
    setClinics(clinicsRes.results || []);
    setBranches(branchesRes.results || []);
  };

  useEffect(() => {
    loadData().catch(() => {
      setAreas([]);
      setRooms([]);
      setReferrals([]);
    });
  }, []);

  const submitArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setAreaSubmitting(true);
    setMessage('');
    if (!effectiveClinicId) {
      setMessage('Iltimos, klinikani tanlang.');
      setAreaSubmitting(false);
      return;
    }
    try {
      await apiRequest('/treatment-areas/', {
        method: 'POST',
        body: JSON.stringify({
          area_type: areaType,
          name: areaName.trim(),
          clinic: effectiveClinicId,
          ...(effectiveBranchId ? { branch: effectiveBranchId } : {}),
        }),
      });
      setAreaName('');
      setMessage("Bo'lim qo'shildi.");
      await loadData();
    } catch (error) {
      setMessage(extractApiError(error));
    } finally {
      setAreaSubmitting(false);
    }
  };

  const submitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomSubmitting(true);
    setMessage('');
    if (!effectiveClinicId) {
      setMessage('Iltimos, klinikani tanlang.');
      setRoomSubmitting(false);
      return;
    }
    try {
      await apiRequest('/treatment-rooms/', {
        method: 'POST',
        body: JSON.stringify({
          area: Number(selectedAreaId),
          name: roomName.trim(),
          capacity: Number(roomCapacity || '1'),
          daily_price: dailyPrice || '0',
          clinic: effectiveClinicId,
          ...(effectiveBranchId ? { branch: effectiveBranchId } : {}),
        }),
      });
      setRoomName('');
      setRoomCapacity('1');
      setDailyPrice('0');
      setSelectedAreaId('');
      setMessage("Xona qo'shildi.");
      await loadData();
    } catch (error) {
      setMessage(extractApiError(error));
    } finally {
      setRoomSubmitting(false);
    }
  };

  const areaTypeLabel = (value: 'floor' | 'apartment') => (value === 'floor' ? 'Qavat' : 'Apartment');
  const occupancyLabel: Record<'free' | 'partial' | 'full', string> = {
    free: "Bo'sh",
    partial: 'Qisman',
    full: "To'liq",
  };
  const occupancyClass: Record<'free' | 'partial' | 'full', string> = {
    free: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-amber-100 text-amber-800',
    full: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Davolash xonalari</h2>
        <p className="text-sm text-gray-500">Qavat/apartment bo'yicha xonalar va kunlik to'lov boshqaruvi.</p>
      </div>

      {canChooseClinic ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="w-full rounded border px-3 py-2"
            value={selectedClinicId}
            onChange={(e) => {
              setSelectedClinicId(e.target.value);
              setSelectedBranchId('');
            }}
            required
          >
            <option value="">Klinikani tanlang</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded border px-3 py-2"
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            disabled={!selectedClinicId}
          >
            <option value="">Filial (ixtiyoriy)</option>
            {filteredBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form onSubmit={submitArea} className="rounded-lg border border-gray-200 bg-white p-4 shadow space-y-3">
          <h3 className="font-semibold text-gray-900">Bo'lim qo'shish (qavat/apartment)</h3>
          <select className="w-full rounded border px-3 py-2" value={areaType} onChange={(e) => setAreaType(e.target.value as 'floor' | 'apartment')}>
            <option value="floor">Qavat</option>
            <option value="apartment">Apartment</option>
          </select>
          <input
            className="w-full rounded border px-3 py-2"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Masalan: 2-qavat yoki A blok"
            required
          />
          <button type="submit" disabled={areaSubmitting} className="rounded bg-teal-700 px-4 py-2 text-white hover:bg-teal-600 disabled:opacity-60">
            {areaSubmitting ? "Saqlanmoqda..." : "Bo'lim qo'shish"}
          </button>
        </form>

        <form onSubmit={submitRoom} className="rounded-lg border border-gray-200 bg-white p-4 shadow space-y-3">
          <h3 className="font-semibold text-gray-900">Xona qo'shish</h3>
          <select
            className="w-full rounded border px-3 py-2"
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            required
          >
            <option value="">Qavat/apartment tanlang</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {areaTypeLabel(area.area_type)} - {area.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded border px-3 py-2"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Xona nomi (masalan: 201, VIP-1)"
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="number"
            min="1"
            step="1"
            value={roomCapacity}
            onChange={(e) => setRoomCapacity(e.target.value)}
            placeholder="Sig'im (necha o'rin)"
            required
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="number"
            step="0.01"
            min="0"
            value={dailyPrice}
            onChange={(e) => setDailyPrice(e.target.value)}
            placeholder="Kunlik to'lov"
            required
          />
          <button type="submit" disabled={roomSubmitting} className="rounded bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-600 disabled:opacity-60">
            {roomSubmitting ? "Saqlanmoqda..." : "Xona qo'shish"}
          </button>
        </form>
      </div>

      {message ? <p className="text-sm text-teal-700">{message}</p> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h3 className="font-semibold text-gray-900">Bo'limlar</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Turi</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Nomi</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {areas.map((area) => (
                <tr key={area.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">{areaTypeLabel(area.area_type)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{area.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{area.is_active ? 'Faol' : 'Nofaol'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <div className="border-b bg-gray-50 px-4 py-3">
            <h3 className="font-semibold text-gray-900">Xonalar</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bo'lim</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Xona</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Sig'im</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Band</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Holat</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ichkarida bemor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Kunlik to'lov</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {room.area_type ? areaTypeLabel(room.area_type) : '-'} {room.area_name ? `- ${room.area_name}` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{room.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{room.capacity}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{room.occupied_count ?? 0}</td>
                  <td className="px-4 py-3 text-sm">
                    {room.occupancy_status ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${occupancyClass[room.occupancy_status]}`}>
                        {occupancyLabel[room.occupancy_status]}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {room.current_patients && room.current_patients.length > 0
                      ? room.current_patients.map((p) => p.full_name).join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{Number(room.daily_price || 0).toLocaleString()} so'm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="border-b bg-gray-50 px-4 py-3">
          <h3 className="font-semibold text-gray-900">Davolash yo‘llanmalari</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Bemor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Xona</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Xizmat</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Holat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {referrals.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-gray-900">#{item.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">#{item.patient}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.room_name || `#${item.room}`}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.service_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
