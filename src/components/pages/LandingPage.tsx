import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import SpaceBackground from '@/components/shared/SpaceBackground';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Map,
  MessageSquare,
  Rocket,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { AppPageLayout } from '@/components/layout/AppPageLayout';
import { GlassCard } from '@/components/ui';

/* -- Data ------------------------------------------------ */
const STATS = [
  { value: '12K+', label: 'Students Placed' },
  { value: '94%',  label: 'Job-Ready Rate'  },
  { value: '18',   label: 'Career Paths'    },
  { value: '4.9',  label: 'Avg. Rating', star: true },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Resume Studio',
    desc: 'Upload and build print-ready resumes tailored to target job descriptions with detailed ATS scores.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    span: 'lg:col-span-2',
    glow: 'rgba(124,92,252,0.14)',
  },
  {
    icon: Map,
    title: 'Study Materials',
    desc: 'Structured learning roadmap with progress tracking and topic mastery.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    span: 'lg:col-span-1',
    glow: 'rgba(0,212,255,0.12)',
  },
  {
    icon: Target,
    title: 'Study Planner',
    desc: 'Organize your study goals, prepare weekly calendar milestones, and plan daily practice sessions.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    span: 'lg:col-span-1',
    glow: 'rgba(249,115,22,0.10)',
  },
  {
    icon: MessageSquare,
    title: 'Interview Hub',
    desc: 'Practice technical, behavioral, and system design interviews with voice transcription and real-time evaluation.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    span: 'lg:col-span-1',
    glow: 'rgba(34,197,94,0.10)',
  },
  {
    icon: TrendingUp,
    title: 'Analytics Dashboard',
    desc: 'Track your confidence levels, technical accuracy, communication, and overall interview performance metrics.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    span: 'lg:col-span-1',
    glow: 'rgba(244,63,94,0.10)',
  },
];

const STEPS = [
  {
    n: 'Step 1',
    title: 'Upload and Analyze Resume',
    desc: 'Get ATS score, keyword matching, strengths, weaknesses, and improvement suggestions.',
    icon: Rocket,
    gradient: 'from-violet-600 to-purple-600',
  },
  {
    n: 'Step 2',
    title: 'Build Learning Roadmap',
    desc: 'Generate a personalized learning path based on career goals and missing skills.',
    icon: Target,
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    n: 'Step 3',
    title: 'Practice and Track Progress',
    desc: 'Use Interview Hub, Study Planner, and Analytics to prepare for placements.',
    icon: TrendingUp,
    gradient: 'from-emerald-500 to-teal-600',
  },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Data Scientist @ Swiggy',
    avatar: 'PS',
    text: 'CareerForge showed me exactly what was missing from my resume. Landed my dream job in 3 months.',
    stars: 5,
  },
  {
    name: 'Arjun Mehta',
    role: 'SDE-2 @ Razorpay',
    avatar: 'AM',
    text: 'The mock interview feature is insane — real-time feedback completely changed how I prepare.',
    stars: 5,
  },
  {
    name: 'Divya Reddy',
    role: 'ML Engineer @ PhonePe',
    avatar: 'DR',
    text: 'The roadmap adapts as I learn. No other platform does this. Genuinely game-changing.',
    stars: 5,
  },
];

/* -- Motion helpers -------------------------------------- */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } },
};
const stagger = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.09 } },
};

