const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (name: string, email: string, password: string) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ access_token: string; name: string; email: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  forgotPassword: (email: string) =>
    request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    }),
};

export interface Profile {
  phone: string | null;
  country: string | null;
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
  experience: string | null;
  bio: string | null;
  skills: string | null;
  user_id: number;
}

export interface ResumeUploadResult {
  id: number;
  user_id: number;
  file_url: string;
  uploaded_at: string;
  file_type: string;
  file_size: number;
  original_filename: string;
  extracted_text?: string | null;
  profile?: Profile | null;
  filled_fields?: string[];
  detail?: string;
}

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  get: () => request<Profile>('/api/profile'),
  update: (data: Record<string, string>) =>
    request<Profile>('/api/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadResume: (file: File) => {
    const token = localStorage.getItem('token');
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE_URL}/api/profile/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || 'Upload failed');
      return data as ResumeUploadResult;
    });
  },
  getResume: () => request('/api/profile/resume'),
  applyResumeToProfile: () =>
    request<Profile>('/api/profile/resume/apply-to-profile', { method: 'POST' }),
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export interface Job {
  id: number;
  company: string;
  title: string;
  location: string;
  salary: string;
  remote: string;
  description: string;
  skills: string;
  apply_url: string;
  experience_level: string;
  country: string;
  source?: string;
  created_at: string;
}

export interface DashboardStats {
  new_jobs_today: number;
  saved_jobs_count: number;
  applied_jobs_count: number;
  resume_uploaded: boolean;
  recent_jobs: Job[];
}

export const jobsApi = {
  list: (params?: Record<string, string | string[]>) => {
    const qs = params
      ? '?' + new URLSearchParams(params as Record<string, string>).toString()
      : '';
    return request<Job[]>(`/api/jobs${qs}`);
  },
  get: (id: number) => request<Job>(`/api/jobs/${id}`),
  save: (id: number) => request(`/api/jobs/${id}/save`, { method: 'POST' }),
  unsave: (id: number) => request(`/api/jobs/${id}/save`, { method: 'DELETE' }),
  bookmark: (id: number) => request(`/api/jobs/${id}/bookmark`, { method: 'POST' }),
  unbookmark: (id: number) => request(`/api/jobs/${id}/bookmark`, { method: 'DELETE' }),
  saved: () => request<{ id: number; job: Job }[]>('/api/jobs/saved'),
  bookmarked: () => request<{ id: number; job: Job }[]>('/api/jobs/bookmarked'),
  dashboardStats: () => request<DashboardStats>('/api/jobs/dashboard/stats'),
};

// ── History ───────────────────────────────────────────────────────────────────
export const historyApi = {
  list: () => request<{ id: number; action: string; date: string; job: Job }[]>('/api/history'),
  add: (job_id: number, action: string) =>
    request('/api/history', { method: 'POST', body: JSON.stringify({ job_id, action }) }),
};

// ── Phase 2 Collectors ────────────────────────────────────────────────────────
export interface JobSource {
  id: number;
  name: string;
  source_type: string;
  board_token: string;
  company_name: string | null;
  enabled: boolean;
  last_synced_at: string | null;
  last_sync_count: number;
  last_error: string | null;
  created_at: string;
}

export interface SyncResult {
  source_id: number;
  ok: boolean;
  created: number;
  updated: number;
  total: number;
  error?: string | null;
}

export const collectorsApi = {
  sources: () => request<JobSource[]>('/api/collectors/sources'),
  createSource: (data: {
    name: string;
    source_type: string;
    board_token: string;
    company_name?: string;
    enabled?: boolean;
  }) => request<JobSource>('/api/collectors/sources', { method: 'POST', body: JSON.stringify(data) }),
  deleteSource: (id: number) => request(`/api/collectors/sources/${id}`, { method: 'DELETE' }),
  sync: () => request<SyncResult[]>('/api/collectors/sync', { method: 'POST' }),
  syncOne: (id: number) => request<SyncResult>(`/api/collectors/sync/${id}`, { method: 'POST' }),
};

// ── Phase 3 AI ────────────────────────────────────────────────────────────────
export interface MatchResult {
  job_id: number;
  title: string;
  company: string;
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  apply_url: string;
  remote: string;
  salary: string;
}

export interface GeneratedDoc {
  id: number;
  user_id: number;
  job_id: number | null;
  doc_type: string;
  content: string;
  match_score: number | null;
  created_at: string;
}

export const aiApi = {
  skills: () => request<{ skills: string[]; source: string; resume_chars: number }>('/api/ai/skills'),
  match: (limit = 50) =>
    request<MatchResult[]>('/api/ai/match', {
      method: 'POST',
      body: JSON.stringify({ limit }),
    }),
  coverLetter: (job_id: number) =>
    request<GeneratedDoc>('/api/ai/cover-letter', {
      method: 'POST',
      body: JSON.stringify({ job_id }),
    }),
  tailorResume: (job_id: number) =>
    request<GeneratedDoc>('/api/ai/tailor-resume', {
      method: 'POST',
      body: JSON.stringify({ job_id }),
    }),
  docs: () => request<GeneratedDoc[]>('/api/ai/docs'),
};
