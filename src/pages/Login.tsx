import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Login() {
  const { login, user, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch {
      setError('Login yoki parol noto‘g‘ri.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
        <div className="flex items-center gap-2 justify-center">
          <HeartPulse className="h-6 w-6 text-teal-700" />
          <h1 className="text-xl font-bold text-gray-900">Medservise Tizimga kirish</h1>
        </div>

        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Foydalanuvchi nomi"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          type="password"
          placeholder="Parol"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-teal-700 text-white py-2 font-medium hover:bg-teal-600 disabled:opacity-60"
        >
          {submitting ? 'Kirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
