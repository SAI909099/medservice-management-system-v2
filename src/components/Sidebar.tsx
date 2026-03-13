import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, UserPlus, FileText, Settings, HeartPulse, CreditCard, Droplet, BedDouble } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '@/context/AuthContext';

const navigation = [
  { name: 'Boshqaruv paneli', to: '/', icon: LayoutDashboard, pageCode: 'dashboard' },
  { name: 'Bemorlar', to: '/patients', icon: Users, pageCode: 'patients' },
  { name: "Ro'yxatga olish", to: '/appointments', icon: Calendar, pageCode: 'appointments' },
  { name: 'Shifokorlar', to: '/doctors', icon: UserPlus, pageCode: 'doctors' },
  { name: 'Laboratoriya', to: '/lab', icon: Droplet, pageCode: 'lab' },
  { name: 'Davolash xonasi', to: '/treatment', icon: HeartPulse, pageCode: 'treatment' },
  { name: "Xonalar ro'yxati", to: '/rooms', icon: BedDouble, pageCode: 'treatment' },
  { name: "Yotoq to'lovlari", to: '/treatment-billing', icon: CreditCard, pageCode: 'treatment' },
  { name: 'Kassa', to: '/cash-register', icon: CreditCard, pageCode: 'billing' },
  { name: "To'lovlar", to: '/billing', icon: CreditCard, pageCode: 'billing' },
  { name: 'Xizmat narxlari', to: '/pricing', icon: FileText, pageCode: 'pricing' },
  { name: 'Hisobotlar', to: '/reports', icon: FileText, pageCode: 'reports' },
  { name: 'Foydalanuvchilar', to: '/settings/users', icon: Settings, pageCode: 'settings_users' },
];

export function Sidebar() {
  const { hasPageAccess } = useAuth();
  const visibleNavigation = navigation.filter((item) => hasPageAccess(item.pageCode));

  return (
    <div className="flex h-full w-64 flex-col bg-gradient-to-b from-teal-900 to-teal-800 border-r border-teal-950/30 shadow-xl">
      <div className="flex h-16 items-center px-6 border-b border-teal-700/60 bg-teal-700/40">
        <HeartPulse className="h-8 w-8 text-white mr-2" />
        <h1 className="text-xl font-bold text-white">Medservise</h1>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) => cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md',
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-teal-50/90 hover:bg-teal-700/70 hover:text-white'
                )}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        isActive ? 'text-teal-700' : 'text-teal-100/80 group-hover:text-white'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
