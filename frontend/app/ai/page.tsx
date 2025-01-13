'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNav from '@/components/AppNav';
import { aiApi, MatchResult } from '@/lib/api';

export default function AIMatchPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [doc, setDoc] = useState<{ title: string; content: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/auth/login');
      return;
    }
    if (!token) return;
    setLoading(true);
    Promise.all([aiApi.skills(), aiApi.match()])
      .then(([s, m]) => {
        setSkills(s.skills);
        setMatches(m);
      })
      .catch((e) => setError(e.message || 'Failed to load matches'))
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  const runCover = async (jobId: number, title: string) => {
    setBusyId(jobId);
    setError('');
    try {
      const res = await aiApi.coverLetter(jobId);
      setDoc({ title: `Cover letter — ${title}`, content: res.content });
    } catch (e: any) {
      setError(e.message || 'Cover letter failed');
    } finally {
      setBusyId(null);
    }
  };

  const runTailor = async (jobId: number, title: string) => {
    setBusyId(jobId);
    setError('');
    try {
      const res = await aiApi.tailorResume(jobId);
      setDoc({ title: `Tailored resume — ${title}`, content: res.content });
    } catch (e: any) {
      setError(e.message || 'Resume tailor failed');
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="page flex items-center justify-center">
        <p className="muted text-sm">Matching jobs to your profile…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <AppNav />
      <main className="container space-y-8 fade-up">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="display text-3xl sm:text-4xl mb-2">
              AI <span className="gradient-text">Job Matching</span>
            </h1>
            <p className="muted text-sm max-w-2xl">
              Phase 3 ranks roles against your profile and master CV. Set <code style={{ color: 'var(--accent)' }}>OPENAI_API_KEY</code> for LLM-written letters; otherwise heuristic templates are used.
            </p>
          </div>
          <Link href="/profile" className="btn-ghost text-sm px-4 py-2.5 shrink-0">Update skills / CV</Link>
        </section>

        <section className="card">
          <h2 className="text-sm font-bold uppercase tracking-wider muted mb-4">Detected skills</h2>
          {skills.length === 0 ? (
            <p className="muted text-sm leading-relaxed">No skills yet — add them on Profile or upload a CV.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="badge badge-accent">{s}</span>
              ))}
            </div>
          )}
        </section>

        {error && (
          <div className="p-4 rounded-lg text-sm" style={{ border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)', background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}>{error}</div>
        )}

        <section className="space-y-4">
          {matches.length === 0 ? (
            <div className="card empty-state">No matches yet. Add skills on Profile, then refresh this page.</div>
          ) : matches.map((m) => (
            <div key={m.job_id} className="card flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-green">{m.score}% match</span>
                  <span className="badge badge-info">{m.remote}</span>
                  <span className="badge badge-accent">{m.salary}</span>
                </div>
                <h3 className="display text-lg">{m.title}</h3>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{m.company}</p>
                <p className="text-xs muted leading-relaxed">
                  Matched: {m.matched_skills.join(', ') || '—'}
                  {m.missing_skills.length > 0 && (
                    <> · Gap: {m.missing_skills.slice(0, 5).join(', ')}</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <button
                  type="button"
                  className="btn-ghost text-xs px-4 py-2.5"
                  disabled={busyId === m.job_id}
                  onClick={() => runCover(m.job_id, m.title)}
                >
                  Cover letter
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs px-4 py-2.5"
                  disabled={busyId === m.job_id}
                  onClick={() => runTailor(m.job_id, m.title)}
                >
                  Tailor CV
                </button>
                <a href={m.apply_url} target="_blank" rel="noreferrer" className="btn-primary !w-auto px-5 py-2.5 text-xs">
                  Apply
                </a>
                <Link href={`/jobs?id=${m.job_id}`} className="btn-ghost text-xs px-4 py-2.5">Details</Link>
              </div>
            </div>
          ))}
        </section>
      </main>

      {doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ background: 'rgba(18, 20, 16, 0.55)', backdropFilter: 'blur(6px)' }} onClick={() => setDoc(null)}>
          <div className="card max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4 gap-4">
              <h3 className="display text-lg">{doc.title}</h3>
              <button type="button" className="btn-ghost text-xs" onClick={() => setDoc(null)}>Close</button>
            </div>
            <pre className="whitespace-pre-wrap text-sm muted font-sans leading-relaxed">{doc.content}</pre>
            <button
              type="button"
              className="btn-primary mt-6"
              onClick={() => navigator.clipboard.writeText(doc.content)}
            >
              Copy to clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
