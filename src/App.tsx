import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { Appointments } from './pages/Appointments';
import { Billing } from './pages/Billing';
import { Login } from './pages/Login';
import { useAuth } from './context/AuthContext';
import { Doctors } from './pages/Doctors';
import { Laboratory } from './pages/Laboratory';
import { TreatmentRooms } from './pages/TreatmentRooms';
import { Reports } from './pages/Reports';
import { UsersSettings } from './pages/UsersSettings';
import React from 'react';
import { Pricing } from './pages/Pricing';
import { RoomsList } from './pages/RoomsList';

// Mock empty pages for links in sidebar
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h2>
      <p className="mt-4 text-gray-500">Bu sahifa hozirda ishlab chiqilmoqda...</p>
    </div>
  );
}

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-gray-600">Yuklanmoqda...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function ProtectedPage({ pageCode, element }: { pageCode: string; element: JSX.Element }) {
  const { hasPageAccess } = useAuth();
  if (!hasPageAccess(pageCode)) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
        Sizda bu sahifaga kirish huquqi yo‘q.
      </div>
    );
  }
  return element;
}

function HomePageResolver() {
  const { user } = useAuth();
  const allowed = user?.allowed_pages || [];
  const roleName = user?.role?.name;

  if (roleName === 'doctor' && allowed.includes('doctors')) {
    return <Navigate to="/doctors" replace />;
  }

  if (allowed.includes('dashboard')) {
    return <Dashboard />;
  }

  const routeByPage: Record<string, string> = {
    patients: '/patients',
    appointments: '/appointments',
    doctors: '/doctors',
    lab: '/lab',
    treatment: '/treatment',
    billing: '/billing',
    pricing: '/pricing',
    reports: '/reports',
    settings_users: '/settings/users',
  };

  const firstRoute = allowed.map((code) => routeByPage[code]).find(Boolean);
  if (firstRoute) {
    return <Navigate to={firstRoute} replace />;
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
      Sizga hali hech qaysi sahifa biriktirilmagan. Admin bilan bog‘laning.
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<HomePageResolver />} />
          <Route path="patients" element={<ProtectedPage pageCode="patients" element={<Patients />} />} />
          <Route path="appointments" element={<ProtectedPage pageCode="appointments" element={<Appointments />} />} />
          <Route path="doctors" element={<ProtectedPage pageCode="doctors" element={<Doctors />} />} />
          <Route path="lab" element={<ProtectedPage pageCode="lab" element={<Laboratory />} />} />
          <Route path="treatment" element={<ProtectedPage pageCode="treatment" element={<TreatmentRooms />} />} />
          <Route path="rooms" element={<ProtectedPage pageCode="treatment" element={<RoomsList />} />} />
          <Route path="billing" element={<ProtectedPage pageCode="billing" element={<Billing />} />} />
          <Route path="pricing" element={<ProtectedPage pageCode="pricing" element={<Pricing />} />} />
          <Route path="reports" element={<ProtectedPage pageCode="reports" element={<Reports />} />} />
          <Route path="settings/users" element={<ProtectedPage pageCode="settings_users" element={<UsersSettings />} />} />
          <Route path="settings" element={<ComingSoon title="Sozlamalar" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export { App };
