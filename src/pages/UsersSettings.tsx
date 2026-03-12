import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';

type RoleItem = { id: number; name: string; description: string };
type PageItem = { code: string; label: string };
type UserItem = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role?: { id?: number; name: string };
  allowed_pages: string[];
};

type MetaPayload = {
  roles: RoleItem[];
  pages: PageItem[];
  role_defaults: Record<string, string[]>;
};

type NewUserForm = {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role_id: string;
};

export function UsersSettings() {
  const [meta, setMeta] = useState<MetaPayload>({ roles: [], pages: [], role_defaults: {} });
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<NewUserForm>({
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role_id: '',
  });

  const selectedRoleName = useMemo(
    () => meta.roles.find((r) => String(r.id) === form.role_id)?.name,
    [meta.roles, form.role_id],
  );

  const defaultRolePages = useMemo(
    () => (selectedRoleName ? meta.role_defaults[selectedRoleName] || [] : []),
    [meta.role_defaults, selectedRoleName],
  );

  const loadUsers = async () => {
    const data = await apiRequest<UserItem[]>('/auth/users/');
    setUsers(data || []);
  };

  useEffect(() => {
    Promise.all([
      apiRequest<MetaPayload>('/auth/permissions/meta/'),
      apiRequest<UserItem[]>('/auth/users/'),
    ])
      .then(([metaRes, usersRes]) => {
        setMeta(metaRes);
        setUsers(usersRes || []);
      })
      .catch(() => {
        setMeta({ roles: [], pages: [], role_defaults: {} });
        setUsers([]);
      });
  }, []);

  useEffect(() => {
    if (!selectedRoleName) return;
    setSelectedPages(defaultRolePages);
  }, [selectedRoleName]);

  const togglePage = (code: string) => {
    setSelectedPages((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role_id) return;

    await apiRequest('/auth/users/', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        role_id: Number(form.role_id),
        allowed_pages: selectedPages,
      }),
    });

    setForm({ username: '', password: '', first_name: '', last_name: '', phone: '', role_id: '' });
    setSelectedPages([]);
    await loadUsers();
  };

  const openPermissionEditor = (user: UserItem) => {
    setSelectedUser(user);
    setSelectedPages(user.allowed_pages || []);
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    await apiRequest(`/auth/users/${selectedUser.id}/permissions/`, {
      method: 'PATCH',
      body: JSON.stringify({ allowed_pages: selectedPages }),
    });
    setSelectedUser(null);
    await loadUsers();
  };

  const deleteUser = async (user: UserItem) => {
    const ok = window.confirm(`${user.username} foydalanuvchisini o'chirishni tasdiqlaysizmi?`);
    if (!ok) return;
    await apiRequest(`/auth/users/${user.id}/`, { method: 'DELETE' });
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
    }
    await loadUsers();
  };

  const resetPassword = async (user: UserItem) => {
    const newPassword = window.prompt(`${user.username} uchun yangi parol kiriting (min 6 ta belgi):`);
    if (!newPassword) return;
    await apiRequest(`/auth/users/${user.id}/password/`, {
      method: 'PATCH',
      body: JSON.stringify({ new_password: newPassword }),
    });
    window.alert('Parol yangilandi.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Foydalanuvchilar va ruxsatlar</h2>
        <p className="text-sm text-gray-500">Foydalanuvchi yaratish va sahifa ruxsatlarini yoqish/o‘chirish.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-gray-200 shadow p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Yangi foydalanuvchi qo‘shish</h3>
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded px-3 py-2" placeholder="Foydalanuvchi nomi" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            <div className="flex gap-2">
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Parol"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="rounded border px-3 py-2 text-sm"
              >
                {showPassword ? "Yashirish" : "Ko'rsatish"}
              </button>
            </div>
            <input className="border rounded px-3 py-2" placeholder="Ism" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <input className="border rounded px-3 py-2" placeholder="Familiya" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            <input className="border rounded px-3 py-2 col-span-2" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select className="border rounded px-3 py-2 col-span-2" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })} required>
              <option value="">Rolni tanlang</option>
              {meta.roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          <div className="border rounded p-3">
            <p className="text-sm font-medium mb-2">Sahifa ruxsatlari (standart + qo‘shimcha)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {meta.pages.map((page) => (
                <label key={page.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(page.code)}
                    onChange={() => togglePage(page.code)}
                  />
                  {page.label}
                </label>
              ))}
            </div>
          </div>

          <button className="rounded bg-teal-700 px-4 py-2 text-white hover:bg-teal-600" type="submit">Yaratish</button>
        </form>

        <div className="bg-white rounded-lg border border-gray-200 shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Mavjud foydalanuvchilar</h3>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {users.map((u) => (
              <div key={u.id} className="border rounded p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{u.username} ({u.role?.name || '-'})</p>
                  <p className="text-xs text-gray-500">{u.first_name} {u.last_name}</p>
                  <p className="text-xs text-gray-500 mt-1">{(u.allowed_pages || []).join(', ') || 'Sahifa biriktirilmagan'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openPermissionEditor(u)} className="text-sm rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">Ruxsatlar</button>
                  <button onClick={() => resetPassword(u)} className="text-sm rounded bg-amber-100 px-3 py-1 hover:bg-amber-200">Parolni almashtirish</button>
                  <button onClick={() => deleteUser(u)} className="text-sm rounded bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200">O'chirish</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedUser ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow p-4 space-y-3">
          <h3 className="font-semibold">Ruxsatlarni tahrirlash: {selectedUser.username}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {meta.pages.map((page) => (
              <label key={page.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPages.includes(page.code)}
                  onChange={() => togglePage(page.code)}
                />
                {page.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={savePermissions} className="rounded bg-teal-700 px-4 py-2 text-white hover:bg-teal-600">Saqlash</button>
            <button onClick={() => setSelectedUser(null)} className="rounded bg-gray-100 px-4 py-2 hover:bg-gray-200">Bekor qilish</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
