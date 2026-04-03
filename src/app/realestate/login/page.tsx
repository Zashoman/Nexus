'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/realestate/AuthProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/realestate');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#0B0E11]">
      <div className="w-full max-w-sm">
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-6">
          <h1 className="text-sm font-mono font-semibold text-[#E8EAED] uppercase tracking-wider mb-1">
            Dubai RE Monitor
          </h1>
          <p className="text-[10px] font-mono text-[#5A6A7A] mb-6">
            Real estate crisis monitoring dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] uppercase text-[#5A6A7A] font-mono">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm font-mono text-[#E8EAED] focus:border-[#4488FF] outline-none mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[#5A6A7A] font-mono">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm font-mono text-[#E8EAED] focus:border-[#4488FF] outline-none mt-1"
              />
            </div>

            {error && (
              <div className="bg-[#FF4444]/10 border border-[#FF4444]/30 rounded-sm p-2">
                <p className="text-xs text-[#FF4444] font-mono">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-[#4488FF] text-white text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-[#3377EE] disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
