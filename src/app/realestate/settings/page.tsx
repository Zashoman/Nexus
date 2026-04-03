'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/realestate/AuthProvider';
import { REUser } from '@/types/realestate';

export default function SettingsPage() {
  const { user, role, loading, token } = useAuth();
  const router = useRouter();
  const [viewers, setViewers] = useState<REUser[]>([]);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/realestate/login');
    if (!loading && user && role !== 'owner') router.push('/realestate');
  }, [user, role, loading, router]);

  const fetchViewers = async () => {
    const res = await fetch('/api/re/invite', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (json.data) setViewers(json.data);
  };

  useEffect(() => {
    if (user && role === 'owner' && token) fetchViewers();
  }, [user, role, token]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setMessage('');

    try {
      const res = await fetch('/api/re/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage(`Invitation sent to ${email}`);
      setEmail('');
      fetchViewers();
    } catch (e) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
    } finally {
      setInviting(false);
    }
  };

  if (loading || !user || role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm font-mono text-[#5A6A7A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex-shrink-0 h-12 bg-[#0D1117] border-b border-[#1E2A3A] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/realestate')} className="text-[#5A6A7A] hover:text-[#E8EAED] font-mono text-xs">
            &larr; Back
          </button>
          <h1 className="text-sm font-mono font-semibold text-[#E8EAED] tracking-wider uppercase">
            Settings &amp; Sharing
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Invite Section */}
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4">
          <h3 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono mb-3">
            Invite Viewer
          </h3>
          <p className="text-[10px] font-mono text-[#5A6A7A] mb-3">
            Viewers can see all charts and data but cannot input or modify anything.
          </p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="friend@email.com"
              required
              className="flex-1 bg-[#0B0E11] border border-[#1E2A3A] rounded-sm px-3 py-2 text-sm font-mono text-[#E8EAED] placeholder:text-[#2A3A4A] focus:border-[#4488FF] outline-none"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-[#4488FF] text-white text-xs font-mono uppercase tracking-wider rounded-sm hover:bg-[#3377EE] disabled:opacity-50"
            >
              {inviting ? 'Sending...' : 'Invite'}
            </button>
          </form>
          {message && (
            <p className={`text-xs font-mono mt-2 ${message.startsWith('Error') ? 'text-[#FF4444]' : 'text-[#00CC66]'}`}>
              {message}
            </p>
          )}
        </div>

        {/* Current Viewers */}
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4">
          <h3 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono mb-3">
            Current Viewers
          </h3>
          {viewers.length === 0 ? (
            <p className="text-xs font-mono text-[#5A6A7A]">No viewers invited yet</p>
          ) : (
            <div className="space-y-2">
              {viewers.map(v => (
                <div key={v.id} className="flex items-center justify-between p-2 border border-[#1E2A3A]/50 rounded-sm">
                  <div>
                    <span className="text-xs font-mono text-[#E8EAED]">{v.email}</span>
                    <span className="text-[10px] font-mono text-[#5A6A7A] ml-2">
                      Invited {new Date(v.invited_at).toLocaleDateString()}
                    </span>
                  </div>
                  {v.last_login && (
                    <span className="text-[10px] font-mono text-[#5A6A7A]">
                      Last login: {new Date(v.last_login).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account Info */}
        <div className="bg-[#141820] border border-[#1E2A3A] rounded-sm p-4">
          <h3 className="text-xs uppercase tracking-wider text-[#5A6A7A] font-mono mb-3">
            Your Account
          </h3>
          <div className="space-y-1 text-xs font-mono">
            <p><span className="text-[#5A6A7A]">Email:</span> <span className="text-[#E8EAED]">{user.email}</span></p>
            <p><span className="text-[#5A6A7A]">Role:</span> <span className="text-[#00CC66]">{role}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
