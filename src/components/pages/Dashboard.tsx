import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BarChart2,
  BookOpen,
  Bot,
  ChevronRight,
  ChevronUp,
  Clock3,
  Flame,
  Flag,
  Map,
  MessageSquare,
  Target,
  Trophy,
  FileText,
  Video,
  Calendar,
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { useGamification } from '../../hooks/useGamification';
import AIMentor from '../dashboard/AIMentor';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '@/utils/cn';
import {
  getRoadmapStats,
  buildWeekActivity,
  type RoadmapNode,
} from '@/utils/roadmap';
import EmptyState from '../ui/EmptyState';
import CardErrorBoundary from '../ui/CardErrorBoundary';

/* ─────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ─────────────────────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function firstName(full?: string, email?: string) {
  if (full) return full.split(' ')[0];
  if (email) return email.split('@')[0];
  return 'Explorer';
}
function todayLabel() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}
function toTitleCase(slug: string) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/* ─────────────────────────────────────────────────────────── */
/*  Animation variants                                          */
/* ─────────────────────────────────────────────────────────── */
const FADE = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] } },
};
const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

/* ─────────────────────────────────────────────────────────── */
/*  1. Welcome Hero Panel Component (Linear/Apple style)       */
/* ─────────────────────────────────────────────────────────── */
interface WelcomeHeroProps {
  name: string;
  targetRole: string | null;
  level: number;
  xp: number;
  badgeCount: number;
  careerReadiness: number;
  loading: boolean;
  onContinueLearning: () => void;
}

const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  name,
  targetRole,
  level,
  xp,
  badgeCount,
  careerReadiness,
  loading,
  onContinueLearning,
}) => {
  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-[var(--surface-card)] border border-[var(--border-subtle)] shimmer min-h-[180px]">
        <div className="space-y-4">
          <Skeleton variant="line" width="30%" height={24} />
          <Skeleton variant="line" width="50%" height={32} />
          <div className="flex gap-4">
            <Skeleton variant="line" width="10%" height={16} />
            <Skeleton variant="line" width="10%" height={16} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={FADE}
      className="relative overflow-hidden rounded-3xl mb-6 p-6 sm:p-8 border border-[var(--border)] shadow-[var(--glow-effect)]"
      style={{
        background: 'linear-gradient(135deg, rgba(124,92,252,0.12) 0%, rgba(0,212,255,0.05) 55%, var(--bg) 100%)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 120% at -5% 50%, rgba(124,92,252,0.18), transparent)' }} />
      <div className="absolute top-0 right-0 w-72 h-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 80% at 110% 30%, rgba(0,212,255,0.09), transparent)' }} />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <p className="text-xs text-[var(--text-secondary)] font-medium mb-1.5 flex items-center gap-2 flex-wrap">
            {greeting()}
            <span className="opacity-40">·</span>
            <span className="opacity-60">{todayLabel()}</span>
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-none mb-3 font-display text-[var(--text-primary)]">
            Welcome Back, {name} 👋
          </h1>
          
          <div className="flex flex-wrap items-center gap-3.5 mt-4">
            {targetRole ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--violet)]">
                <Target className="w-3.5 h-3.5" />
                {toTitleCase(targetRole)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                <Target className="w-3.5 h-3.5" />
                Goal Not Configured
              </span>
            )}
            
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--surface-hover)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
              <span>Level {level}</span>
              <span className="opacity-40">•</span>
              <span>{xp} XP</span>
              <span className="opacity-40">•</span>
              <span>{badgeCount} Badges</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:self-center flex-shrink-0">
          <div className="text-left sm:text-right">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold mb-1">Career readiness</p>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              You are <span className="text-[var(--violet)] font-black text-base">{careerReadiness}%</span> closer to job-ready
            </p>
          </div>
          <button
            onClick={onContinueLearning}
            className="group flex items-center gap-2 h-10 px-5 rounded-xl
              bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)]
              text-[var(--text-inverse)] text-xs font-bold
              transition-all duration-200 hover:-translate-y-px hover:shadow-md active:scale-[0.98]"
          >
            Continue Learning
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  2. Career Goal Hub Card Component                          */
/* ─────────────────────────────────────────────────────────── */
interface GoalHubCardProps {
  targetRole: string | null;
  targetCompany: string;
  nodes: RoadmapNode[];
  rawDeadline: string;
  readinessScore: number;
  loading: boolean;
  onAction: () => void;
}

