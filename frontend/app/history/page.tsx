'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { historyApi, Job } from '@/lib/api';

export default function HistoryPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<{ id: number; action: string; date: string; job: Job }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/auth/login');
      return;
    }
    if (!token) return;
    historyApi
      .list()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="page flex items-center justify-center">
        <p className="muted text-sm">Loading history…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <AppNav />
      <main className="container space-y-6 fade-up">
        <div>
          <h1 className="display text-3xl sm:text-4xl mb-2">
            Job <span className="gradient-text">History</span>
          </h1>
          <p className="muted text-sm">Viewed, saved, and applied activity across AI evaluation roles.</p>
        </div>

        <div className="card overflow-x-auto">
          {logs.length === 0 ? (
            <p className="empty-state !p-2 text-center">No activity yet. Browse jobs to start tracking.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-indigo-950">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Job</th>
                  <th className="pb-3 pr-4">Company</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-indigo-950/40 last:border-0">
                    <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 pr-4 font-semibold">
                      <Link href={`/jobs?id=${log.job.id}`} className="hover:text-indigo-300">
                        {log.job.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-indigo-300">{log.job.company}</td>
                    <td className="py-3">
                      <span
                        className={`badge ${
                          log.action === 'Applied'
                            ? 'badge-green'
                            : log.action === 'Saved'
                              ? 'badge-purple'
                              : 'badge-blue'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
