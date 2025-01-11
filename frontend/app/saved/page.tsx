'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { jobsApi, Job } from '@/lib/api';

export default function SavedPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState<{ id: number; job: Job }[]>([]);
  const [bookmarked, setBookmarked] = useState<{ id: number; job: Job }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/auth/login');
      return;
    }
    if (!token) return;
    Promise.all([jobsApi.saved(), jobsApi.bookmarked()])
      .then(([s, b]) => {
        setSaved(s);
        setBookmarked(b);
      })
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="page flex items-center justify-center">
        <p className="muted text-sm">Loading saved jobs…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <AppNav />
      <main className="container space-y-10 fade-up">
        <div>
          <h1 className="display text-3xl sm:text-4xl mb-2">
            Saved & <span className="gradient-text">Bookmarks</span>
          </h1>
          <p className="muted text-sm">Jobs and companies you want to revisit later.</p>
        </div>

        <section className="space-y-4">
          <h2 className="section-title">Saved Jobs</h2>
          {saved.length === 0 ? (
            <div className="card empty-state">
              No saved jobs yet. Browse Jobs and tap the heart to shortlist a role.
            </div>
          ) : (
            saved.map((row) => (
              <div key={row.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 space-y-2">
                  <h3 className="display text-lg">{row.job.title}</h3>
                  <p className="text-sm">
                    <span style={{ color: 'var(--accent)' }} className="font-semibold">{row.job.company}</span>
                    <span className="muted"> — {row.job.location}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="badge badge-accent">{row.job.remote}</span>
                    <span className="badge badge-green">{row.job.salary}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link href={`/jobs?id=${row.job.id}`} className="btn-ghost text-xs px-4 py-2.5">Open</Link>
                  <button
                    type="button"
                    className="btn-ghost text-xs px-4 py-2.5"
                    style={{ color: 'var(--danger)' }}
                    onClick={async () => {
                      await jobsApi.unsave(row.job.id);
                      setSaved(saved.filter((s) => s.id !== row.id));
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="space-y-4">
          <h2 className="section-title">Bookmarked Favorites</h2>
          {bookmarked.length === 0 ? (
            <div className="card empty-state">
              No bookmarks yet. Use the bookmark icon on a job to pin it here.
            </div>
          ) : (
            bookmarked.map((row) => (
              <div key={row.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 space-y-1">
                  <h3 className="display text-lg">{row.job.title}</h3>
                  <p className="text-sm" style={{ color: 'var(--accent)' }}>{row.job.company}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link href={`/jobs?id=${row.job.id}`} className="btn-ghost text-xs px-4 py-2.5">Open</Link>
                  <button
                    type="button"
                    className="btn-ghost text-xs px-4 py-2.5"
                    style={{ color: 'var(--danger)' }}
                    onClick={async () => {
                      await jobsApi.unbookmark(row.job.id);
                      setBookmarked(bookmarked.filter((b) => b.id !== row.id));
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
