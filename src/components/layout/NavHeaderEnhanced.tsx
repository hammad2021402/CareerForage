import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut, Menu, Sparkles, Star, Wifi, WifiOff, X,
  Settings, Sun, Moon, Shield, ShieldOff, Chrome,
  Plus, Minus, Type, Contrast, BookOpen, Volume2,
  ExternalLink,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import { cn } from '@/utils/cn';

/* ── Low Data Mode ──────────────────────────────────────── */
const LDM_KEY = 'apex_low_data_mode';
function initLowData(): boolean {
  try { return localStorage.getItem(LDM_KEY) === 'true'; } catch { return false; }
}
function applyLowData(on: boolean) {
  document.documentElement.classList.toggle('low-data-mode', on);
  try { localStorage.setItem(LDM_KEY, String(on)); } catch { /* ignore */ }
}

/* ── Accessibility helpers ───────────────────────────────── */
interface A11y { fontSize: number; highContrast: boolean; dyslexicFont: boolean; textToSpeech: boolean; }
const A11Y_KEY = 'apex_a11y';
function initA11y(): A11y {
  try { return JSON.parse(localStorage.getItem(A11Y_KEY) ?? 'null') ?? { fontSize: 16, highContrast: false, dyslexicFont: false, textToSpeech: false }; }
  catch { return { fontSize: 16, highContrast: false, dyslexicFont: false, textToSpeech: false }; }
}
function applyA11y(s: A11y) {
  document.documentElement.style.fontSize = `${s.fontSize}px`;
  document.documentElement.classList.toggle('high-contrast', s.highContrast);
  document.documentElement.classList.toggle('dyslexic-font', s.dyslexicFont);
  try { localStorage.setItem(A11Y_KEY, JSON.stringify(s)); } catch {}
}

/* ── Theme helpers ───────────────────────────────────────── */
const THEME_KEY = 'apex_theme';
function initTheme(): 'dark' | 'light' {
  try { return (localStorage.getItem(THEME_KEY) ?? 'dark') as 'dark' | 'light'; } catch { return 'dark'; }
}
function applyTheme(t: 'dark' | 'light') {
  document.documentElement.classList.toggle('light-mode', t === 'light');
  try { localStorage.setItem(THEME_KEY, t); } catch {}
}

/* ── Focus mode helpers ──────────────────────────────────── */
const FOCUS_KEY = 'apex_focus_mode';
function initFocus(): boolean {
  try { return localStorage.getItem(FOCUS_KEY) === 'true'; } catch { return false; }
}

/* ── Nav links (shown ONLY when authenticated) ──────────── */
const AUTH_LINKS = [
  { href: '/dashboard',       label: 'Dashboard' },
  { href: '/study-materials',   label: 'Learn'     },
  { href: '/career-explorer', label: 'Careers'   },
  { href: '/assessments',     label: 'Quizzes'   },
  { href: '/focus-arena',     label: 'Interview' },
  { href: '/notes',           label: 'Notes'     },
  { href: '/redemption',      label: 'Rewards'   },
];

