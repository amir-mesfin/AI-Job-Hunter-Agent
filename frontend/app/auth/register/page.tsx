'use client';
import { useState } from 'react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { BrandLogo } from '@/components/Icons';

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      await authApi.register(name, email, password);
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Try a different email.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="page flex items-center justify-center p-4 sm:p-6">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <div className="card auth-card fade-up">
        <div className="mb-8 text-center">
          <div className="brand-mark brand-mark-lg mx-auto mb-4" aria-hidden>
            <BrandLogo />
          </div>
          <h1 className="display text-3xl mb-2">
            Create <span className="gradient-text">account</span>
          </h1>
          <p className="muted text-sm">Join your AI evaluation workspace</p>
        </div>

        {error && (
          <div
            className="mb-5 p-3 rounded-lg text-sm text-center"
            style={{
              border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
              background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
              color: 'var(--danger)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="block text-xs font-semibold muted uppercase tracking-wider">Full name</label>
            <input type="text" placeholder="Abushe Mesfin" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label className="block text-xs font-semibold muted uppercase tracking-wider">Email</label>
            <input type="email" placeholder="you@example.com" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label className="block text-xs font-semibold muted uppercase tracking-wider">Password</label>
            <input type="password" placeholder="••••••••" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary mt-1" disabled={pending}>
            {pending ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm muted">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold" style={{ color: 'var(--accent)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
