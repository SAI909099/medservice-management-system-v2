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
    full_name: string;
  }>;
}

interface Paginated<T> {
  results: T[];
}

export function RoomsList() {
  const [rooms, setRooms] = useState<TreatmentRoom[]>([]);

  useEffect(() => {
    apiRequest<Paginated<TreatmentRoom>>('/treatment-rooms/')
      .then((res) => setRooms(res.results || []))
      .catch(() => setRooms([]));
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
  const groupedRooms = useMemo(() => {
    const byArea: Record<string, TreatmentRoom[]> = {};
    for (const room of rooms) {
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
  }, [rooms]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Xonalar ro'yxati</h2>
        <p className="text-sm text-gray-500">Xonalar bandligi, holati va ichkaridagi bemorlar.</p>
      </div>

      <div className="space-y-5">
        {groupedRooms.map((group) => (
          <section key={group.area} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">{group.area}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.rooms.map((room) => {
                const occupied = room.occupied_count ?? 0;
                const capacity = room.capacity || 1;
                const normalizedStatus: 'free' | 'partial' | 'full' =
                  room.occupancy_status ?? (occupied <= 0 ? 'free' : occupied >= capacity ? 'full' : 'partial');
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
                      className="mt-2 w-full rounded bg-slate-500 px-2 py-1 text-xs font-medium text-white hover:bg-slate-600"
                    >
                      Assign
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