/* ── Component ──────────────────────────────────────────── */
export default function NavHeaderEnhanced() {
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [scrolled,      setScrolled]      = useState(false);
  const [lowData,       setLowData]       = useState(initLowData);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [theme,         setTheme]         = useState<'dark' | 'light'>(initTheme);
  const [focusMode,     setFocusMode]     = useState(initFocus);
  const [extDetected,   setExtDetected]   = useState(false);
  const [a11y,          setA11y]          = useState<A11y>(initA11y);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, authLoading } = useUser();

  /* Apply theme on mount + change */
  useEffect(() => { applyTheme(initTheme()); }, []);
  useEffect(() => { applyTheme(theme); }, [theme]);

  /* Apply a11y on mount + change */
  useEffect(() => { applyA11y(initA11y()); }, []);
  useEffect(() => { applyA11y(a11y); }, [a11y]);

  /* Apply low data on mount */
  useEffect(() => { applyLowData(initLowData()); }, []);

  /* Detect NexusLearn Chrome extension */
  useEffect(() => {
    const detected =
      document.documentElement.hasAttribute('data-nexuslearn-ext') ||
      !!(window as unknown as Record<string, unknown>).nexusLearnExtension;
    setExtDetected(detected);
  }, []);

  const toggleLowData = useCallback(() => {
    setLowData(prev => { const next = !prev; applyLowData(next); return next; });
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => {
      const next = !prev;
      try { localStorage.setItem(FOCUS_KEY, String(next)); } catch {}
      /* Notify extension if present */
      window.postMessage({ type: 'NEXUSLEARN_FOCUS_TOGGLE', enabled: next }, '*');
      return next;
    });
  }, []);

  const patchA11y = useCallback(<K extends keyof A11y>(key: K, val: A11y[K]) => {
    setA11y(prev => ({ ...prev, [key]: val }));
  }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* Only show nav links when logged in */
  const navLinks = user ? AUTH_LINKS : [];

  const displayName = user?.full_name ?? user?.email ?? 'Explorer';
  const firstName   = displayName.split(' ')[0] ?? displayName;

  const initials = useMemo(() => {
    const parts = displayName.trim().split(' ');
    if (parts.length === 1) return (parts[0] ?? 'NL').slice(0, 2).toUpperCase();
    return `${parts[0]?.[0] ?? 'N'}${parts[parts.length - 1]?.[0] ?? 'L'}`.toUpperCase();
  }, [displayName]);

  const xp = useMemo(() => {
    if (typeof user?.xp === 'number') return user.xp;
    const meta = (user?.metadata ?? user?.preferences) as { xp?: number } | undefined;
    return meta?.xp ?? 0;
  }, [user]);

  const level = useMemo(() => {
    if (typeof user?.level === 'number') return user.level;
    const meta = (user?.metadata ?? user?.preferences) as { level?: number } | undefined;
    return meta?.level ?? 1;
  }, [user]);

  const handleLogout = async () => {
    try { await logout(); navigate('/'); }
    catch (err) { console.error('[NavHeader] Logout failed:', err); }
  };

  const settingsPortal = createPortal(
    <AnimatePresence>
      {settingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSettingsOpen(false)}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
          />
          {/* Slide-in panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            className="fixed top-0 right-0 bottom-0 w-[340px] z-[70] flex flex-col
              bg-[var(--surface-elevated)] border-l border-[var(--border)] overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Sora, sans-serif' }}>Settings</span>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="h-7 w-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)]
                  hover:text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* ── Appearance ── */}
              <section>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-3">Appearance</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                       theme === 'dark'
                        ? 'bg-violet-500/12 border-violet-500/30 text-violet-300'
                        : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]',
                    )}
                  >
                    <div className="h-8 w-8 rounded-lg bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                       theme === 'light'
                        ? 'bg-amber-500/12 border-amber-500/30 text-amber-300'
                        : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--text-secondary)]',
                    )}
                  >
                    <div className="h-8 w-8 rounded-lg bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold">Light</span>
                  </button>
                </div>
              </section>

              {/* ── Focus Mode ── */}
              <section>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-3">Focus Mode</p>
                <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 border',
                      focusMode
                        ? 'bg-emerald-500/15 border-emerald-500/25'
                        : 'bg-[var(--surface-card)] border-[var(--border)]',
                    )}>
                      {focusMode
                        ? <Shield className="w-4 h-4 text-emerald-400" />
                        : <ShieldOff className="w-4 h-4 text-[var(--text-muted)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Block distractions</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                        Prevents navigation to social media and entertainment sites while studying
                      </p>
                    </div>
                  </div>
                  {extDetected ? (
                    <button
                      onClick={toggleFocusMode}
                      className={cn(
                        'w-full h-9 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all',
                        focusMode
                           ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                           : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      {focusMode ? '\u2713 Focus Mode Active \u2014 Click to Disable' : 'Enable Focus Mode'}
                    </button>
                  ) : (
                    <a
                      href="https://chromewebstore.google.com/search/NexusLearn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full h-9 rounded-xl
                        bg-blue-500/10 border border-blue-500/25 text-blue-300 text-xs font-semibold
                        hover:bg-blue-500/20 transition-colors"
                    >
                      <Chrome className="w-3.5 h-3.5" />
                      Install Chrome Extension
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  )}
                </div>
              </section>

              {/* ── Accessibility ── */}
              <section>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-3">Accessibility</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)]">
                    <div className="flex items-center gap-2.5">
                      <Type className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span className="text-sm text-[var(--text-secondary)]">Font Size</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => patchA11y('fontSize', Math.max(12, a11y.fontSize - 2))}
                        className="h-6 w-6 rounded-lg bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm text-[var(--text-primary)] w-10 text-center tabular-nums">{a11y.fontSize}px</span>
                      <button
                        onClick={() => patchA11y('fontSize', Math.min(24, a11y.fontSize + 2))}
                        className="h-6 w-6 rounded-lg bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {([
                    { key: 'highContrast' as const,  label: 'High Contrast',  icon: <Contrast className="w-3.5 h-3.5" />,  color: 'violet'  },
                    { key: 'dyslexicFont' as const,   label: 'Dyslexic Font',  icon: <BookOpen className="w-3.5 h-3.5" />, color: 'cyan'    },
                    { key: 'textToSpeech' as const,   label: 'Text-to-Speech', icon: <Volume2 className="w-3.5 h-3.5" />,  color: 'emerald' },
                  ] as const).map(({ key, label, icon, color }) => (
                    <button
                      key={key}
                      onClick={() => patchA11y(key, !a11y[key])}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                        a11y[key]
                          ? color === 'violet'  ? 'bg-violet-500/12 border-violet-500/30 text-violet-300'
                            : color === 'cyan'  ? 'bg-cyan-500/12 border-cyan-500/30 text-cyan-300'
                            : 'bg-emerald-500/12 border-emerald-500/30 text-emerald-300'
                          : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      <span className="flex items-center gap-2.5">{icon}{label}</span>
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                        a11y[key] ? 'bg-[var(--surface-card-hover)] border-[var(--border)]' : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-muted)]',
                      )}>
                        {a11y[key] ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Connection ── */}
              <section>
                <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-3">Connection</p>
                <button
                  onClick={toggleLowData}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                    lowData
                      ? 'bg-violet-500/12 border-violet-500/30 text-violet-300'
                      : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {lowData ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                    Low Data Mode
                  </span>
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                    lowData ? 'bg-[var(--surface-card-hover)] border-[var(--border)]' : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-muted)]',
                  )}>
                    {lowData ? 'ON' : 'OFF'}
                  </span>
                </button>
              </section>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <>
    <motion.header
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl border-b',
        scrolled
          ? 'bg-[var(--surface-glass)] border-[var(--border)]'
          : 'bg-[var(--surface-glass)] border-[var(--border-subtle)]',
      )}
    >
      <div className="w-full px-5 sm:px-8 h-full flex items-center justify-between gap-6">

        {/* ── Logo ── */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500
            flex items-center justify-center flex-shrink-0
            shadow-[0_0_16px_rgba(124,92,252,0.40)]
            group-hover:shadow-[0_0_26px_rgba(124,92,252,0.65)]
            transition-shadow duration-300">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight hidden sm:block select-none"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            ApexPrep
          </span>
        </Link>

        {/* ── Center nav (authenticated only) ── */}
        {navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {navLinks.map(link => {
              const active =
                location.pathname === link.href ||
                (link.href !== '/' && location.pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
                    active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
                  )}
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  {active && (
                    <motion.span
                      layoutId="navPill"
                      className="absolute inset-0 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                    />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* ── Right side ── */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-auto">

          {/* Settings gear */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className={cn(
              'h-8 w-8 rounded-xl border flex items-center justify-center transition-all duration-200',
              settingsOpen
                ? 'bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-primary)]'
                : 'bg-[var(--surface-card)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            )}
            aria-label="Open settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {!user ? (
            <>
              <Link
                to="/auth"
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                  transition-colors duration-150 px-3 py-1.5 rounded-lg hover:bg-[var(--surface-hover)]"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center h-9 px-5 rounded-xl text-sm font-semibold text-white
                  shadow-[0_0_18px_rgba(124,92,252,0.40)]
                  hover:shadow-[0_0_28px_rgba(124,92,252,0.60)]
                  hover:scale-[1.03] active:scale-[0.98] transition-all duration-150"
                style={{
                  fontFamily: 'Sora, sans-serif',
                  background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4ff 100%)',
                }}
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              {/* XP pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                bg-[var(--surface-card)] border border-[var(--border)]">
                <Star className="w-3 h-3 text-violet-400" />
                <span className="text-xs font-semibold text-[var(--text-secondary)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Lv.{level}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">·</span>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">{xp.toLocaleString()}</span>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500
                  flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
                  {initials}
                </div>
                <span
                  className="text-sm font-medium text-[var(--text-primary)] hidden lg:block max-w-[96px] truncate"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  {firstName}
                </span>
              </div>

              {/* Logout */}
              <button
                onClick={() => void handleLogout()}
                disabled={authLoading}
                className="h-8 w-8 rounded-xl border border-[var(--border)] bg-[var(--surface-card)]
                  text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]
                  transition-all duration-200 flex items-center justify-center disabled:opacity-40"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* ── Mobile: CTA + hamburger ── */}
        <div className="md:hidden ml-auto flex items-center gap-2">
          {!user && (
            <Link
              to="/auth"
              className="inline-flex items-center h-8 px-4 text-xs font-semibold text-white rounded-xl"
              style={{
                fontFamily: 'Sora, sans-serif',
                background: 'linear-gradient(135deg, #7c5cfc 0%, #00d4ff 100%)',
              }}
            >
              Get Started
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]
              border border-transparent hover:border-[var(--border-subtle)] transition-all duration-200"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="md:hidden absolute top-full left-0 right-0 bg-[var(--surface-elevated)]
              border-b border-[var(--border-subtle)]"
          >
            <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col gap-1">
              {navLinks.map(link => {
                const active = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
                    )}
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <button
                  onClick={toggleLowData}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
                    lowData
                       ? 'bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-primary)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
                  )}
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  {lowData ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                  Low Data {lowData ? 'ON' : 'OFF'}
                </button>

                {user ? (
                  <button
                    onClick={() => void handleLogout()}
                    disabled={authLoading}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                      border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]
                      transition-all duration-150 disabled:opacity-50"
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                      transition-colors px-3 py-2 rounded-xl hover:bg-[var(--surface-hover)]"
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
    {settingsPortal}
    </>
  );
}
