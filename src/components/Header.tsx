import React from 'react';
import { Bell, Search, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Header() {
  const { user, logout } = useAuth();
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'User';

  return (
    <header className="bg-white/80 backdrop-blur shadow-sm border-b border-teal-100 z-10">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 items-center">
          <div className="w-full max-w-lg lg:max-w-xs">
            <label htmlFor="search" className="sr-only">Qidirish</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="search"
                name="search"
                className="block w-full rounded-md border-0 bg-teal-50/60 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-teal-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
                placeholder="Bemor yoki xizmat qidirish..."
                type="search"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="relative p-1 rounded-full text-gray-400 hover:text-gray-500">
            <span className="sr-only">Bildirishnomalar</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-medium text-gray-900">{fullName}</span>
              <span className="text-xs text-gray-500">{user?.role?.name || '-'}</span>
            </div>
            <UserCircle className="h-8 w-8 text-gray-400" />
            <button
              onClick={logout}
              className="ml-2 text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
