'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TreePine, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import Button from '@/components/outreach/ui/Button';
import { useAuth } from '@/components/outreach/AuthProvider';
import { signIn, signInWithGoogle } from '@/lib/outreach/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/outreach');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      router.push('/outreach');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-bt-bg flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-bt-sidebar relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bt-primary-light to-bt-teal flex items-center justify-center">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Blue Tree</h1>
              <p className="text-xs text-white/50">Outreach Agent</p>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-white leading-tight mb-4">
              Your outreach,
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-bt-primary-light to-bt-teal">
                on autopilot.
              </span>
            </h2>
            <p className="text-base text-white/60 leading-relaxed">
              AI-powered email monitoring, classification, and draft generation
              — with human approval on every send.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-bold text-white">80%</p>
              <p className="text-xs text-white/50">Less inbox time</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">5x</p>
              <p className="text-xs text-white/50">Faster responses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">94%</p>
              <p className="text-xs text-white/50">Draft accuracy</p>
            </div>
          </div>
        </div>

        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-bt-primary/5 blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[400px] h-[400px] rounded-full bg-bt-teal/5 blur-3xl" />
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bt-primary-light to-bt-teal flex items-center justify-center">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-bt-text">Blue Tree</h1>
              <p className="text-xs text-bt-text-secondary">Outreach Agent</p>
            </div>
          </div>

          <h2 className="text-xl font-bold text-bt-text mb-1">Welcome back</h2>
          <p className="text-sm text-bt-text-secondary mb-8">
            Sign in to your account to continue
          </p>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-bt-red-bg border border-bt-red/20">
              <AlertCircle className="w-4 h-4 text-bt-red shrink-0" />
              <p className="text-sm text-bt-red">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-bt-text mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bt-text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bluetree.digital"
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary focus:border-transparent transition-shadow"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-bt-text">
                  Password
                </label>
                <button type="button" className="text-xs text-bt-primary hover:text-bt-primary-dark transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bt-text-tertiary" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-bt-border bg-bt-surface text-sm text-bt-text placeholder:text-bt-text-tertiary focus:outline-none focus:ring-2 focus:ring-bt-primary focus:border-transparent transition-shadow"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
              iconRight={!loading ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-bt-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-bt-bg px-3 text-xs text-bt-text-tertiary">or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <Button
            variant="secondary"
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>

          <p className="text-center text-xs text-bt-text-tertiary mt-6">
            Don&apos;t have an account?{' '}
            <button className="text-bt-primary hover:text-bt-primary-dark transition-colors font-medium">
              Contact admin
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
