import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, BookOpen, BrainCircuit, Check, CheckCircle2,
  ChevronDown, Clock, Eye, EyeOff, Flame, Lock, Mail, Map,
  MessageSquare, Rocket, Search, Sparkles, Star, Target, TrendingUp,
  Upload, User, X, Zap,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useUser } from '../../context/UserContext';
import { cn } from '@/utils/cn';

/* -- Constants ------------------------------------------ */
const CAREERS = [
  { id: 'full-stack-developer',   name: 'Full Stack Developer',      tag: 'Web',      demand: 92, salary: '₹6L–₹25L' },
  { id: 'data-scientist',         name: 'Data Scientist',            tag: 'AI/ML',    demand: 88, salary: '₹8L–₹28L' },
  { id: 'ml-engineer',            name: 'Machine Learning Engineer', tag: 'AI/ML',    demand: 91, salary: '₹10L–₹35L' },
  { id: 'devops-engineer',        name: 'DevOps / Cloud Engineer',   tag: 'Cloud',    demand: 87, salary: '₹7L–₹24L' },
  { id: 'frontend-developer',     name: 'Frontend Developer',        tag: 'Web',      demand: 89, salary: '₹5L–₹20L' },
  { id: 'backend-developer',      name: 'Backend Developer',         tag: 'Web',      demand: 90, salary: '₹6L–₹22L' },
  { id: 'android-developer',      name: 'Android Developer',         tag: 'Mobile',   demand: 82, salary: '₹5L–₹18L' },
  { id: 'ios-developer',          name: 'iOS Developer',             tag: 'Mobile',   demand: 78, salary: '₹6L–₹20L' },
  { id: 'cybersecurity-analyst',  name: 'Cybersecurity Analyst',     tag: 'Security', demand: 85, salary: '₹7L–₹22L' },
  { id: 'product-manager',        name: 'Product Manager',           tag: 'Product',  demand: 80, salary: '₹8L–₹30L' },
  { id: 'ui-ux-designer',         name: 'UI/UX Designer',            tag: 'Design',   demand: 79, salary: '₹4L–₹16L' },
  { id: 'data-analyst',           name: 'Data Analyst',              tag: 'Data',     demand: 84, salary: '₹4L–₹15L' },
  { id: 'blockchain-developer',   name: 'Blockchain Developer',      tag: 'Web3',     demand: 70, salary: '₹8L–₹25L' },
  { id: 'cloud-architect',        name: 'Cloud Architect',           tag: 'Cloud',    demand: 86, salary: '₹12L–₹40L' },
  { id: 'ai-researcher',          name: 'AI/ML Researcher',          tag: 'Research', demand: 83, salary: '₹10L–₹30L' },
];

const QUICK_ROLES = ['full-stack-developer','data-scientist','ml-engineer','devops-engineer','frontend-developer','backend-developer'];

const SKILL_LEVELS = [
  { id: 'beginner',     emoji: '🌱', label: 'Beginner',     sub: 'Just starting out',           bullets: ['Know basic programming concepts','Completed 1–2 online courses','Built 0–1 projects'], path: '8–12 months', border: 'border-emerald-500/60', glow: 'shadow-[0_0_24px_rgba(16,185,129,0.20)]', activeBg: 'bg-emerald-500/10' },
  { id: 'intermediate', emoji: '⚡', label: 'Intermediate', sub: 'Have some real experience',    bullets: ['1–2 years coding experience','2–5 projects in portfolio','Know core concepts of your domain'], path: '4–6 months', border: 'border-violet-500/60', glow: 'shadow-[0_0_24px_rgba(124,92,252,0.25)]', activeBg: 'bg-violet-500/10' },
  { id: 'advanced',    emoji: '🚀', label: 'Advanced',     sub: 'Experienced, need polish',     bullets: ['2+ years experience','Strong portfolio','Need interview prep + skill gaps'], path: '1–3 months', border: 'border-cyan-500/60', glow: 'shadow-[0_0_24px_rgba(0,212,255,0.20)]', activeBg: 'bg-cyan-500/10' },
];

const DEADLINES = [
  { value: '1m',  label: '1 Month',  sub: 'Sprint mode',     hours: '3–4 hrs/day',   days: 30,  icon: Flame,      grad: 'from-orange-500 to-red-500' },
  { value: '3m',  label: '3 Months', sub: 'Focused pace',    hours: '1.5–2 hrs/day', days: 90,  icon: Zap,        grad: 'from-violet-600 to-cyan-500' },
  { value: '6m',  label: '6 Months', sub: 'Steady growth',   hours: '1 hr/day',      days: 180, icon: TrendingUp, grad: 'from-cyan-500 to-blue-500' },
  { value: '12m', label: '1 Year',   sub: 'Relaxed mastery', hours: '30 min/day',    days: 365, icon: BookOpen,   grad: 'from-emerald-500 to-teal-500' },
];

