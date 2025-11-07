'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [teamCode, setTeamCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [teamCodes, setTeamCodes] = useState<{ teamCode: string; name: string }[]>([]);
  const [mode, setMode] = useState<'team' | 'admin'>('team');

  useEffect(() => {
    setMounted(true);
    // Load team codes for dropdown
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/auth/teamcodes`)
      .then((res) => {
        if (res.data?.success) {
          setTeamCodes(res.data.data || []);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = mode === 'admin' ? { email, password } : { teamCode, password };
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        payload,
        { withCredentials: true }
      );

      if (response.data.success) {
        const accessToken = response.data?.data?.accessToken;
        if (accessToken) {
          localStorage.setItem('token', accessToken);
        }
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        toast.success('Login successful!');
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary-700">Connect Shiksha</h1>
            <p className="mt-2 text-gray-600">Company Management System</p>
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <Toaster position="top-right" />
      
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-700">Connect Shiksha</h1>
          <p className="mt-2 text-gray-600">Company Management System</p>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('team')}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              mode === 'team' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Team ID Login
          </button>
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`rounded-md px-4 py-2 text-sm font-medium border ${
              mode === 'admin' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Admin Login
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {mode === 'team' ? (
            <div>
              <label htmlFor="teamCode" className="block text-sm font-medium text-gray-700">
                Choose Team ID
              </label>
              <select
                id="teamCode"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
              >
                <option value="">Select your Team ID</option>
              {teamCodes.map((t) => (
                <option key={t.teamCode} value={t.teamCode}>
                  {t.teamCode}
                </option>
              ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                placeholder="you@example.com"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

       
      </div>
    </div>
  );
}