const GoalHubCard: React.FC<GoalHubCardProps> = ({
  targetRole,
  targetCompany,
  nodes,
  rawDeadline,
  readinessScore,
  loading,
  onAction,
}) => {

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shimmer min-h-[220px]">
        <div className="space-y-4">
          <Skeleton variant="line" width="40%" height={20} />
          <Skeleton variant="line" width="60%" height={16} />
          <Skeleton variant="line" width="100%" height={12} className="rounded-full" />
        </div>
      </div>
    );
  }

  if (!targetRole) {
    return (
      <EmptyState
        icon="🗺️"
        title="No Learning Roadmap Yet"
        description="Generate a personalized skill roadmap based on your target role and resume."
        actionLabel="Generate Roadmap"
        onAction={onAction}
      />
    );
  }

  const total = nodes.length;
  const mastered = nodes.filter(n => n.data?.status === 'mastered' || n.data?.status === 'completed').length;

  const deadlineDaysMap: Record<string, number> = {
    '1m': 30, '3m': 90, '6m': 180, '12m': 365,
  };
  const daysRemaining = deadlineDaysMap[rawDeadline] ?? 90;

  return (
    <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between h-full group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(circle, var(--violet) 0%, transparent 70%)' }} />
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--violet)]">
              <Target className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-display">Career Goal Hub</p>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            <Flag className="w-3 h-3 text-[var(--rose)]" />
            {daysRemaining} Days Left
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 mt-2">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-0.5">Target Role</p>
            <p className="text-sm font-bold text-[var(--text-primary)] truncate font-display">{toTitleCase(targetRole)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-0.5">Target Company</p>
            <p className="text-sm font-bold text-[var(--cyan)] truncate font-display">{targetCompany}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[var(--text-secondary)] font-medium">
            Progress: <strong className="text-[var(--text-primary)]">{mastered}</strong> of {total} skills completed
          </span>
          <span className="text-xs font-bold text-[var(--violet)]">{readinessScore}% Readiness</span>
        </div>
        
        {/* Progress bar container */}
        <div className="h-2 w-full rounded-full bg-[var(--surface-hover)] overflow-hidden border border-[var(--border-subtle)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)]"
            initial={{ width: 0 }}
            animate={{ width: `${readinessScore}%` }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  3. Continue Learning Bento Card                            */
/* ─────────────────────────────────────────────────────────── */
interface ContinueLearningProps {
  nodes: RoadmapNode[];
  loading: boolean;
  onAction: () => void;
}

const ContinueLearningCard: React.FC<ContinueLearningProps> = ({
  nodes,
  loading,
  onAction,
}) => {
  const next = useMemo(() => {
    if (nodes.length === 0) return null;
    return (
      nodes.find(n => n.data?.status === 'in_progress') ??
      nodes.find(n => n.data?.status === 'recommended') ??
      nodes.find(n => n.data?.status === 'review') ??
      nodes.find(n => n.data?.status !== 'mastered' && n.data?.status !== 'completed') ??
      null
    );
  }, [nodes]);

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shimmer min-h-[220px]">
        <div className="space-y-4">
          <Skeleton variant="line" width="50%" height={16} />
          <Skeleton variant="line" width="90%" height={24} />
          <Skeleton variant="rect" height={36} className="w-full" />
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon="🗺️"
        title="No Lessons Available"
        description="Build your learning graph in Roadmap view to begin lessons."
      />
    );
  }

  if (!next) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--emerald)]">
              <BadgeCheck className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-display">Continue Learning</p>
          </div>
          <p className="text-sm font-bold text-[var(--emerald)] mb-1 font-display">All Topics Mastered!</p>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            Excellent work! You have finished all nodes in this curriculum. 🏆
          </p>
        </div>
        <Link
          to="/study-materials"
          className="group flex items-center justify-center gap-2 w-full h-9 rounded-xl
            bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)]
            text-[var(--text-primary)] text-xs font-semibold transition-all mt-4"
        >
          Review Learning Path
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    );
  }

  const label = next.data?.label ?? next.data?.title ?? 'Active Lesson';
  const level = next.data?.level ?? 'intermediate';
  const hours = next.data?.estimatedHours;
  const status = next.data?.status ?? 'recommended';

  const statusStyle: Record<string, string> = {
    in_progress: 'text-[var(--violet)] bg-[var(--violet)]/10 border-[var(--border)]',
    recommended: 'text-[var(--cyan)] bg-[var(--cyan)]/10 border-[var(--border)]',
    review: 'text-[var(--gold)] bg-[var(--gold)]/10 border-[var(--border)]',
  };

  const levelColor: Record<string, string> = {
    beginner: 'text-[var(--emerald)]',
    intermediate: 'text-[var(--cyan)]',
    advanced: 'text-[var(--rose)]',
  };

  return (
    <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--cyan)]">
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-display">Continue Learning</p>
        </div>

        <p className="text-base font-bold text-[var(--text-primary)] mb-2 font-display leading-tight truncate-2-lines">
          {label}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-md border capitalize leading-none', statusStyle[status] ?? 'text-[var(--text-muted)] bg-[var(--surface-hover)]')}>
            {status.replace('_', ' ')}
          </span>
          <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border-subtle)] capitalize leading-none', levelColor[level] ?? 'text-[var(--text-muted)]')}>
            {level}
          </span>
          {hours && (
            <span className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
              <Clock3 className="w-2.5 h-2.5" />
              {hours}h
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onAction}
        className="group flex items-center justify-center gap-2 w-full h-9 rounded-xl
          bg-gradient-to-r from-[var(--violet)]/15 to-[var(--cyan)]/10
          border border-[var(--border-strong)] hover:border-[var(--violet)]
          text-[var(--text-primary)] text-xs font-semibold
          transition-all duration-200 active:scale-[0.98]"
      >
        Resume Lesson
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  4. Streaks & Weekly Activity Card                           */
/* ─────────────────────────────────────────────────────────── */
interface StreakWeeklyProps {
  week: Array<{ day: string; active: boolean }>;
  streak: number;
  loading: boolean;
}

const StreakWeeklyCard: React.FC<StreakWeeklyProps> = ({
  week,
  streak,
  loading,
}) => {
  const days = week.length
    ? week
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ day: d, active: false }));

  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shimmer min-h-[160px]" />
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--rose)]">
            <Flame className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-display">Activity & Streak</p>
        </div>
        <span className={cn('flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
          streak > 0
            ? 'bg-[var(--rose)]/10 text-[var(--rose)] border-[var(--rose)]/25'
            : 'bg-[var(--surface-hover)] text-[var(--text-muted)] border-[var(--border-subtle)]')}>
          <Flame className="w-3 h-3 animate-pulse" />
          {streak > 0 ? `${streak}d streak` : 'No streak'}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mt-2">
        {days.map(({ day, active }) => (
          <div key={day} className="flex flex-col items-center gap-1.5">
            <div className={cn(
              'w-full h-9 rounded-xl flex items-center justify-center transition-all duration-200 border',
              active
                ? 'bg-gradient-to-b from-[var(--rose)] to-red-500 border-red-400/40 shadow-sm'
                : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)]',
            )}>
              {active && <Flame className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className={cn('text-[9px] font-bold uppercase', active ? 'text-[var(--rose)]' : 'text-[var(--text-muted)]')}>
              {day.slice(0, 1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  5. Achievement Showcase Card                                */
/* ─────────────────────────────────────────────────────────── */
interface AchievementItem {
  id: string;
  title?: string;
  label?: string;
  description?: string;
  icon?: string;
}

interface AchievementShowcaseProps {
  achievements: AchievementItem[];
  loading: boolean;
  onAction: () => void;
}

const AchievementShowcaseCard: React.FC<AchievementShowcaseProps> = ({
  achievements,
  loading,
  onAction,
}) => {
  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shimmer min-h-[160px]" />
    );
  }

  if (achievements.length === 0) {
    return (
      <EmptyState
        icon="🏆"
        title="No Achievements Yet"
        description="Master roadmap topics and clear quizes to unlock career badges."
      />
    );
  }

  // Display latest 3
  const displayAchievements = achievements.slice(-3).reverse();

  return (
    <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--gold)]">
              <Trophy className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-display">Achievements</p>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-bold">{achievements.length} Unlocked</span>
        </div>

        <div className="space-y-2 mt-1">
          {displayAchievements.map((ach) => (
            <div key={ach.id} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--surface-hover)] transition-all">
              <div className="h-7 w-7 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                {ach.icon ?? '🏆'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate leading-none mb-0.5">{ach.title || ach.label || 'Badge Unlocked'}</p>
                <p className="text-[9px] text-[var(--text-muted)] truncate leading-none">{ach.description || 'Verified achievement'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onAction}
        className="group flex items-center justify-center gap-1.5 w-full h-8 mt-3 rounded-lg
          bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-strong)]
          text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-bold transition-all"
      >
        View All Badges
        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  6. Analytics Summary Card                                  */
/* ─────────────────────────────────────────────────────────── */
interface AnalyticsSummaryProps {
  lessonsCompleted: number;
  totalXp: number;
  resumeAtsScore: number;
  interviewScore: number;
  loading: boolean;
}

const AnalyticsSummaryCard: React.FC<AnalyticsSummaryProps> = ({
  lessonsCompleted,
  totalXp,
  resumeAtsScore,
  interviewScore,
  loading,
}) => {
  if (loading) {
    return (
      <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] shimmer min-h-[160px]" />
    );
  }

  const metrics = [
    { label: 'Lessons Done', value: lessonsCompleted, color: 'text-[var(--violet)]' },
    { label: 'XP Earned', value: totalXp, color: 'text-[var(--cyan)]' },
    { label: 'Resume ATS', value: `${resumeAtsScore}%`, color: 'text-[var(--emerald)]' },
    { label: 'Interview Grade', value: `${interviewScore}%`, color: 'text-[var(--gold)]' },
  ];

  return (
    <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center gap-2 mb-3.5">
          <div className="h-8 w-8 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--violet)]">
            <BarChart2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] font-display">Analytics Summary</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-1">
          {metrics.map(({ label, value, color }) => (
            <div key={label} className="p-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col justify-between min-h-[58px]">
              <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-bold leading-none mb-1">{label}</span>
              <span className={cn('text-base font-extrabold leading-none font-display', color)}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  7. Compact AI Mentor Widget                                 */
/* ─────────────────────────────────────────────────────────── */
const CompactMentorWidget: React.FC = () => {
  const [chatExpanded, setChatExpanded] = useState(false);

  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col',
      chatExpanded
        ? 'border-[var(--violet)] shadow-[var(--glow-effect)]'
        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
    )}>
      {/* Mentor Prompt launcher banner */}
      <div className="relative p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(124,92,252,0.06) 0%, rgba(0,212,255,0.02) 100%)',
        }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] flex items-center justify-center shadow-md flex-shrink-0">
              <Bot className="w-5.5 h-5.5 text-[var(--text-inverse)]" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--emerald)] border-2 border-[var(--surface-card)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] font-display flex items-center gap-1.5 flex-wrap">
              Ask AI Mentor
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[var(--violet)]/10 text-[var(--violet)] border border-[var(--border)]">Gemini 2.5</span>
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] max-w-[420px]">
              Need help coding, formatting your roadmap, or checking your interview readiness? Ask me anything.
            </p>
          </div>
        </div>

        <button
          onClick={() => setChatExpanded(!chatExpanded)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border active:scale-[0.98] self-start sm:self-center',
            chatExpanded
              ? 'bg-[var(--surface-hover)] border-[var(--violet)] text-[var(--violet)]'
              : 'bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] border-transparent text-[var(--text-inverse)] hover:opacity-95 shadow-sm'
          )}
        >
          {chatExpanded ? (
            <>
              Hide Mentor
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Ask AI Mentor
              <MessageSquare className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Slide open chat inline */}
      <AnimatePresence initial={false}>
        {chatExpanded && (
          <motion.div
            key="chat"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-t border-[var(--border-subtle)] bg-[var(--bg-dots)]"
          >
            <AIMentor defaultOpen className="rounded-none border-0 bg-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  8. Large Quick Actions Cards                                */
/* ─────────────────────────────────────────────────────────── */
interface ActionCardItem {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
}

const QUICK_ACTIONS: ActionCardItem[] = [
  {
    to: '/resume-analyzer',
    title: 'Resume Studio',
    description: 'Optimize resume for ATS keywords and roles',
    icon: <FileText className="w-5 h-5" />,
    iconBg: 'text-[var(--emerald)] bg-[var(--emerald)]/10 border-[var(--emerald)]/20',
  },
  {
    to: '/interviewhub',
    title: 'Mock Interview',
    description: 'Practice AI mock sessions with custom voice support',
    icon: <Video className="w-5 h-5" />,
    iconBg: 'text-[var(--gold)] bg-[var(--gold)]/10 border-[var(--gold)]/20',
  },
  {
    to: '/study-materials',
    title: 'Learning Roadmap',
    description: 'Track and generate tailored career skill trees',
    icon: <Map className="w-5 h-5" />,
    iconBg: 'text-[var(--violet)] bg-[var(--violet)]/10 border-[var(--violet)]/20',
  },
  {
    to: '/study-planner',
    title: 'Study Planner',
    description: 'Organize study calendar & track reminders',
    icon: <Calendar className="w-5 h-5" />,
    iconBg: 'text-[var(--cyan)] bg-[var(--cyan)]/10 border-[var(--cyan)]/20',
  },
];

const LargeQuickActionsGrid: React.FC = () => {
  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex flex-col p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-all duration-200 hover:-translate-y-px hover:shadow-sm"
            >
              <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center border mb-3 transition-colors', item.iconBg)}>
                {item.icon}
              </div>
              <p className="text-xs font-bold text-[var(--text-primary)] font-display flex items-center gap-1 group-hover:text-[var(--violet)] transition-colors">
                {item.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </p>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight mt-1 group-hover:text-[var(--text-secondary)] transition-colors">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  Main Dashboard Component                                    */
/* ─────────────────────────────────────────────────────────── */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { status: gam, loading: gamLoading, refreshStatus } = useGamification();

  const name = useMemo(() => firstName(user?.full_name, user?.email), [user]);

  // localStorage reactive states
  const [targetRole, setTargetRole] = useState(() => localStorage.getItem('apex_target_role') ?? '');
  const [targetCompany, setTargetCompany] = useState(() => localStorage.getItem('apex_target_company') ?? 'Deloitte');
  const [rawDeadline, setRawDeadline] = useState(() => localStorage.getItem('apex_deadline') ?? '');
  const [stats, setStats] = useState(() => getRoadmapStats());

  // Keep states in sync automatically
  useEffect(() => {
    const refreshData = () => {
      setStats(getRoadmapStats());
      setTargetRole(localStorage.getItem('apex_target_role') ?? '');
      setTargetCompany(localStorage.getItem('apex_target_company') ?? 'Deloitte');
      setRawDeadline(localStorage.getItem('apex_deadline') ?? '');
    };

    const handleGamUpdate = () => {
      refreshStatus();
    };

    window.addEventListener('storage', refreshData);
    window.addEventListener('focus', refreshData);
    window.addEventListener('gamification_updated', handleGamUpdate);
    const interval = setInterval(refreshData, 1000);

    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('gamification_updated', handleGamUpdate);
      clearInterval(interval);
    };
  }, [refreshStatus]);

  const {
    nodes,
    completionPct,
    xp,
    level,
  } = stats;

  const userXp = gam?.xp ?? xp;
  const userLevel = gam?.level ?? level;
  const streak = gam?.streak?.current ?? 0;
  const badgeCount = gam?.achievements?.length ?? 0;
  const achievements = gam?.achievements ?? [];
  const week = useMemo(() => buildWeekActivity(nodes), [nodes]);

  // Premium Calculated KPI: Career Readiness Percentage
  const resumeAtsScore = useMemo(() => {
    const score = localStorage.getItem('apex_ats_score');
    return score ? parseInt(score, 10) : 72;
  }, []);

  const interviewScore = useMemo(() => {
    const score = localStorage.getItem('apex_interview_score');
    return score ? parseInt(score, 10) : 68;
  }, []);

  const careerReadiness = useMemo(() => {
    if (!targetRole) return 0;
    const roadmapWeight = (completionPct || 0) * 0.40;
    const resumeWeight = resumeAtsScore * 0.30;
    const interviewWeight = interviewScore * 0.20;
    const quizWeight = Math.min(100, (completionPct || 0) * 1.2) * 0.10;
    return Math.round(roadmapWeight + resumeWeight + interviewWeight + quizWeight);
  }, [completionPct, targetRole, resumeAtsScore, interviewScore]);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 pt-0 relative overflow-x-hidden">
      {/* ── Background Grid & Orbs ── */}
      <div aria-hidden className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 90% 60% at 5% 0%, rgba(124,92,252,0.08) 0%, transparent 55%)' }} />
      <div aria-hidden className="fixed inset-0 pointer-events-none opacity-25"
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <motion.div
        variants={STAGGER}
        initial="hidden"
        animate="show"
        className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4"
      >
        {/* ════════════════════════════════════════════
            1. PREMIUM WELCOME HERO
        ════════════════════════════════════════════ */}
        <CardErrorBoundary title="Hero Header" onRetry={refreshStatus}>
          <WelcomeHero
            name={name}
            targetRole={targetRole ? targetRole : null}
            level={userLevel}
            xp={userXp}
            badgeCount={badgeCount}
            careerReadiness={careerReadiness}
            loading={gamLoading}
            onContinueLearning={() => navigate('/study-materials')}
          />
        </CardErrorBoundary>

        {/* ════════════════════════════════════════════
            2. BENTO GRID (cols-1 md:cols-2 xl:cols-3)
        ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-5 items-stretch">
          {/* Card 1: Goal Hub (Span 2) */}
          <div className="md:col-span-2">
            <CardErrorBoundary title="Goal Hub Panel" onRetry={refreshStatus}>
              <GoalHubCard
                targetRole={targetRole ? targetRole : null}
                targetCompany={targetCompany}
                nodes={nodes}
                rawDeadline={rawDeadline}
                readinessScore={careerReadiness}
                loading={gamLoading}
                onAction={() => navigate('/study-materials')}
              />
            </CardErrorBoundary>
          </div>

          {/* Card 2: Continue Learning */}
          <div>
            <CardErrorBoundary title="Study Tracker" onRetry={refreshStatus}>
              <ContinueLearningCard
                nodes={nodes}
                loading={gamLoading}
                onAction={() => navigate('/study-materials')}
              />
            </CardErrorBoundary>
          </div>

          {/* Card 3: Activity & Streaks */}
          <div>
            <CardErrorBoundary title="Streak Activity" onRetry={refreshStatus}>
              <StreakWeeklyCard
                week={week}
                streak={streak}
                loading={gamLoading}
              />
            </CardErrorBoundary>
          </div>

          {/* Card 4: Achievements Showcase */}
          <div>
            <CardErrorBoundary title="Achievements Showcase" onRetry={refreshStatus}>
              <AchievementShowcaseCard
                achievements={achievements}
                loading={gamLoading}
                onAction={() => navigate('/redemption')}
              />
            </CardErrorBoundary>
          </div>

          {/* Card 5: Analytics Summary */}
          <div>
            <CardErrorBoundary title="Analytics Summary" onRetry={refreshStatus}>
              <AnalyticsSummaryCard
                lessonsCompleted={nodes.filter(n => n.data?.status === 'mastered' || n.data?.status === 'completed').length}
                totalXp={userXp}
                resumeAtsScore={resumeAtsScore}
                interviewScore={interviewScore}
                loading={gamLoading}
              />
            </CardErrorBoundary>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            3. BOTTOM SPLIT FEED (2 cols: Mentor | Quick Actions)
        ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start mt-6">
          {/* Mentor Column (Span 2) */}
          <div className="lg:col-span-2">
            <CardErrorBoundary title="AI Mentor Interface">
              <CompactMentorWidget />
            </CardErrorBoundary>
          </div>

          {/* Quick Actions Column */}
          <div>
            <CardErrorBoundary title="Quick Actions Hub">
              <LargeQuickActionsGrid />
            </CardErrorBoundary>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;