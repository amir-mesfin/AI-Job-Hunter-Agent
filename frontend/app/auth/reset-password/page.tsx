'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Missing reset token. Request a new link from Forgot Password.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setPending(true);
    try {
      const res: any = await authApi.resetPassword(token, password);
      setMessage(res.message || 'Password updated.');
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Unable to reset password.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black">
      <div className="card w-full max-w-md fade-up glow">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Choose a <span className="gradient-text">New Password</span>
          </h1>
          <p className="text-sm text-slate-400">Enter and confirm your new password below.</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="block text-xs font-semibold muted uppercase tracking-wider">New Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="field">
            <label className="block text-xs font-semibold muted uppercase tracking-wider">Confirm Password</label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn-primary mt-1" disabled={pending}>
            {pending ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Back to Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-indigo-400">
        Loading...
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
