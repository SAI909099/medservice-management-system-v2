import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';

interface TreatmentRoom {
  id: number;
  name: string;
  area_name?: string;
  area_type?: 'floor' | 'apartment';
  capacity: number;
  daily_price: string;
  occupied_count?: number;
  occupancy_status?: 'free' | 'partial' | 'full';
  current_patients?: Array<{
    id: number;
    referral_id: number;
    full_name: string;
  }>;
}

interface Paginated<T> {
  results: T[];
}

interface PatientOption {
  id: number;
  full_name: string;
  phone: string;
}

interface NormalizedRoom extends TreatmentRoom {
  occupied: number;
  occupancyStatus: 'free' | 'partial' | 'full';
}

export function RoomsList() {
  const [rooms, setRooms] = useState<TreatmentRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'free' | 'partial' | 'full'>('all');
  const [assignRoom, setAssignRoom] = useState<NormalizedRoom | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [serviceName, setServiceName] = useState('Palata joylashuvi');
  const [notes, setNotes] = useState('');
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');
  const [assignStatus, setAssignStatus] = useState<'success' | 'error' | ''>('');
  const [dischargeRoom, setDischargeRoom] = useState<NormalizedRoom | null>(null);
  const [selectedDischargeReferralId, setSelectedDischargeReferralId] = useState('');
  const [dischargeNote, setDischargeNote] = useState('');
  const [dischargeSubmitting, setDischargeSubmitting] = useState(false);

  const loadRooms = () => {
    setLoading(true);
    setError('');
    return apiRequest<Paginated<TreatmentRoom>>('/treatment-rooms/')
      .then((res) => setRooms(res.results || []))
      .catch(() => {
        setRooms([]);
        setError("Xonalar ro'yxatini yuklab bo'lmadi.");
      })
      .finally(() => setLoading(false));
  };

  const loadPatientOptions = (searchText: string) => {
    const query = searchText.trim();
    const path = query
      ? `/treatment-referrals/patient-options/?search=${encodeURIComponent(query)}`
      : '/treatment-referrals/patient-options/';
    return apiRequest<{ results: PatientOption[] }>(path)
      .then((res) => setPatientOptions(res.results || []))
      .catch(() => setPatientOptions([]));
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const occupancyLabel: Record<'free' | 'partial' | 'full', string> = {
    free: "Bo'sh",
    partial: 'Qisman',
    full: "To'liq",
  };
  const statusTheme: Record<
    'free' | 'partial' | 'full',
    { border: string; ring: string; dot: string; bar: string }
  > = {
    free: {
      border: 'border-emerald-200',
      ring: '#10b981',
      dot: 'bg-emerald-500',
      bar: 'bg-emerald-500',
    },
    partial: {
      border: 'border-amber-200',
      ring: '#f59e0b',
      dot: 'bg-amber-500',
      bar: 'bg-amber-500',
    },
    full: {
      border: 'border-rose-200',
      ring: '#e11d48',
      dot: 'bg-rose-500',
      bar: 'bg-rose-500',
    },
  };
  const normalizedRooms = useMemo<NormalizedRoom[]>(
    () =>
      rooms.map((room) => {
        const occupied = room.occupied_count ?? 0;
        const capacity = room.capacity || 1;
        const occupancyStatus: 'free' | 'partial' | 'full' =
          room.occupancy_status ?? (occupied <= 0 ? 'free' : occupied >= capacity ? 'full' : 'partial');
        return { ...room, occupied, occupancyStatus };
      }),
    [rooms],
  );
  const groupedRooms = useMemo(() => {
    const byArea: Record<string, NormalizedRoom[]> = {};
    const filtered = normalizedRooms.filter((room) => statusFilter === 'all' || room.occupancyStatus === statusFilter);
    for (const room of filtered) {
      const area = room.area_name?.trim() || "Bo'limsiz";
      if (!byArea[area]) byArea[area] = [];
      byArea[area].push(room);
    }
    return Object.entries(byArea)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([area, list]) => ({
        area,
        rooms: [...list].sort((x, y) => x.name.localeCompare(y.name)),
      }));
  }, [normalizedRooms, statusFilter]);
  const summary = useMemo(
    () => ({
      total: normalizedRooms.length,
      free: normalizedRooms.filter((r) => r.occupancyStatus === 'free').length,
      partial: normalizedRooms.filter((r) => r.occupancyStatus === 'partial').length,
      full: normalizedRooms.filter((r) => r.occupancyStatus === 'full').length,
    }),
    [normalizedRooms],
  );

  useEffect(() => {
    if (!assignRoom) return;
    loadPatientOptions(patientSearch);
  }, [assignRoom, patientSearch]);

  const openAssignModal = (room: NormalizedRoom) => {
    if (room.occupancyStatus === 'full') {
      setAssignStatus('error');
      setAssignMessage("Bu xona to'liq. Avval joy bo'shating.");
      return;
    }
    setAssignRoom(room);
    setSelectedPatientId('');
    setServiceName('Palata joylashuvi');
    setNotes('');
    setAssignDate(new Date().toISOString().slice(0, 10));
    setPatientSearch('');
    setAssignMessage('');
    setAssignStatus('');
    setPatientOptions([]);
  };

  const closeAssignModal = () => {
    setAssignRoom(null);
    setAssignSubmitting(false);
    setAssignStatus('');
    setAssignMessage('');
  };

  const openDischargeModal = (room: NormalizedRoom) => {
    if (!room.current_patients || room.current_patients.length === 0) {
      setAssignStatus('error');
      setAssignMessage("Chiqariladigan bemor topilmadi.");
      return;
    }
    setDischargeRoom(room);
    setSelectedDischargeReferralId(String(room.current_patients[0].referral_id));
    setDischargeNote('');
  };

  const closeDischargeModal = () => {
    setDischargeRoom(null);
    setSelectedDischargeReferralId('');
    setDischargeNote('');
    setDischargeSubmitting(false);
  };

  const submitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignRoom) return;
    setAssignSubmitting(true);
    setAssignMessage('');
    setAssignStatus('');
    try {
      await apiRequest('/treatment-referrals/', {
        method: 'POST',
        body: JSON.stringify({
          patient: Number(selectedPatientId),
          room: assignRoom.id,
          service_name: serviceName.trim(),
          notes: notes.trim(),
          status: 'in_progress',
          assigned_date: assignDate,
        }),
      });
      setAssignStatus('success');
      setAssignMessage('Success: bemor yotoqqa joylashtirildi.');
      setSelectedPatientId('');
      setNotes('');
      await loadRooms();
    } catch (err) {
      const fallback = "Biriktirishda xatolik yuz berdi.";
      if (!err || typeof err !== 'object') {
        setAssignStatus('error');
        setAssignMessage(fallback);
      } else {
        const payload = err as Record<string, unknown>;
        const firstError = Object.values(payload).find((v) => Array.isArray(v) && v.length > 0);
        if (Array.isArray(firstError)) {
          setAssignStatus('error');
          setAssignMessage(String(firstError[0]));
        } else if (typeof payload.detail === 'string') {
          setAssignStatus('error');
          setAssignMessage(payload.detail);
        } else {
          setAssignStatus('error');
          setAssignMessage(fallback);
        }
      }
    } finally {
      setAssignSubmitting(false);
    }
  };
  const submitDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDischargeReferralId) return;
    setDischargeSubmitting(true);
    setAssignMessage('');
    setAssignStatus('');
    try {
      await apiRequest(`/treatment-referrals/${selectedDischargeReferralId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed',
          ...(dischargeNote.trim() ? { notes: dischargeNote.trim() } : {}),
        }),
      });
      setAssignStatus('success');
      setAssignMessage("Bemor xonadan chiqarildi.");
      await loadRooms();
      closeDischargeModal();
    } catch {
      setAssignStatus('error');
      setAssignMessage("Bemorni chiqarishda xatolik yuz berdi.");
    } finally {
      setDischargeSubmitting(false);
    }
  };
  const selectedPatient = useMemo(
    () => patientOptions.find((p) => String(p.id) === selectedPatientId) || null,
    [patientOptions, selectedPatientId],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Xonalar ro'yxati</h2>
        <p className="text-sm text-gray-500">Xonalar bandligi, holati va ichkaridagi bemorlar.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}
        >
          Barchasi ({summary.total})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('free')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === 'free' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}
        >
          Bo'sh ({summary.free})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('partial')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === 'partial' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'}`}
        >
          Qisman ({summary.partial})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('full')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusFilter === 'full' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800'}`}
        >
          To'liq ({summary.full})
        </button>
      </div>

      {loading ? <p className="text-sm text-gray-500">Yuklanmoqda...</p> : null}
      {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error && groupedRooms.length === 0 ? <p className="text-sm text-gray-500">Xonalar topilmadi.</p> : null}

      <div className="space-y-5">
        {groupedRooms.map((group) => (
          <section key={group.area} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">{group.area}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.rooms.map((room) => {
                const occupied = room.occupied;
                const capacity = room.capacity || 1;
                const normalizedStatus = room.occupancyStatus;
                const percent = Math.min(100, Math.round((occupied / capacity) * 100));
                const theme = statusTheme[normalizedStatus];

                return (
                  <article key={room.id} className={`rounded-lg border bg-white p-3 ${theme.border}`}>
                    <p className="text-sm font-semibold text-gray-900">{room.name} xona</p>
                    <p className="text-xs text-gray-500">{group.area}</p>

                    <div className="my-3 flex justify-center">
                      <div
                        className="flex h-14 w-14 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(${theme.ring} ${percent}%, #e5e7eb ${percent}% 100%)`,
                        }}
                      >
                        <div className="h-9 w-9 rounded-full bg-white" />
                      </div>
                    </div>

                    <p className="mb-2 flex items-center gap-2 text-sm text-gray-800">
                      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                      {occupancyLabel[normalizedStatus]}
                    </p>

                    <p className="truncate text-xs text-gray-600">
                      {room.current_patients && room.current_patients.length > 0
                        ? room.current_patients.map((p) => p.full_name).join(', ')
                        : '-'}
                    </p>

                    <div className="mt-2 h-1.5 w-full rounded bg-gray-200">
                      <div className={`h-1.5 rounded ${theme.bar}`} style={{ width: `${percent}%` }} />
                    </div>

                    <button
                      type="button"
                      onClick={() => openAssignModal(room)}
                      disabled={normalizedStatus === 'full'}
                      className="mt-2 w-full rounded bg-slate-500 px-2 py-1 text-xs font-medium text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Yotoqqa joylash
                    </button>
                    <button
                      type="button"
                      onClick={() => openDischargeModal(room)}
                      disabled={occupied <= 0}
                      className="mt-1 w-full rounded bg-rose-500 px-2 py-1 text-xs font-medium text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-200"
                    >
                      Chiqarvorish
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {assignMessage ? <p className="text-sm text-teal-700">{assignMessage}</p> : null}

      {assignRoom ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xl font-semibold text-gray-900">{assignRoom.name} - xonaga yotoqqa joylash</h4>
              <button type="button" onClick={closeAssignModal} className="rounded border px-2 py-1 text-sm">
                Yopish
              </button>
            </div>
            <form onSubmit={submitAssign} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <input
                    className="w-full rounded border border-slate-400 bg-slate-50 px-3 py-2 text-sm"
                    placeholder="Bemor qidirish"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  <select
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    <option value="">Bemorni tanlang</option>
                    {patientOptions.map((p) => (
                      <option key={`opt-${p.id}`} value={p.id}>
                        {p.full_name} {p.phone ? `(${p.phone})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded border bg-slate-50 p-2">
                    {patientOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPatientId(String(p.id))}
                        className={`w-full rounded border p-2 text-left ${selectedPatientId === String(p.id) ? 'border-sky-500 bg-sky-50' : 'border-gray-200 bg-white'}`}
                      >
                        <p className="text-sm font-semibold text-gray-900">{p.full_name}</p>
                        <p className="text-xs text-gray-600">ID: {p.id}</p>
                        <p className="text-xs text-gray-600">{p.phone || '-'}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="rounded border bg-slate-50 p-3 text-sm">
                    <p className="font-semibold">{selectedPatient?.full_name || 'Bemor tanlanmagan'}</p>
                    <p>ID: {selectedPatient?.id || '-'}</p>
                    <p>Phone: {selectedPatient?.phone || '-'}</p>
                  </div>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Palata yotoq joylashuvi"
                    required
                  />
                  <input
                    type="date"
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    required
                  />
                  <textarea
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Izoh (ixtiyoriy)"
                  />
                </div>
              </div>

              <div className="flex gap-2 text-sm">
                {assignStatus === 'error' && assignMessage ? <span className="rounded bg-rose-100 px-2 py-1 text-rose-700">Error</span> : null}
                {assignStatus === 'success' && assignMessage ? <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Success</span> : null}
                {assignMessage ? <span className="text-gray-600">{assignMessage}</span> : null}
              </div>

              <button
                type="submit"
                disabled={assignSubmitting || !selectedPatientId}
                className="w-full rounded bg-emerald-300 px-3 py-2 text-lg font-semibold text-gray-800 hover:bg-emerald-400 disabled:opacity-60"
              >
                {assignSubmitting ? 'Saqlanmoqda...' : 'Yotoqqa joylash'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {dischargeRoom ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">{dischargeRoom.name} - bemorni chiqarish</h4>
              <button type="button" onClick={closeDischargeModal} className="rounded border px-2 py-1 text-sm">
                Yopish
              </button>
            </div>
            <form onSubmit={submitDischarge} className="space-y-3">
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                value={selectedDischargeReferralId}
                onChange={(e) => setSelectedDischargeReferralId(e.target.value)}
                required
              >
                <option value="">Bemorni tanlang</option>
                {(dischargeRoom.current_patients || []).map((p) => (
                  <option key={p.referral_id} value={p.referral_id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              <textarea
                className="w-full rounded border px-3 py-2 text-sm"
                value={dischargeNote}
                onChange={(e) => setDischargeNote(e.target.value)}
                placeholder="Chiqarish izohi (ixtiyoriy)"
              />
              <button
                type="submit"
                disabled={dischargeSubmitting || !selectedDischargeReferralId}
                className="w-full rounded bg-rose-500 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
              >
                {dischargeSubmitting ? 'Saqlanmoqda...' : 'Chiqarvorish'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
