'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { jobsApi, historyApi, DashboardStats } from '@/lib/api';

export default function DashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/auth/login');
      return;
    }

    if (token) {
      Promise.all([jobsApi.dashboardStats(), historyApi.list()])
        .then(([s, h]) => {
          setStats(s);
          setRecentLogs(h.slice(0, 6));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="page flex items-center justify-center">
        <p className="muted text-sm tracking-wide">Loading your desk…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <AppNav />
      <main className="container space-y-8 sm:space-y-10 fade-up">
        <section className="hero-panel">
          <div className="min-w-0">
            <h1 className="display text-3xl sm:text-4xl mb-2">
              Welcome, <span className="gradient-text">{user?.name}</span>
            </h1>
            <p className="muted text-sm sm:text-base">Your AI evaluation pipeline at a glance.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto mt-5 sm:mt-0">
            <Link href="/jobs" className="btn-primary !w-full sm:!w-auto px-6 py-3">Browse jobs</Link>
            <Link href="/ai" className="btn-ghost !w-full sm:!w-auto px-5 py-3">AI Match</Link>
          </div>
        </section>

        <section className="tip-row">
          <Link href="/profile" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>Quick tip</p>
            <h3 className="display text-lg mb-2">Keep your master CV fresh</h3>
            <p className="muted text-sm leading-relaxed">Upload once — matching and letters use it automatically.</p>
          </Link>
          <Link href="/collectors" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent2)' }}>Collectors</p>
            <h3 className="display text-lg mb-2">Sync board sources</h3>
            <p className="muted text-sm leading-relaxed">Pull Greenhouse / Lever / Ashby listings into your feed.</p>
          </Link>
          <Link href="/saved" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--warn)' }}>Shortlist</p>
            <h3 className="display text-lg mb-2">Review saved roles</h3>
            <p className="muted text-sm leading-relaxed">Jump back to bookmarks when you are ready to apply.</p>
          </Link>
        </section>

        <section className="stats-grid">
          <div className="card">
            <span className="text-xs font-bold muted uppercase tracking-wider">New today</span>
            <p className="display text-4xl mt-4 gradient-text">{stats?.new_jobs_today ?? 0}</p>
          </div>
          <div className="card">
            <span className="text-xs font-bold muted uppercase tracking-wider">Saved</span>
            <p className="display text-4xl mt-4" style={{ color: 'var(--accent2)' }}>{stats?.saved_jobs_count ?? 0}</p>
          </div>
          <div className="card">
            <span className="text-xs font-bold muted uppercase tracking-wider">Applied</span>
            <p className="display text-4xl mt-4" style={{ color: 'var(--success)' }}>{stats?.applied_jobs_count ?? 0}</p>
          </div>
          <div className="card">
            <span className="text-xs font-bold muted uppercase tracking-wider">Resume</span>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              {stats?.resume_uploaded ? (
                <span className="badge badge-green">Master CV on file</span>
              ) : (
                <span className="badge badge-orange">Upload needed</span>
              )}
              <Link href="/profile" className="text-xs font-bold" style={{ color: 'var(--accent)' }}>Manage</Link>
            </div>
          </div>
        </section>

        <div className="split-2">
          <section className="space-y-4">
            <h2 className="section-title">Featured openings</h2>
            {(stats?.recent_jobs || []).length === 0 ? (
              <div className="card empty-state">No openings yet — sync collectors or browse Jobs.</div>
            ) : (
              (stats?.recent_jobs || []).map((job) => (
                <div key={job.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className="badge badge-accent">{job.remote}</span>
                      <span className="badge badge-green">{job.salary}</span>
                    </div>
                    <h3 className="display text-xl leading-snug">{job.title}</h3>
                    <p className="text-sm">
                      <span style={{ color: 'var(--accent)' }} className="font-semibold">{job.company}</span>
                      <span className="muted"> — {job.location}</span>
                    </p>
                  </div>
                  <Link href={`/jobs?id=${job.id}`} className="btn-ghost self-start sm:self-auto text-xs px-5 py-2.5 shrink-0">
                    Open
                  </Link>
                </div>
              ))
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">Recent activity</h2>
              <Link href="/history" className="text-xs font-bold" style={{ color: 'var(--accent)' }}>Full history</Link>
            </div>
            <div className="card max-h-[420px] overflow-y-auto">
              {recentLogs.length === 0 ? (
                <p className="empty-state !p-0 text-center">No actions yet — start with Jobs or AI Match.</p>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="activity-item">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span
                        className={`badge ${
                          log.action === 'Applied'
                            ? 'badge-green'
                            : log.action === 'Saved'
                              ? 'badge-accent'
                              : 'badge-info'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="muted text-xs">
                        {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-snug">{log.job.title}</p>
                    <p className="muted text-xs mt-1">{log.job.company}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
      <footer className="footer-bar">Paper / Ink themes · Dashboard</footer>
    </div>
  );
}
