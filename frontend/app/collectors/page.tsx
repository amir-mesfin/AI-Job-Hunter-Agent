'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AppNav from '@/components/AppNav';
import { collectorsApi, JobSource } from '@/lib/api';

export default function CollectorsPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    source_type: 'greenhouse',
    board_token: '',
    company_name: '',
  });

  const load = () =>
    collectorsApi.sources().then(setSources).catch((e) => setError(e.message));

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/auth/login');
      return;
    }
    if (!token) return;
    load().finally(() => setLoading(false));
  }, [token, authLoading, router]);

  const syncAll = async () => {
    setSyncing(true);
    setError('');
    setMessage('');
    try {
      const results = await collectorsApi.sync();
      const created = results.reduce((a, r) => a + (r.created || 0), 0);
      const updated = results.reduce((a, r) => a + (r.updated || 0), 0);
      setMessage(`Sync finished — ${created} created, ${updated} updated across ${results.length} sources.`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const syncOne = async (id: number) => {
    setSyncing(true);
    setError('');
    try {
      const r = await collectorsApi.syncOne(id);
      setMessage(`Source #${id}: ${r.created} created, ${r.updated} updated.`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await collectorsApi.createSource({
        name: form.name,
        source_type: form.source_type,
        board_token: form.board_token,
        company_name: form.company_name || undefined,
        enabled: true,
      });
      setForm({ name: '', source_type: 'greenhouse', board_token: '', company_name: '' });
      setMessage('Source added.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not add source');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="page flex items-center justify-center">
        <p className="muted text-sm">Loading collectors…</p>
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
              Job <span className="gradient-text">Collectors</span>
            </h1>
            <p className="muted text-sm max-w-2xl">
              Phase 2 imports AI-related roles from Greenhouse, Lever, and RSS. Live APIs are used when reachable; known boards fall back to offline demos.
            </p>
          </div>
          <button type="button" className="btn-primary !w-full md:!w-auto px-6 py-3 shrink-0" onClick={syncAll} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync all sources'}
          </button>
        </section>

        {message && (
          <div className="p-4 rounded-lg text-sm" style={{ border: '1px solid color-mix(in srgb, var(--success) 40%, transparent)', background: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)' }}>{message}</div>
        )}
        {error && (
          <div className="p-4 rounded-lg text-sm" style={{ border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)', background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}>{error}</div>
        )}

        <section className="space-y-4">
          {sources.length === 0 ? (
            <div className="card empty-state">No collectors yet. Add a source below.</div>
          ) : sources.map((s) => (
            <div key={s.id} className="card flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="badge badge-accent">{s.source_type}</span>
                  <span className={`badge ${s.enabled ? 'badge-green' : 'badge-orange'}`}>
                    {s.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <h3 className="display text-lg">{s.name}</h3>
                <p className="text-sm muted break-all">
                  Token/URL: <span style={{ color: 'var(--accent)' }}>{s.board_token}</span>
                  {s.company_name ? ` · ${s.company_name}` : ''}
                </p>
                <p className="text-xs muted">
                  Last sync: {s.last_synced_at ? new Date(s.last_synced_at).toLocaleString() : 'never'}
                  {typeof s.last_sync_count === 'number' ? ` · ${s.last_sync_count} jobs` : ''}
                </p>
                {s.last_error && <p className="text-xs" style={{ color: 'var(--warn)' }}>Last error: {s.last_error}</p>}
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <button type="button" className="btn-ghost text-xs px-4 py-2.5" disabled={syncing} onClick={() => syncOne(s.id)}>
                  Sync
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs px-4 py-2.5"
                  style={{ color: 'var(--danger)' }}
                  onClick={async () => {
                    await collectorsApi.deleteSource(s.id);
                    await load();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="card space-y-5">
          <h2 className="section-title">Add source</h2>
          <form onSubmit={addSource} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="field space-y-2">
              <label className="block text-xs font-semibold muted uppercase">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field space-y-2">
              <label className="block text-xs font-semibold muted uppercase">Type</label>
              <select
                className="input"
                value={form.source_type}
                onChange={(e) => setForm({ ...form, source_type: e.target.value })}
              >
                <option value="greenhouse">Greenhouse</option>
                <option value="lever">Lever</option>
                <option value="ashby">Ashby</option>
                <option value="rss">RSS</option>
              </select>
            </div>
            <div className="field space-y-2">
              <label className="block text-xs font-semibold muted uppercase">Board token / feed URL</label>
              <input
                className="input"
                placeholder="openai  or  https://…rss"
                value={form.board_token}
                onChange={(e) => setForm({ ...form, board_token: e.target.value })}
                required
              />
            </div>
            <div className="field space-y-2">
              <label className="block text-xs font-semibold muted uppercase">Company (optional)</label>
              <input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary md:col-span-2 py-3">Add collector</button>
          </form>
        </section>
      </main>
    </div>
  );
}