const FEATURES_LEFT = [
  { icon: BrainCircuit, title: 'Resume AI',        desc: 'Reads your resume, maps skill gaps instantly.',         color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: Map,          title: 'Custom Roadmap',   desc: 'Editable skill tree — never static, always evolving.',  color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  { icon: MessageSquare,title: 'Mock Interviews',  desc: 'Real-time AI scoring after every answer.',              color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
];

const TYPING_TEXTS = ['Full Stack Developer','Data Scientist','ML Engineer','DevOps Engineer','Frontend Developer'];

const STEP_CFG = [
  { label: 'Account',  icon: User     },
  { label: 'Level',    icon: Star     },
  { label: 'Career',   icon: Target   },
  { label: 'Resume',   icon: Upload   },
  { label: 'Deadline', icon: Rocket   },
];

const SCAN_MSGS = ['Extracting your skills...','Mapping to job requirements...','Calculating skill gaps...','Building your roadmap...'];

const SLIDE = {
  enter: (d: number) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d: number) => ({ x: d > 0 ? -40 : 40, opacity: 0 }),
};

/* -- Helpers --------------------------------------------- */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* -- Helpers --------------------------------------------- */
function pwCheck(pw: string) {
  return {
    len:     pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    num:     /[0-9]/.test(pw),
    special: /[^a-zA-Z0-9]/.test(pw),
  };
}
function getStrength(pw: string) {
  const c = pwCheck(pw);
  const s = [c.len, c.upper, c.num, c.special].filter(Boolean).length;
  const map = ['','Weak','Fair','Good','Strong'] as const;
  const col = ['','bg-red-500','bg-yellow-500','bg-blue-400','bg-emerald-500'];
  return { score: s, label: map[s] ?? '', color: col[s] ?? '' };
}

/* -- FormInput ------------------------------------------- */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string; icon?: React.ReactNode; error?: boolean;
  right?: React.ReactNode;
}
const FormInput: React.FC<FormInputProps> = ({ label, icon, right, error, className, ...props }) => (
  <div className="space-y-1.5">
    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] tracking-widest uppercase">{label}</label>
    <div className="relative">
      {icon && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[var(--text-muted)]">{icon}</span>}
      <input
        className={cn('input-apex h-12 rounded-xl w-full', icon ? 'pl-10' : 'pl-4', right ? 'pr-10' : 'pr-4',
          error && 'border-red-500/60 focus:border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]', className)}
        {...props}
      />
      {right && <span className="absolute inset-y-0 right-3.5 flex items-center">{right}</span>}
    </div>
  </div>
);