/* -- Component ------------------------------------------- */
export default function LandingPage() {
  return (
    <AppPageLayout className="max-w-none px-0 pt-0 space-y-0 pb-0">

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-6 pt-24 pb-16 overflow-hidden">
        <SpaceBackground />
        <div className="relative z-10 max-w-5xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-xs font-semibold text-violet-300 tracking-widest uppercase">
                AI Powered Career Platform &middot; B.Tech Mini Project
              </span>
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-[-0.045em] text-[var(--text-primary)] mb-6 leading-[1.03]"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Land your{' '}
            <span className="gradient-text">dream tech job</span>
            <br />
            3&times; faster with AI.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed mb-10 font-sans"
          >
            Upload your resume, build a personalized learning roadmap, organize study plans, and practice interviews.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.26 }}
            className="flex items-center justify-center gap-4 flex-wrap"
          >
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[0.95rem] font-semibold bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] text-white hover:opacity-95 transition-all hover:scale-[1.01] shadow-[0_0_32px_rgba(124,92,252,0.40)] font-display"
            >
              <Sparkles className="w-4 h-4" />
              Get Started &mdash; Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[var(--border)]
                bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]
                transition-all duration-200 text-sm font-medium"
            >
              <ChevronRight className="w-4 h-4" />
              View Demo
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="mt-24 pt-10 border-t border-[var(--border-subtle)] flex items-center justify-center gap-10 md:gap-16 flex-wrap"
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p
                  className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight font-display"
                >
                  {s.value}
                  {s.star && <span className="text-amber-400 ml-0.5">&#9733;</span>}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 tracking-wide font-sans">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES BENTO ──────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="mb-16 text-center"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-[var(--violet)] uppercase tracking-[0.2em] mb-4">
            Everything you need
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight font-display"
          >
            One platform. Complete career launch.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className={cn(f.span)}
            >
              <GlassCard
                hover
                className="group flex flex-col justify-between p-7 h-full text-left"
              >
                <div>
                  <div className={cn('inline-flex p-2.5 rounded-xl mb-4', f.bg)}>
                    <f.icon className={cn('w-5 h-5', f.color)} />
                  </div>
                  <h3
                    className="text-lg font-bold text-[var(--text-primary)] mb-2 font-display"
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">{f.desc}</p>
                </div>
                {/* Hover glow */}
                <div
                  className="absolute -top-10 -right-10 w-36 h-36 rounded-full opacity-0 group-hover:opacity-100
                    transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${f.glow} 0%, transparent 70%)` }}
                />
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-[var(--cyan)] uppercase tracking-[0.2em] mb-4">
            How it works
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] tracking-tight font-display"
          >
            From zero to job-ready.{' '}
            <span className="gradient-text">In 3 steps.</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {STEPS.map((s) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
            >
              <GlassCard
                hover
                className="flex flex-col items-center text-center p-8 h-full"
              >
                <div className={cn(
                  'h-14 w-14 rounded-2xl mb-5 flex items-center justify-center bg-gradient-to-br shadow-lg',
                  s.gradient,
                )}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.3em] uppercase mb-2 font-display">{s.n}</span>
                <h3
                  className="text-lg font-bold text-[var(--text-primary)] mb-3 font-display"
                >
                  {s.title}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">{s.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-14"
        >
          <motion.p variants={fadeUp} className="text-xs font-semibold text-emerald-400 uppercase tracking-[0.2em] mb-4">
            Student stories
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-4xl font-bold text-[var(--text-primary)] font-display"
          >
            They made it. You can too.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
            >
              <GlassCard
                hover
                className="p-7 flex flex-col gap-4 h-full text-left"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1 font-sans italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)]
                    flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)] font-display">{t.name}</p>
                    <p className="text-xs text-[var(--text-muted)] font-sans">{t.role}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
          >
            <GlassCard
              glow
              className="relative p-10 md:p-14 text-center overflow-hidden border-[var(--violet)]/20"
            >
              <div
                aria-hidden
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, rgba(124,92,252,0.18) 0%, transparent 70%)' }}
              />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 mb-8">
                  <Zap className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs font-semibold text-violet-300">Free to start</span>
                </div>
                <h2
                  className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] mb-5 tracking-tight font-display"
                >
                  Your dream job is<br />
                  <span className="gradient-text">3 months away.</span>
                </h2>
                <p className="text-[var(--text-secondary)] mb-10 max-w-lg mx-auto leading-relaxed text-sm font-sans">
                  Join 12,000+ students from IIT, NIT, and BITS who are already on their personalized learning journey.
                </p>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-semibold shadow-[0_0_40px_rgba(124,92,252,0.45)] bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] text-white hover:opacity-95 transition-all hover:scale-[1.01] font-display"
                >
                  <Sparkles className="w-5 h-5" />
                  Start your journey free
                </Link>
                <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
                  {['No credit card', 'Cancel anytime', '94% job-ready rate'].map((v) => (
                    <span key={v} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-sans">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] py-10 px-6 text-center">
        <p className="text-xs text-[var(--text-muted)] font-sans">
          &copy; 2025 CareerForge &middot; B.Tech Mini Project &middot; Trusted by IIT, NIT &amp; BITS students
        </p>
      </footer>

    </AppPageLayout>
  );
}
