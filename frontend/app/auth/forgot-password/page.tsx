'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [debugLink, setDebugLink] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDebugLink('');
    setPending(true);
    try {
      const res: any = await authApi.forgotPassword(email);
      setMessage(res.message);
      if (res.debug_reset_link) {
        setDebugLink(res.debug_reset_link);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black">
      <div className="card w-full max-w-md fade-up glow">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            Reset <span className="gradient-text">Password</span>
          </h1>
          <p className="text-sm text-slate-400">Enter your email and we'll print a reset link to your debugger</p>
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

        {debugLink && (
          <div className="mb-5 p-4 rounded-lg border border-purple-500/40 bg-purple-500/10 text-sm">
            <p className="font-semibold text-purple-300 mb-1">Developer Debug Reset Link:</p>
            <a href={debugLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-300 underline break-all">
              {debugLink}
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="block text-xs font-semibold muted uppercase tracking-wider">Email Address</label>
            <input
              type="email"
              placeholder="e.g. hunter@example.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary mt-1" disabled={pending}>
            {pending ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
