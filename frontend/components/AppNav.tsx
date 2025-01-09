'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import { BrandLogo, CloseIcon, MenuIcon } from '@/components/Icons';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/saved', label: 'Saved' },
  { href: '/history', label: 'History' },
  { href: '/ai', label: 'AI Match' },
  { href: '/collectors', label: 'Collectors' },
  { href: '/profile', label: 'Profile' },
];

export default function AppNav() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <Link href="/dashboard" className="app-nav-brand" onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden>
            <BrandLogo />
          </span>
          <span>AI Job Hunter</span>
        </Link>

        <nav className="app-nav-links" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname?.startsWith(l.href) ? 'active' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="app-nav-actions">
          <ThemeToggle />
          <button onClick={logout} className="btn-ghost text-xs font-semibold hidden sm:inline-flex">
            Logout
          </button>
          <button
            type="button"
            className="nav-burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>

      <div className={`nav-drawer ${open ? 'open' : ''}`}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname?.startsWith(l.href) ? 'active' : undefined}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        <button
          onClick={() => {
            setOpen(false);
            logout();
          }}
          className="btn-ghost"
          style={{ justifyContent: 'flex-start' }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
