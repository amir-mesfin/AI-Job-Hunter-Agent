'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AppNav from '@/components/AppNav';
import { profileApi } from '@/lib/api';

function UserGlyph() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" />
    </svg>
  );
}

export default function ProfilePage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvMeta, setCvMeta] = useState<any>(null);

  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [cvMsg, setCvMsg] = useState('');
  const [cvErr, setCvErr] = useState('');

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [fillingFromCv, setFillingFromCv] = useState(false);

  const applyProfileFields = (prof: {
    phone?: string | null;
    country?: string | null;
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
    experience?: string | null;
    bio?: string | null;
    skills?: string | null;
  }) => {
    if (prof.phone != null) setPhone(prof.phone || '');
    if (prof.country != null) setCountry(prof.country || '');
    if (prof.linkedin != null) setLinkedin(prof.linkedin || '');
    if (prof.github != null) setGithub(prof.github || '');
    if (prof.portfolio != null) setPortfolio(prof.portfolio || '');
    if (prof.experience != null) setExperience(prof.experience || '');
    if (prof.bio != null) setBio(prof.bio || '');
    if (prof.skills != null) setSkills(prof.skills || '');
  };

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/auth/login');
      return;
    }

    if (token) {
      setLoading(true);
      Promise.all([
        profileApi.get(),
        profileApi.getResume().catch(() => null),
      ])
        .then(async ([prof, cv]) => {
          applyProfileFields(prof);
          if (cv) setCvMeta(cv);
          // If CV exists but key fields are empty, fill from CV once
          const sparse =
            !prof.linkedin && !prof.github && !prof.phone && !prof.skills && !prof.bio;
          if (cv && sparse) {
            try {
              const filled = await profileApi.applyResumeToProfile();
              applyProfileFields(filled);
            } catch {
              // ignore — CV may have no extractable text
            }
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token, authLoading, router]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    setProfileErr('');
    setSavingProfile(true);
    try {
      await profileApi.update({
        phone, country, linkedin, github, portfolio, experience, bio, skills,
      });
      setProfileMsg('Profile details updated successfully.');
    } catch (err: any) {
      setProfileErr(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) return;
    setCvMsg('');
    setCvErr('');
    setUploadingCv(true);
    try {
      const res = await profileApi.uploadResume(cvFile);
      if (res.detail) throw new Error(res.detail);
      setCvMeta(res);
      if (res.profile) {
        applyProfileFields(res.profile);
        const n = res.filled_fields?.length || 0;
        setCvMsg(
          n > 0
            ? `CV uploaded. Filled ${n} field${n === 1 ? '' : 's'} in Professional details from your CV.`
            : 'Master CV uploaded. No contact fields found in the file — fill them manually.',
        );
      } else {
        setCvMsg('Master CV uploaded successfully.');
      }
      setCvFile(null);
    } catch (err: any) {
      setCvErr(err.message || 'Upload failed. Use PDF or DOCX under the size limit.');
    } finally {
      setUploadingCv(false);
    }
  };

  const handleFillFromCv = async () => {
    setProfileMsg('');
    setProfileErr('');
    setFillingFromCv(true);
    try {
      const filled = await profileApi.applyResumeToProfile();
      applyProfileFields(filled);
      setProfileMsg('Professional details updated from your CV. Review and save if needed.');
    } catch (err: any) {
      setProfileErr(err.message || 'Could not read fields from CV.');
    } finally {
      setFillingFromCv(false);
    }
  };

  const readableSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (authLoading || loading) {
    return (
      <div className="page flex items-center justify-center">
        <p className="muted text-sm">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <AppNav />

      <main className="container fade-up space-y-6">
        <header>
          <h1 className="display text-3xl sm:text-4xl mb-2">
            Your <span className="gradient-text">Profile</span>
          </h1>
          <p className="muted text-sm">Keep contact details and your master CV ready for matching.</p>
        </header>

        <div className="profile-layout">
          <aside className="space-y-5">
            <div className="card text-center space-y-4">
              <div className="profile-avatar" aria-hidden>
                <UserGlyph />
              </div>
              <div>
                <h2 className="display text-xl">
                  {user?.name || (cvMeta ? 'Professional profile' : 'Getting started')}
                </h2>
                <p className="muted text-sm mt-1">{user?.email}</p>
                <p className="muted text-xs mt-2">{country || 'Add your country below'}</p>
              </div>
              {skills && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {skills.split(',').slice(0, 6).map((s) => s.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="badge badge-accent">{s}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="card space-y-5">
              <h3 className="section-title text-lg" style={{ fontSize: '1.15rem' }}>Master CV</h3>
              <p className="muted text-sm leading-relaxed">
                Upload a PDF or DOCX once. AI Match and tailored letters use this file.
              </p>

              {cvMeta && (
                <div className="resume-file">
                  <div className="resume-file-icon" aria-hidden>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3.5h5.5L18 8v12.5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
                      <path d="M13.5 3.5V8H18" />
                      <path d="M9.5 13h5M9.5 16.5h3.5" />
                    </svg>
                  </div>
                  <div className="resume-file-body">
                    <div className="resume-file-top">
                      <span className="resume-file-status">Active</span>
                    </div>
                    <p className="resume-file-name" title={cvMeta.original_filename}>
                      {cvMeta.original_filename}
                    </p>
                    <p className="resume-file-meta">{readableSize(cvMeta.file_size)} · PDF / DOCX</p>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${cvMeta.file_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="resume-file-link"
                    >
                      Download
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {cvMsg && (
                <div className="toast toast-ok" role="status">
                  <span className="toast-dot" aria-hidden />
                  {cvMsg}
                </div>
              )}
              {cvErr && (
                <div className="toast toast-err" role="alert">
                  <span className="toast-dot" aria-hidden />
                  {cvErr}
                </div>
              )}

              <form onSubmit={handleCvUpload} className="space-y-4">
                <div className="field space-y-2">
                  <label className="block text-xs font-bold muted uppercase tracking-wider">
                    Upload PDF / DOCX
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    className="file-input"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary py-3" disabled={uploadingCv || !cvFile}>
                  {uploadingCv ? 'Uploading…' : 'Save CV'}
                </button>
              </form>
            </div>
          </aside>

          <section className="card space-y-5 overflow-hidden">
            <div className="profile-panel-head">
              <div className="min-w-0 space-y-1">
                <h3 className="section-title">Professional details</h3>
                <p className="muted text-sm">Contact links and skills used for matching.</p>
              </div>
              {cvMeta && (
                <button
                  type="button"
                  className="btn-ghost text-xs px-4 py-2.5 shrink-0 self-start"
                  onClick={handleFillFromCv}
                  disabled={fillingFromCv}
                >
                  {fillingFromCv ? 'Reading CV…' : 'Fill from CV'}
                </button>
              )}
            </div>

            <div className="profile-hint">
              <span className="profile-hint-icon" aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5M12 8h.01" />
                </svg>
              </span>
              <p>
                Upload a CV to auto-fill <strong>LinkedIn</strong>, GitHub, phone, skills, and more when they appear in the file.
              </p>
            </div>

            {profileMsg && (
              <div className="toast toast-ok" role="status">
                <span className="toast-dot" aria-hidden />
                {profileMsg}
              </div>
            )}
            {profileErr && (
              <div className="toast toast-err" role="alert">
                <span className="toast-dot" aria-hidden />
                {profileErr}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="profile-form-grid">
                <div className="field">
                  <label htmlFor="phone">Contact phone</label>
                  <input
                    id="phone"
                    type="text"
                    placeholder="e.g. +1 555-0199"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="country">Country</label>
                  <input
                    id="country"
                    type="text"
                    placeholder="e.g. USA, Canada"
                    className="input"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="linkedin">LinkedIn link</label>
                <input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  className="input"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </div>

              <div className="profile-form-grid">
                <div className="field">
                  <label htmlFor="github">GitHub</label>
                  <input
                    id="github"
                    type="url"
                    placeholder="https://github.com/username"
                    className="input"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="portfolio">Portfolio</label>
                  <input
                    id="portfolio"
                    type="url"
                    placeholder="https://yoursite.com"
                    className="input"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="experience">Years of experience</label>
                <input
                  id="experience"
                  type="text"
                  placeholder="e.g. 3 years in AI evaluation"
                  className="input"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="skills">Skills (comma-separated)</label>
                <input
                  id="skills"
                  type="text"
                  placeholder="Python, Git, React, Prompting"
                  className="input"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="bio">Short bio / pitch</label>
                <textarea
                  id="bio"
                  placeholder="Domain expertise, evaluation focus, languages…"
                  className="input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="btn-primary !w-full sm:!w-auto px-8 py-3"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