/* -- PasswordStrengthBar --------------------------------- */
const PasswordStrengthBar: React.FC<{ password: string }> = ({ password }) => {
  const { score, label, color } = getStrength(password);
  const checks = pwCheck(password);
  if (!password) return null;
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300', i <= score ? color : 'bg-[var(--border-subtle)]')} />
        ))}
        <span className={cn('text-[11px] font-semibold ml-1', score >= 3 ? 'text-emerald-400' : score === 2 ? 'text-yellow-400' : 'text-red-400')}>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {([['len','8+ characters'],['upper','Uppercase letter'],['num','Number'],['special','Special character']] as [keyof ReturnType<typeof pwCheck>, string][]).map(([k,t]) => (
          <div key={k} className="flex items-center gap-1.5">
            <Check className={cn('w-3 h-3 flex-shrink-0', checks[k] ? 'text-emerald-400' : 'text-[var(--text-muted)]')} />
            <span className={cn('text-[11px]', checks[k] ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]')}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -- StepIndicator --------------------------------------- */
const StepIndicator: React.FC<{ step: number }> = ({ step }) => (
  <div className="flex items-center gap-1 mb-6">
    {STEP_CFG.map((s, i) => {
      const done = i < step, active = i === step;
      const Icon = s.icon;
      return (
        <React.Fragment key={s.label}>
          <div className="flex flex-col items-center gap-1">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
              done  ? 'bg-emerald-500/20 border border-emerald-500/60' :
              active ? 'bg-gradient-to-br from-violet-600 to-cyan-500 shadow-[0_0_14px_rgba(124,92,252,0.50)]' :
                       'bg-[var(--surface-hover)] border border-[var(--border-subtle)]')}>
              {done
                ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                : <Icon className={cn('w-3.5 h-3.5', active ? 'text-white' : 'text-[var(--text-muted)]')} />}
            </div>
            <span className={cn('text-[10px] font-medium hidden sm:block', active ? 'text-[var(--text-primary)]' : done ? 'text-emerald-400' : 'text-[var(--text-muted)]')}>{s.label}</span>
          </div>
          {i < STEP_CFG.length - 1 && (
            <div className={cn('flex-1 h-px mb-4 transition-all duration-300', i < step ? 'bg-emerald-500/40' : 'bg-[var(--border-subtle)]')} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/* -- TypingText ------------------------------------------ */
const TypingText: React.FC = () => {
  const [idx, setIdx]   = useState(0);
  const [text, setText] = useState('');
  const [del, setDel]   = useState(false);
  useEffect(() => {
    const target = TYPING_TEXTS[idx];
    const timer = setTimeout(() => {
      if (!del) {
        if (text.length < target.length) setText(target.slice(0, text.length + 1));
        else { setTimeout(() => setDel(true), 1600); return; }
      } else {
        if (text.length > 0) setText(text.slice(0, -1));
        else { setDel(false); setIdx((idx + 1) % TYPING_TEXTS.length); }
      }
    }, del ? 40 : 70);
    return () => clearTimeout(timer);
  }, [text, del, idx]);
  return (
    <span className="gradient-text font-extrabold" style={{ WebkitBackgroundClip:'text', backgroundClip:'text' }}>
      {text}<span className="animate-pulse">|</span>
    </span>
  );
};

/* -- LeftPanel ------------------------------------------- */
const LeftPanel: React.FC = () => (
  <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden">
    <div aria-hidden className="absolute inset-0" style={{ background:'radial-gradient(ellipse at 20% 40%, rgba(124,92,252,0.16) 0%, transparent 60%)' }} />
    <div className="bg-dot-grid absolute inset-0 opacity-50 pointer-events-none" />
    <motion.div aria-hidden className="absolute top-1/3 left-1/4 w-[480px] h-[480px] rounded-full pointer-events-none"
      animate={{ scale:[1,1.08,1], opacity:[0.06,0.10,0.06] }} transition={{ duration:6, repeat:Infinity, ease:'easeInOut' }}
      style={{ background:'radial-gradient(circle, rgba(124,92,252,0.4) 0%, transparent 70%)' }} />
    <div className="absolute right-0 inset-y-0 w-px bg-gradient-to-b from-transparent via-violet-500/20 to-transparent" />

    <div className="relative z-10 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,92,252,0.5)]">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <span className="text-[var(--text-primary)] font-semibold text-lg" style={{ fontFamily:'Sora,sans-serif' }}>CareerForge</span>
    </div>

    <div className="relative z-10 space-y-8 max-w-lg">
      <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs text-violet-300 font-medium">India's #1 AI Career Copilot</span>
        </div>
        <h1 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-[-0.03em] text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>
          Your AI Career<br />Copilot for{' '}<TypingText />
        </h1>
        <p className="mt-4 text-base text-[var(--text-secondary)] leading-relaxed">
          From resume to job-ready. Personalised roadmaps, skill-gap analysis, and mock interviews — built for Indian tech students.
        </p>
      </motion.div>

      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.15 }} className="space-y-3">
        {FEATURES_LEFT.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 + i*0.1 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:border-[var(--border)] transition-colors">
            <div className={cn('mt-0.5 p-2 rounded-lg flex-shrink-0', f.bg)}>
              <f.icon className={cn('w-4 h-4', f.color)} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.45 }}
        className="flex items-center gap-8 pt-4 border-t border-[var(--border-subtle)]">
        {[{v:'12K+',l:'Students'},{v:'94%',l:'Job-Ready'},{v:'4.9★',l:'Rating'}].map(s => (
          <div key={s.l}>
            <p className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>{s.v}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.l}</p>
          </div>
        ))}
      </motion.div>
    </div>

    <div className="relative z-10">
      <p className="text-xs text-[var(--text-muted)]">B.Tech Mini Project · Trusted by students from</p>
      <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">IIT · NIT · BITS · VIT · IIIT</p>
    </div>
  </div>
);

/* -- Main Component -------------------------------------- */
export const Welcome: React.FC = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { user, login, register, authLoading } = useUser();

  const redirectPath = useMemo(() => {
    const s = location.state as { from?: string } | null;
    return s?.from ?? '/dashboard';
  }, [location.state]);

  useEffect(() => { if (user) navigate(redirectPath, { replace: true }); }, [user, navigate, redirectPath]);

  /* ── mode / step ──────────────────────────────────────── */
  const [mode, setMode]       = useState<'login'|'register'>('login');
  const [step, setStep]       = useState(0);
  const [direction, setDir]   = useState(1);

  /* ── login ────────────────────────────────────────────── */
  const [loginForm, setLF]    = useState({ email:'', password:'' });
  const [showPw, setShowPw]   = useState(false);
  const [loginErr, setLErr]   = useState(false);

  /* ── step 0: account ─────────────────────────────────── */
  const [regForm, setRF]      = useState({ fullName:'', email:'', password:'' });
  const [showRegPw, setRegPw] = useState(false);

  /* ── step 1: skill level ─────────────────────────────── */
  const [skillLevel, setSkill] = useState('');

  /* ── step 2: career ─────────────────────────────────── */
  const [selectedCareer, setCareer]   = useState('');
  const [careerSearch, setCS]         = useState('');
  const [careerOpen, setCO]           = useState(false);
  const careerRef = useRef<HTMLDivElement>(null);

  /* ── step 3: resume ─────────────────────────────────── */
  const [resumeFile, setRFile]        = useState<File|null>(null);
  const [isParsing, setParsing]       = useState(false);
  const [scanIdx, setScanIdx]         = useState(0);
  const [scanProg, setScanProg]       = useState(0);
  const [analysisOk, setAnalysisOk]  = useState(false);
  const [detectedSkills]              = useState([
    { skill:'Python', level:80 },{ skill:'React', level:60 },{ skill:'SQL', level:50 },
  ]);
  const [skillGaps]                   = useState(['Docker / Kubernetes','System Design','Node.js (Advanced)']);

  /* ── step 4: deadline ────────────────────────────────── */
  const [deadline, setDeadline]       = useState('3m');
  const [celebrating, setCelebrate]   = useState(false);

  const filteredCareers = useMemo(
    () => CAREERS.filter(c => c.name.toLowerCase().includes(careerSearch.toLowerCase()) || c.tag.toLowerCase().includes(careerSearch.toLowerCase())),
    [careerSearch],
  );
  const selCareerObj  = CAREERS.find(c => c.id === selectedCareer);
  const selDeadlineObj = DEADLINES.find(d => d.value === deadline);

  /* close dropdown on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => { if (careerRef.current && !careerRef.current.contains(e.target as Node)) setCO(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* keyboard nav */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (mode !== 'register') return;
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') void handleNext();
      if (e.key === 'Escape' && step > 0) goStep(step - 1);
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  });

  const goStep = (next: number) => { setDir(next > step ? 1 : -1); setStep(next); window.scrollTo({ top:0, behavior:'smooth' }); };
  const switchMode = (m: 'login'|'register') => { setMode(m); setStep(0); setDir(1); };

  /* ── login handler ────────────────────────────────────── */
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { toast.error('Enter your email and password.'); return; }
    try {
      await login({ email: loginForm.email, password: loginForm.password });
      navigate(redirectPath, { replace: true });
    } catch {
      setLErr(true);
      setTimeout(() => setLErr(false), 700);
    }
  };

  /* ── resume drop ─────────────────────────────────────── */
  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]; if (!file) return;
    setRFile(file); setParsing(true); setScanProg(0); setScanIdx(0); setAnalysisOk(false);
    try {
      const b64 = await fileToBase64(file);
      localStorage.setItem('apex_resume_b64', b64);
      localStorage.setItem('apex_resume_name', file.name);
      const total = SCAN_MSGS.length;
      for (let i = 0; i < total; i++) {
        setScanIdx(i);
        setScanProg(Math.round(((i + 1) / total) * 100));
        await new Promise(r => setTimeout(r, 700));
      }
      localStorage.setItem('apex_detected_skills', JSON.stringify(detectedSkills));
      localStorage.setItem('apex_skill_gaps', JSON.stringify(skillGaps));
      setAnalysisOk(true);
    } catch { toast.error('Failed to process resume.'); setRFile(null); }
    finally { setParsing(false); }
  }, [detectedSkills, skillGaps]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept:{ 'application/pdf':['.pdf'],'application/msword':['.doc'],'application/vnd.openxmlformats-officedocument.wordprocessingml.document':['.docx'] },
    maxFiles:1, maxSize:5*1024*1024,
  });

  /* ── next handler ─────────────────────────────────────── */
  const handleNext = async () => {
    if (step === 0) {
      if (!regForm.fullName.trim())   { toast.error('Enter your full name.'); return; }
      if (!regForm.email.trim())      { toast.error('Enter your email.'); return; }
      if (regForm.password.length < 8){ toast.error('Password must be 8+ characters.'); return; }
      goStep(1); return;
    }
    if (step === 1) {
      if (!skillLevel) { toast.error('Select your current skill level.'); return; }
      goStep(2); return;
    }
    if (step === 2) {
      if (!selectedCareer) { toast.error('Select your target career path.'); return; }
      goStep(3); return;
    }
    if (step === 3) { goStep(4); return; }
    if (step === 4) {
      if (!deadline) { toast.error('Choose your deadline.'); return; }
      try {
        await register({ full_name: regForm.fullName, email: regForm.email, password: regForm.password, goals:[selectedCareer], learning_style:'interactive' });
        localStorage.setItem('apex_target_role',        selectedCareer);
        localStorage.setItem('apex_skill_level',        skillLevel);
        localStorage.setItem('apex_deadline',           deadline);
        localStorage.setItem('apex_onboarding_complete','true');
        setCelebrate(true);
        setTimeout(() => navigate('/dashboard', { replace:true }), 1400);
      } catch { /* toast shown in context */ }
    }
  };

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[var(--bg)] overflow-hidden flex">
      <LeftPanel />

      {/* ── RIGHT PANEL ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10 lg:px-10 relative overflow-y-auto">
        <div aria-hidden className="absolute top-[-10%] right-[-15%] w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background:'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)' }} />

        {/* mobile logo */}
        <div className="lg:hidden mb-6 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-[var(--text-primary)] font-semibold" style={{ fontFamily:'Sora,sans-serif' }}>CareerForge</span>
        </div>

        <div className="w-full max-w-[440px] relative z-10">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] mb-7">
            {(['login','register'] as const).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  mode === m ? 'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}
                style={{ fontFamily:'Sora,sans-serif' }}>
                {m === 'login' ? 'Sign In' : 'Get Started'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ══ LOGIN ════════════════════════════════════ */}
            {mode === 'login' && (
              <motion.form key="login" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-14 }}
                transition={{ duration:0.22 }} onSubmit={handleLogin} noValidate
                className={cn('space-y-5', loginErr && 'animate-[shake_0.5s_ease-in-out]')}>
                <div className="mb-1">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>Welcome back</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Continue your learning journey.</p>
                </div>

                <FormInput label="Email" type="email" placeholder="you@example.com"
                  icon={<Mail className="w-4 h-4" />} autoComplete="email" aria-label="Email Address" error={loginErr}
                  value={loginForm.email} onChange={e => setLF(p => ({ ...p, email:e.target.value }))} />

                <FormInput label="Password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  icon={<Lock className="w-4 h-4" />} autoComplete="current-password" aria-label="Password" error={loginErr}
                  value={loginForm.password} onChange={e => setLF(p => ({ ...p, password:e.target.value }))}
                  right={<button type="button" onClick={() => setShowPw(v => !v)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>} />

                <button type="submit" disabled={authLoading}
                  className="btn-primary w-full h-12 rounded-xl text-sm mt-1 hover:-translate-y-[1px] transition-transform">
                  {authLoading ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <>Continue to Dashboard <ArrowRight className="w-4 h-4" /></>}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button type="button" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">Forgot password?</button>
                  <button type="button" onClick={() => switchMode('register')} className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors">Create account →</button>
                </div>

                {/* social proof */}
                <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex -space-x-2">
                    {['A','R','S'].map(l => (
                      <div key={l} className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 border-2 border-[var(--bg)] flex items-center justify-center text-[10px] font-bold text-white">{l}</div>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Join <span className="text-[var(--text-primary)] font-semibold">12,847</span> students already learning</p>
                </div>
              </motion.form>
            )}

            {/* ══ REGISTER ═════════════════════════════════ */}
            {mode === 'register' && (
              <motion.div key="register" initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-14 }} transition={{ duration:0.22 }}>

                {/* celebration overlay */}
                <AnimatePresence>
                  {celebrating && (
                    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]/80 backdrop-blur-sm">
                      <motion.div initial={{ scale:0.5, opacity:0 }} animate={{ scale:1, opacity:1 }} transition={{ type:'spring', stiffness:300 }}
                        className="flex flex-col items-center gap-4">
                        <motion.div animate={{ scale:[1,1.3,1] }} transition={{ repeat:Infinity, duration:1.2 }}
                          className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_60px_rgba(124,92,252,0.60)]">
                          <Rocket className="w-9 h-9 text-white" />
                        </motion.div>
                        <p className="text-xl font-bold text-white" style={{ fontFamily:'Sora,sans-serif' }}>Launching your roadmap 🚀</p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <StepIndicator step={step} />

                {/* progress bar */}
                <div className="w-full h-[3px] bg-[var(--border-subtle)] rounded-full mb-6 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                    animate={{ width:`${((step+1)/STEP_CFG.length)*100}%` }} transition={{ duration:0.4, ease:[0.4,0,0.2,1] }} />
                </div>

                {/* mobile step label */}
                <div className="sm:hidden mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{STEP_CFG[step]?.label}</span>
                  <span className="text-xs text-[var(--text-muted)]">Step {step+1} of {STEP_CFG.length}</span>
                </div>

                <AnimatePresence mode="wait" custom={direction}>

                  {/* ─── STEP 0: ACCOUNT ──────────────────── */}
                  {step === 0 && (
                    <motion.div key="s0" custom={direction} variants={SLIDE} initial="enter" animate="center" exit="exit"
                      transition={{ duration:0.22, ease:[0.4,0,0.2,1] }} className="space-y-4">
                      <div><h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>Create your account</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Start your AI-powered career journey today.</p></div>

                      <FormInput label="Full Name" type="text" placeholder="Arjun Sharma" icon={<User className="w-4 h-4" />}
                        autoComplete="name" aria-label="Full name"
                        value={regForm.fullName} onChange={e => setRF(p => ({ ...p, fullName:e.target.value }))} />
                      <FormInput label="Email" type="email" placeholder="you@example.com" icon={<Mail className="w-4 h-4" />}
                        autoComplete="email" aria-label="Email address"
                        value={regForm.email} onChange={e => setRF(p => ({ ...p, email:e.target.value }))} />
                      <div className="space-y-2">
                        <FormInput label="Password" type={showRegPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                           icon={<Lock className="w-4 h-4" />} autoComplete="new-password" aria-label="Password"
                          value={regForm.password} onChange={e => setRF(p => ({ ...p, password:e.target.value }))}
                          right={<button type="button" onClick={() => setRegPw(v => !v)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                            {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>} />
                        <PasswordStrengthBar password={regForm.password} />
                      </div>
                    </motion.div>
                  )}

                  {/* ─── STEP 1: SKILL LEVEL ──────────────── */}
                  {step === 1 && (
                    <motion.div key="s1" custom={direction} variants={SLIDE} initial="enter" animate="center" exit="exit"
                      transition={{ duration:0.22, ease:[0.4,0,0.2,1] }} className="space-y-4">
                      <div><h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>Where are you right now?</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Be honest — your roadmap will be calibrated to your actual level.</p></div>

                      <div className="space-y-3">
                        {SKILL_LEVELS.map(lvl => {
                          const sel = skillLevel === lvl.id;
                          return (
                            <button key={lvl.id} type="button" onClick={() => setSkill(lvl.id)}
                              className={cn('relative w-full text-left p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01]',
                                sel ? `${lvl.border} ${lvl.activeBg} ${lvl.glow}` : 'border-[var(--border-subtle)] bg-[var(--surface-hover)] hover:border-[var(--border)]')}>
                              {sel && <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                              <div className="flex items-center gap-2.5 mb-2">
                                <span className="text-2xl">{lvl.emoji}</span>
                                <div>
                                  <p className="text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>{lvl.label}</p>
                                  <p className="text-xs text-[var(--text-muted)]">{lvl.sub}</p>
                                </div>
                              </div>
                              <ul className="space-y-0.5 mb-2 pl-1">
                                {lvl.bullets.map(b => (
                                  <li key={b} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                    <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] flex-shrink-0" />{b}
                                  </li>
                                ))}
                              </ul>
                              <p className={cn('text-xs font-semibold', sel ? 'text-violet-300' : 'text-[var(--text-muted)]')}>
                                Estimated path: {lvl.path}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* ─── STEP 2: CAREER PATH ──────────────── */}
                  {step === 2 && (
                    <motion.div key="s2" custom={direction} variants={SLIDE} initial="enter" animate="center" exit="exit"
                      transition={{ duration:0.22, ease:[0.4,0,0.2,1] }} className="space-y-4">
                      <div><h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>What role are you targeting?</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">Pick your dream job — we'll build the path to get you there.</p></div>

                      {/* quick chips */}
                      <div className="flex flex-wrap gap-2">
                        {QUICK_ROLES.map(rid => {
                          const c = CAREERS.find(x => x.id === rid)!;
                          return (
                            <button key={rid} type="button" onClick={() => { setCareer(rid); setCO(false); }}
                              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
                                selectedCareer === rid
                                  ? 'border-violet-500/60 bg-violet-500/20 text-violet-300'
                                  : 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]')}>
                              {c.name}
                            </button>
                          );
                        })}
                      </div>

                      {/* searchable dropdown */}
                      <div className="space-y-1.5" ref={careerRef}>
                        <label className="block text-[11px] font-semibold text-[var(--text-secondary)] tracking-widest uppercase">Or search all roles</label>
                        <div className="relative">
                          <button type="button" onClick={() => setCO(o => !o)}
                            className={cn('input-apex h-12 rounded-xl w-full flex items-center justify-between text-left px-4', selectedCareer ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}
                            aria-expanded={careerOpen} aria-haspopup="listbox">
                            <span className="truncate">{selCareerObj ? selCareerObj.name : 'Select a career path…'}</span>
                            <ChevronDown className={cn('w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform duration-200', careerOpen && 'rotate-180')} />
                          </button>
                          <AnimatePresence>
                            {careerOpen && (
                              <motion.div initial={{ opacity:0, y:-6, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-6, scale:0.98 }}
                                transition={{ duration:0.14 }} role="listbox" aria-label="Career paths"
                                className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[0_20px_60px_rgba(0,0,0,0.70)] overflow-hidden">
                                <div className="p-2 border-b border-[var(--border-subtle)]">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <input className="w-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl h-9 pl-8 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-violet-500/50"
                                      placeholder="Search roles…" value={careerSearch} onChange={e => setCS(e.target.value)} autoFocus />
                                  </div>
                                </div>
                                <ul className="max-h-48 overflow-y-auto py-1">
                                  {filteredCareers.length === 0
                                    ? <li className="px-3 py-3 text-xs text-[var(--text-muted)] text-center">No results</li>
                                    : filteredCareers.map(c => (
                                      <li key={c.id}>
                                        <button type="button" role="option" aria-selected={selectedCareer === c.id}
                                          onClick={() => { setCareer(c.id); setCO(false); setCS(''); }}
                                          className={cn('w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors duration-100',
                                            selectedCareer === c.id ? 'bg-violet-500/15 text-violet-300' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]')}>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{c.name}</span>
                                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-hover)] text-[10px] text-[var(--text-muted)]">{c.tag}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-[var(--text-muted)]">{c.demand}%</span>
                                            {selectedCareer === c.id && <Check className="w-3.5 h-3.5 text-violet-400" />}
                                          </div>
                                        </button>
                                      </li>
                                    ))}
                                </ul>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* career preview card */}
                        <AnimatePresence>
                          {selCareerObj && (
                            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                              className="overflow-hidden">
                              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-500/10 border border-violet-500/20 mt-2">
                                <Target className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-violet-300 font-semibold truncate">{selCareerObj.name}</p>
                                  <p className="text-[11px] text-[var(--text-muted)]">{selCareerObj.salary}/yr · {selCareerObj.demand}% Market demand · High growth</p>
                                </div>
                                <div className="w-12 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden flex-shrink-0">
                                  <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" style={{ width:`${selCareerObj.demand}%` }} />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── STEP 3: RESUME ───────────────────── */}
                  {step === 3 && (
                    <motion.div key="s3" custom={direction} variants={SLIDE} initial="enter" animate="center" exit="exit"
                      transition={{ duration:0.22, ease:[0.4,0,0.2,1] }} className="space-y-4">
                      <div><h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>Let AI read your resume</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">We'll find your skill gaps and build your roadmap automatically.</p></div>

                      {!analysisOk ? (
                        <div {...getRootProps()} className={cn('relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200',
                          isDragActive ? 'border-violet-500 bg-violet-500/10 scale-[1.01]' :
                          resumeFile ? 'border-emerald-500/60 bg-emerald-500/5' :
                          'border-[var(--border)] hover:border-violet-500/40 hover:bg-[var(--surface-hover)]')}>
                          <input {...getInputProps()} aria-label="Upload resume" />
                          {isParsing ? (
                            <div className="flex flex-col items-center gap-4 py-2">
                              <div className="relative h-14 w-14">
                                <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,92,252,0.5)]">
                                  <Sparkles className="w-5 h-5 text-white animate-pulse" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <AnimatePresence mode="wait">
                                  <motion.p key={scanIdx} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
                                    className="text-sm text-violet-300 font-semibold">{SCAN_MSGS[scanIdx]}</motion.p>
                                </AnimatePresence>
                                <p className="text-xs text-[var(--text-muted)]">{resumeFile?.name}</p>
                              </div>
                              <div className="w-48 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                                <motion.div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                                  animate={{ width:`${scanProg}%` }} transition={{ duration:0.4 }} />
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)]">{scanProg}% complete</p>
                            </div>
                          ) : resumeFile ? (
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{resumeFile.name}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{Math.round(resumeFile.size/1024)} KB · Uploaded</p>
                              </div>
                              <button type="button" onClick={e => { e.stopPropagation(); setRFile(null); setAnalysisOk(false); localStorage.removeItem('apex_resume_b64'); localStorage.removeItem('apex_resume_name'); }}
                                className="flex-shrink-0 h-7 w-7 rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-card-hover)] flex items-center justify-center transition-colors" aria-label="Remove resume">
                                <X className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-3 py-2">
                              <div className="h-12 w-12 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center">
                                <Upload className="w-6 h-6 text-[var(--text-muted)]" />
                              </div>
                              <div>
                                <p className="text-sm text-[var(--text-primary)] font-medium">{isDragActive ? 'Drop your resume here' : 'Drag & drop or click to upload'}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">PDF, DOC, DOCX · Max 5MB</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Skills detected panel */
                        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
                          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Skills found in your resume</p>
                          </div>
                          <div className="space-y-2">
                            {detectedSkills.map(({ skill, level }) => (
                              <div key={skill} className="flex items-center gap-3">
                                <span className="text-xs text-[var(--text-secondary)] w-16 flex-shrink-0">{skill}</span>
                                <div className="flex-1 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                                  <motion.div initial={{ width:0 }} animate={{ width:`${level}%` }} transition={{ duration:0.6, ease:'easeOut' }}
                                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" />
                                </div>
                                <span className="text-[11px] text-[var(--text-muted)] w-8 text-right">{level}%</span>
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-[var(--border-subtle)]">
                            <p className="text-xs text-yellow-400 font-semibold mb-1.5">⚠ Missing for {selCareerObj?.name ?? 'your role'}:</p>
                            {skillGaps.map(g => (
                              <div key={g} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                <span className="w-1 h-1 rounded-full bg-yellow-500/60 flex-shrink-0" />{g}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      <button type="button" onClick={() => { setRFile(null); setAnalysisOk(false); goStep(4); }}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline transition-colors w-full text-center">
                        Skip — I'll enter manually
                      </button>
                    </motion.div>
                  )}

                  {/* ─── STEP 4: DEADLINE ─────────────────── */}
                  {step === 4 && (
                    <motion.div key="s4" custom={direction} variants={SLIDE} initial="enter" animate="center" exit="exit"
                      transition={{ duration:0.22, ease:[0.4,0,0.2,1] }} className="space-y-4">
                      <div><h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily:'Sora,sans-serif' }}>When do you want to be job-ready?</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">We'll pace your roadmap based on your timeline.</p></div>

                      <div className="grid grid-cols-2 gap-3">
                        {DEADLINES.map(d => {
                          const sel = deadline === d.value;
                          return (
                            <button key={d.value} type="button" onClick={() => setDeadline(d.value)}
                              className={cn('relative p-4 rounded-2xl border text-left transition-all duration-200 hover:scale-[1.02]',
                                sel ? 'border-violet-500/50 bg-violet-500/10 shadow-[0_0_20px_rgba(124,92,252,0.18)]' : 'border-[var(--border-subtle)] bg-[var(--surface-hover)] hover:border-[var(--border)]')}>
                              {sel && <div className="absolute top-2.5 right-2.5"><Check className="w-3.5 h-3.5 text-violet-400" /></div>}
                              <div className={cn('inline-flex p-1.5 rounded-lg mb-2', sel ? 'bg-violet-500/20' : 'bg-[var(--surface-hover)]')}>
                                <d.icon className={cn('w-4 h-4', sel ? 'text-violet-400' : 'text-[var(--text-muted)]')} />
                              </div>
                              <p className={cn('text-sm font-semibold', sel ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')} style={{ fontFamily:'Sora,sans-serif' }}>{d.label}</p>
                              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{d.sub}</p>
                              <div className="flex items-center gap-1 mt-1.5">
                                <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                                <span className="text-[11px] text-[var(--text-muted)]">{d.hours}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {selDeadlineObj && (
                        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                          className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                          <Rocket className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-[var(--text-primary)] font-semibold mb-0.5">Your commitment plan</p>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {selDeadlineObj.hours} · {selDeadlineObj.days} days remaining · Starting{' '}
                              <span className="text-[var(--text-primary)] font-semibold">{new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* ── NAV ROW ──────────────────────────────── */}
                <div className="flex gap-3 mt-6">
                  {step > 0 && (
                    <button type="button" onClick={() => goStep(step - 1)}
                      className="h-12 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)] transition-all flex items-center gap-2 text-sm font-medium">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                  <button type="button" onClick={() => void handleNext()} disabled={authLoading}
                    className="btn-primary flex-1 h-12 text-sm rounded-xl hover:-translate-y-[1px] transition-transform">
                    {authLoading ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      : step === 4 ? <><Rocket className="w-4 h-4" /> Launch My Roadmap 🚀</>
                      : step === 3 && analysisOk ? <>Looks good — Build my roadmap <ArrowRight className="w-4 h-4" /></>
                      : <>Continue <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>

                <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchMode('login')} className="text-violet-400 hover:text-violet-300 font-semibold transition-colors">Sign in</button>
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <p className="absolute bottom-5 text-xs text-[var(--text-muted)]">© 2025 CareerForge · Privacy · Terms</p>
      </div>
    </div>
  );
};

export default Welcome;
