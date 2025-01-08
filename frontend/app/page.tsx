'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { BrandLogo } from '@/components/Icons';

export default function LandingPage() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token) router.push('/dashboard');
  }, [token, loading, router]);

  if (loading) {
    return (
      <div className="page flex items-center justify-center">
        <p className="muted text-sm tracking-wide">Loading atelier…</p>
      </div>
    );
  }

  return (
    <main className="page">
      <header className="container" style={{ paddingBottom: 0 }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="brand-mark" aria-hidden>
              <BrandLogo />
            </div>
            <span className="display text-lg sm:text-xl truncate">AI Job Hunter</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <Link href="/auth/login" className="btn-ghost text-sm hidden xs:inline-flex sm:inline-flex">Sign in</Link>
            <Link href="/auth/register" className="btn-primary !w-auto px-4 sm:px-5 text-sm">Join</Link>
          </div>
        </div>
      </header>

      <section className="container landing-hero fade-up">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase mb-4" style={{ color: 'var(--accent2)' }}>
            AI evaluation careers
          </p>
          <h1 className="display text-4xl sm:text-5xl lg:text-6xl max-w-xl mb-5">
            Hunt sharper roles.
            <span className="gradient-text"> Match with intent.</span>
          </h1>
          <p className="muted text-base sm:text-lg max-w-lg mb-8 leading-relaxed">
            One place to collect AI trainer jobs, rank them against your CV, and draft cover letters
            before you apply on the company site.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/auth/register" className="btn-primary !w-full sm:!w-auto px-8">Create account</Link>
            <Link href="/auth/login" className="btn-ghost !w-full sm:!w-auto">Sign in</Link>
          </div>
        </div>

        <aside className="landing-visual">
          <span className="badge badge-accent">Live board sync</span>
          <h2 className="display text-2xl">Invisible · Scale · Anthropic</h2>
          <p className="muted text-sm leading-relaxed">
            Greenhouse, Lever, Ashby, and RSS collectors feed your search. AI Match scores each posting
            against your master CV.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-green">Remote</span>
            <span className="badge badge-orange">$35–70/hr</span>
            <span className="badge badge-info">Cover letters</span>
          </div>
        </aside>
      </section>

      <section className="container tip-row fade-up">
        {[
          { n: '01', t: 'Foundation', d: 'Profile, master CV, filters, save, apply tracking.' },
          { n: '02', t: 'Collectors', d: 'Pull AI roles from public boards into your database.' },
          { n: '03', t: 'AI desk', d: 'Skill gaps, match %, tailored bullets, cover letters.' },
        ].map((item) => (
          <div key={item.n} className="card">
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--accent)' }}>{item.n}</p>
            <h3 className="display text-xl mb-2">{item.t}</h3>
            <p className="muted text-sm leading-relaxed">{item.d}</p>
          </div>
        ))}
      </section>

      <section className="container fade-up">
        <div className="hero-panel">
          <div>
            <h2 className="display text-2xl mb-2">Built for AI evaluation work</h2>
            <p className="muted text-sm max-w-xl">
              Coding experts, RLHF rankers, prompt writers, and safety annotators — tracked in one quiet workspace.
            </p>
          </div>
          <Link href="/auth/register" className="btn-moss !w-full sm:!w-auto">Start free</Link>
        </div>
      </section>

      <footer className="footer-bar">
        AI Job Hunter · Paper / Ink themes · Phases 1–3
      </footer>
    </main>
  );
}
