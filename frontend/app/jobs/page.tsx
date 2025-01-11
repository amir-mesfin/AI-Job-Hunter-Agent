'use client';
import { useEffect, useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import AppNav from '@/components/AppNav';
import { HeartIcon, BookmarkIcon } from '@/components/Icons';
import { jobsApi, historyApi, Job } from '@/lib/api';

function JobsPageContent() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search/Filters State
  const [search, setSearch] = useState('');
  const [remote, setRemote] = useState<string[]>([]);
  const [country, setCountry] = useState<string[]>([]);
  const [exp, setExp] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [skills, setSkills] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Jobs Lists
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [bookmarkIds, setBookmarkIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Job Details Drawer
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Load initial jobs + bookmarks
  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/auth/login');
      return;
    }

    if (token) {
      setLoading(true);
      Promise.all([
        jobsApi.list(),
        jobsApi.saved(),
        jobsApi.bookmarked()
      ])
        .then(([allJobs, saved, bookmarked]) => {
          setJobs(allJobs);
          setSavedIds(saved.map((s) => s.job.id));
          setBookmarkIds(bookmarked.map((b) => b.job.id));
          
          // Check if custom job_id was passed via query params to open drawer
          const paramId = searchParams?.get('id');
          if (paramId) {
            handleViewJob(parseInt(paramId));
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token, authLoading, router, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredJobs();
  };

  const fetchFilteredJobs = () => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (minSalary) params.min_salary = minSalary;
    
    // Arrays need multiple query params or joined strings. Backend expects Query(None) lists.
    // In our api.ts helper we stringify URLSearchParams. To make it clean, we pass key/values.
    remote.forEach((r, idx) => { params[`remote_${idx}`] = r; });
    country.forEach((c, idx) => { params[`country_${idx}`] = c; });
    exp.forEach((ex, idx) => { params[`experience_level_${idx}`] = ex; });
    
    // Split skills by commas
    if (skills) {
      skills.split(',').forEach((s, idx) => {
        params[`skills_${idx}`] = s.trim();
      });
    }

    // Build URL query string manually for lists to match FastAPI list Query parameters
    const queryParts: string[] = [];
    if (search) queryParts.push(`search=${encodeURIComponent(search)}`);
    if (minSalary) queryParts.push(`min_salary=${minSalary}`);
    if (maxSalary) queryParts.push(`max_salary=${maxSalary}`);
    remote.forEach((r) => queryParts.push(`remote=${encodeURIComponent(r)}`));
    country.forEach((c) => queryParts.push(`country=${encodeURIComponent(c)}`));
    exp.forEach((ex) => queryParts.push(`experience_level=${encodeURIComponent(ex)}`));
    if (skills) {
      skills.split(',').forEach((s) => {
        if (s.trim()) queryParts.push(`skills=${encodeURIComponent(s.trim())}`);
      });
    }

    const qs = queryParts.length ? `?${queryParts.join('&')}` : '';
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/jobs${qs}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setJobs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleViewJob = async (jobId: number) => {
    setDrawerLoading(true);
    setSelectedJob(null);
    try {
      const job = await jobsApi.get(jobId);
      setSelectedJob(job);
      // Track action
      await historyApi.add(jobId, 'Viewed');
    } catch {
      // ignore
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleSaveToggle = async (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedIds.includes(jobId)) {
      await jobsApi.unsave(jobId);
      setSavedIds(savedIds.filter((id) => id !== jobId));
    } else {
      await jobsApi.save(jobId);
      setSavedIds([...savedIds, jobId]);
    }
  };

  const handleBookmarkToggle = async (jobId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookmarkIds.includes(jobId)) {
      await jobsApi.unbookmark(jobId);
      setBookmarkIds(bookmarkIds.filter((id) => id !== jobId));
    } else {
      await jobsApi.bookmark(jobId);
      setBookmarkIds([...bookmarkIds, jobId]);
    }
  };

  const toggleArrayItem = (list: string[], val: string, setFn: (l: string[]) => void) => {
    if (list.includes(val)) {
      setFn(list.filter((x) => x !== val));
    } else {
      setFn([...list, val]);
    }
  };

  if (authLoading) return null;

  return (
    <div className="page">
      <AppNav />

      <div className="container jobs-layout fade-up">
        {/* Sidebar Advanced Filters */}
        <aside className="filters-panel space-y-4">
          <button
            type="button"
            className="btn-ghost w-full lg:hidden"
            onClick={() => setShowFilters((v) => !v)}
          >
            {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
          <div className={`card space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <h3 className="section-title border-b pb-3" style={{ borderColor: 'var(--border)' }}>Filters</h3>
            
            {/* Remote Checkboxes */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Job Type</span>
              {['Remote', 'Hybrid', 'On-site'].map((type) => (
                <label key={type} className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remote.includes(type)}
                    onChange={() => toggleArrayItem(remote, type, setRemote)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>

            {/* Country Checkboxes */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Country / Location</span>
              {['USA', 'Canada', 'United Kingdom', 'Remote Worldwide'].map((c) => (
                <label key={c} className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={country.includes(c)}
                    onChange={() => toggleArrayItem(country, c, setCountry)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>

            {/* Experience Levels */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Experience Level</span>
              {['Entry Level', 'Junior', 'Mid-Level', 'Senior'].map((lvl) => (
                <label key={lvl} className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exp.includes(lvl)}
                    onChange={() => toggleArrayItem(exp, lvl, setExp)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>{lvl}</span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold muted uppercase tracking-wider block">Salary range ($/hr)</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="input text-sm py-2 px-3"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="input text-sm py-2 px-3"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                />
              </div>
            </div>

            {/* Tech Skills */}
            <div className="space-y-2">
              <span className="text-xs font-bold muted uppercase tracking-wider block">Skills</span>
              <input
                type="text"
                placeholder="Python, SQL, React"
                className="input text-sm py-2 px-3"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            <button onClick={fetchFilteredJobs} className="btn-primary py-2.5 text-sm font-bold">
              Apply Filters
            </button>
          </div>
        </aside>

        {/* Jobs List Grid Output */}
        <main className="jobs-main space-y-5">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search company, role, keywords…"
              className="input flex-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-primary !w-full sm:!w-auto px-8 font-bold">
              Search
            </button>
          </form>

          <p className="muted text-sm">{loading ? 'Updating…' : `${jobs.length} roles`}</p>
          {loading ? (
            <div className="flex flex-col items-center py-20 text-indigo-400 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium">Updating job feed...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="card text-center py-20 text-slate-400 space-y-2">
              <p className="text-lg font-bold">No matching jobs found.</p>
              <p className="text-sm">Try widening your filters or search keywords.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => handleViewJob(job.id)}
                  className="card flex flex-col md:flex-row md:items-center justify-between gap-5 cursor-pointer transition-all hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="badge badge-purple">{job.remote}</span>
                      <span className="badge badge-green">{job.salary}</span>
                      <span className="badge badge-blue">{job.experience_level}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100">{job.title}</h3>
                    <p className="text-sm text-indigo-300 font-semibold">{job.company} — <span className="text-slate-400 font-normal">{job.location}</span></p>
                    
                    {/* Snippet of skills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skills.split(',').map((s) => (
                        <span key={s} className="text-xs bg-slate-905 border border-indigo-950 px-2 py-0.5 rounded text-indigo-300">{s.trim()}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0">
                    <div className="flex gap-2.5">
                      <button
                        type="button"
                        onClick={(e) => handleSaveToggle(job.id, e)}
                        className={`icon-btn ${savedIds.includes(job.id) ? 'is-active' : ''}`}
                        title="Save job"
                        aria-label={savedIds.includes(job.id) ? 'Unsave job' : 'Save job'}
                        aria-pressed={savedIds.includes(job.id)}
                      >
                        <HeartIcon filled={savedIds.includes(job.id)} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleBookmarkToggle(job.id, e)}
                        className={`icon-btn ${bookmarkIds.includes(job.id) ? 'is-active-moss' : ''}`}
                        title="Bookmark job"
                        aria-label={bookmarkIds.includes(job.id) ? 'Remove bookmark' : 'Bookmark job'}
                        aria-pressed={bookmarkIds.includes(job.id)}
                      >
                        <BookmarkIcon filled={bookmarkIds.includes(job.id)} />
                      </button>
                    </div>
                    <button type="button" className="btn-ghost text-xs px-4 py-2.5">
                      Inspect Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Job details drawer */}
      {selectedJob && (
        <div className="job-drawer-backdrop" onClick={() => setSelectedJob(null)}>
          <aside className="job-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="job-drawer-title">
            <div className="job-drawer-header">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="btn-ghost text-xs px-3 py-2"
              >
                ← Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleSaveToggle(selectedJob.id, e)}
                  className={`icon-btn ${savedIds.includes(selectedJob.id) ? 'is-active' : ''}`}
                  title="Save job"
                  aria-label={savedIds.includes(selectedJob.id) ? 'Unsave job' : 'Save job'}
                >
                  <HeartIcon filled={savedIds.includes(selectedJob.id)} />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleBookmarkToggle(selectedJob.id, e)}
                  className={`icon-btn ${bookmarkIds.includes(selectedJob.id) ? 'is-active-moss' : ''}`}
                  title="Bookmark job"
                  aria-label={bookmarkIds.includes(selectedJob.id) ? 'Remove bookmark' : 'Bookmark job'}
                >
                  <BookmarkIcon filled={bookmarkIds.includes(selectedJob.id)} />
                </button>
              </div>
            </div>

            <div className="job-drawer-body">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge badge-accent">{selectedJob.remote}</span>
                <span className="badge badge-green">{selectedJob.salary}</span>
                <span className="badge badge-info">{selectedJob.experience_level}</span>
              </div>

              <h2 id="job-drawer-title" className="display text-2xl sm:text-3xl leading-tight">
                {selectedJob.title}
              </h2>
              <p className="mt-2 text-base font-semibold" style={{ color: 'var(--accent)' }}>
                {selectedJob.company}
              </p>
              <p className="muted text-sm mt-1">{selectedJob.location}</p>

              <div className="job-drawer-meta">
                <div className="job-drawer-meta-item">
                  <span>Compensation</span>
                  <span>{selectedJob.salary}</span>
                </div>
                <div className="job-drawer-meta-item">
                  <span>Work setting</span>
                  <span>{selectedJob.remote}</span>
                </div>
                <div className="job-drawer-meta-item">
                  <span>Location</span>
                  <span>{selectedJob.location}</span>
                </div>
                <div className="job-drawer-meta-item">
                  <span>Level</span>
                  <span>{selectedJob.experience_level}</span>
                </div>
              </div>

              <div className="job-drawer-section">
                <h4>Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.skills.split(',').filter(Boolean).map((skill) => (
                    <span key={skill} className="badge badge-accent">{skill.trim()}</span>
                  ))}
                </div>
              </div>

              <div className="job-drawer-section">
                <h4>About the role</h4>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text)' }}>
                  {selectedJob.description}
                </p>
              </div>
            </div>

            <div className="job-drawer-footer">
              <a
                href={selectedJob.apply_url}
                target="_blank"
                rel="noreferrer"
                onClick={async () => {
                  await historyApi.add(selectedJob.id, 'Applied');
                }}
                className="btn-primary text-center block py-3.5"
              >
                Apply on company site
              </a>
              <p className="muted text-xs text-center mt-3 leading-relaxed">
                Opens the external application and logs this as Applied in your history.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="page flex items-center justify-center">
        <p className="muted text-sm">Loading jobs…</p>
      </div>
    }>
      <JobsPageContent />
    </Suspense>
  );
}
