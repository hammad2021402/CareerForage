import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Layers,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AppPageLayout } from '@/components/layout/AppPageLayout';
import { PageHero, GlassCard, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';

/* ─────────────────────────────────────────────────────────── */
/*  Types                                                       */
/* ─────────────────────────────────────────────────────────── */
interface RoadmapNode {
  id: string;
  data: {
    label?: string;
    title?: string;
    status?: string;
    estimatedHours?: number;
    priority?: string;
  };
}

interface RoadmapState {
  nodes?: RoadmapNode[];
}


/* ─────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ─────────────────────────────────────────────────────────── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function parseDeadlineLabel(raw: string): string {
  const map: Record<string, string> = {
    '1m': '1 Month',
    '3m': '3 Months',
    '6m': '6 Months',
    '1y': '1 Year',
  };
  return map[raw] ?? raw;
}

function nodeLabel(node: RoadmapNode): string {
  return node.data?.label ?? node.data?.title ?? node.id ?? 'Unknown Topic';
}

function statusColor(status?: string): string {
  switch (status) {
    case 'mastered':
      return 'text-emerald-400';
    case 'in_progress':
      return 'text-cyan-400';
    case 'recommended':
      return 'text-violet-400';
    case 'review':
      return 'text-amber-400';
    case 'locked':
    default:
      return 'text-[var(--text-muted)]';
  }
}

function statusBg(status?: string): string {
  switch (status) {
    case 'mastered':
      return 'bg-emerald-500/10 border-emerald-500/20';
    case 'in_progress':
      return 'bg-cyan-500/10 border-cyan-500/20';
    case 'recommended':
      return 'bg-violet-500/10 border-violet-500/20';
    case 'review':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'locked':
    default:
      return 'bg-[var(--surface-hover)] border-[var(--border-subtle)]';
  }
}

function statusIcon(status?: string): React.ReactNode {
  switch (status) {
    case 'mastered':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    case 'in_progress':
      return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
    case 'recommended':
      return <Circle className="w-3.5 h-3.5 text-violet-400" />;
    case 'review':
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    default:
      return <Circle className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Sub-components                                              */
/* ─────────────────────────────────────────────────────────── */

/** A simple labelled section card using design system GlassCard */
const SectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accentClass?: string;
}> = ({ icon, title, subtitle, children, accentClass }) => (
  <GlassCard className={cn('p-6', accentClass)} glow>
    <div className="flex items-center gap-3 mb-5">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
        {subtitle && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </GlassCard>
);

/** Circular progress ring */
const ProgressRing: React.FC<{ pct: number; size?: number }> = ({ pct, size = 96 }) => {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={7}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={7}
          strokeLinecap="round"
          stroke="url(#studyGrad)"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
        />
        <defs>
          <linearGradient id="studyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c5cfc" />
            <stop offset="100%" stopColor="#00d4ff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-[var(--text-primary)] leading-none">{pct}%</span>
        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mt-0.5">done</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
/*  Main Page                                                   */
/* ─────────────────────────────────────────────────────────── */
const StudyPlannerPage: React.FC = () => {
  /* ── Read localStorage reactively ───────────────── */
  const [roadmapData, setRoadmapData] = useState<RoadmapState>(() => {
    try {
      return JSON.parse(localStorage.getItem('apex_roadmap_state') ?? '{}');
    } catch {
      return {};
    }
  });

  const [targetRole, setTargetRole] = useState(() => localStorage.getItem('apex_target_role') ?? 'Not Set');
  const [rawDeadline, setRawDeadline] = useState(() => localStorage.getItem('apex_deadline') ?? '3m');
  const deadlineLabel = parseDeadlineLabel(rawDeadline);

  useEffect(() => {
    const refreshData = () => {
      try {
        setRoadmapData(JSON.parse(localStorage.getItem('apex_roadmap_state') ?? '{}'));
      } catch {
        setRoadmapData({});
      }
      setTargetRole(localStorage.getItem('apex_target_role') ?? 'Not Set');
      setRawDeadline(localStorage.getItem('apex_deadline') ?? '3m');
    };

    window.addEventListener('storage', refreshData);
    window.addEventListener('focus', refreshData);
    window.addEventListener('gamification_updated', refreshData);

    return () => {
      window.removeEventListener('storage', refreshData);
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('gamification_updated', refreshData);
    };
  }, []);

  /* ── Derived data ────────────────────────────── */
  const nodes: RoadmapNode[] = roadmapData.nodes ?? [];

  const totalNodes = nodes.length;
  const masteredNodes = nodes.filter(n => n.data?.status === 'mastered').length;
  const inProgressNodes = nodes.filter(n => n.data?.status === 'in_progress').length;
  const reviewNodes = nodes.filter(n => n.data?.status === 'review').length;
  const lockedNodes = nodes.filter(n => n.data?.status === 'locked').length;

  const progress = totalNodes > 0 ? Math.round((masteredNodes / totalNodes) * 100) : 0;

  /** Today's tasks — in_progress first, then recommended, max 4 */
  const dailyTasks = useMemo(
    () =>
      [
        ...nodes.filter(n => n.data?.status === 'in_progress'),
        ...nodes.filter(n => n.data?.status === 'recommended'),
      ].slice(0, 4),
    [nodes]
  );

  /** Weak areas — review + locked */
  const weakAreas = useMemo(
    () =>
      [
        ...nodes.filter(n => n.data?.status === 'review'),
        ...nodes.filter(n => n.data?.status === 'locked'),
      ].slice(0, 6),
    [nodes]
  );

  /** Distribute upcoming topics across the week */
  const weeklySchedule = useMemo(() => {
    const upcoming = [
      ...nodes.filter(n => n.data?.status === 'in_progress'),
      ...nodes.filter(n => n.data?.status === 'recommended'),
      ...nodes.filter(n => n.data?.status === 'locked'),
    ];
    return DAYS.map((day, idx) => ({
      day,
      topic: upcoming[idx] ?? null,
    }));
  }, [nodes]);

  /* ── Empty-state check ───────────────────────── */
  const hasRoadmap = totalNodes > 0;

  /* ── Role display label ──────────────────────── */
  const roleLabel =
    targetRole !== 'Not Set'
      ? targetRole
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : 'Not Set';

  /* ═══════════════════════════════════════════════════════════
      Render
  ═══════════════════════════════════════════════════════════ */
  return (
    <AppPageLayout>
      <PageHero
        icon="📅"
        title="Study Planner"
        description="Personalised from your AI Roadmap"
        extraActions={
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-500/15 to-cyan-500/10 border border-violet-500/25 text-violet-200 shadow-[0_0_14px_rgba(124,92,252,0.15)]">
              <Target className="w-3.5 h-3.5 text-violet-300" />
              Goal: {roleLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)]">
              <Flag className="w-3.5 h-3.5" />
              Timeline: {deadlineLabel}
            </span>
          </div>
        }
      />

      {!hasRoadmap ? (
        /* ── Empty state ─────────────────────────── */
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-[var(--violet)]" />}
          title="No Roadmap Yet"
          description="Head to the Learning Path page to generate your AI-powered roadmap and come back here to plan your study sessions."
        />
      ) : (
        /* ── Main content grid ───────────────────── */
        <div className="space-y-6">

          {/* ══════════════════════════════════════
              ROW 1 — Goal Tracker + Progress
          ══════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 1. Goal Tracker */}
            <div className="lg:col-span-2">
              <SectionCard
                icon={<Target className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />}
                title="Goal Tracker"
                subtitle="Your current learning milestones"
                accentClass="border-violet-500/20"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Mastered', count: masteredNodes, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'In Progress', count: inProgressNodes, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                    { label: 'To Review', count: reviewNodes, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                    { label: 'Locked', count: lockedNodes, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-hover)] border-[var(--border-subtle)]' },
                  ].map(({ label, count, color, bg }) => (
                    <div key={label} className={`p-4 rounded-xl border flex flex-col gap-1 ${bg}`}>
                      <p className={`text-2xl font-extrabold ${color}`} style={{ fontFamily: 'Sora, sans-serif' }}>
                        {count}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[var(--text-muted)]">Overall progress</p>
                    <p className="text-xs font-bold text-violet-400">{masteredNodes} / {totalNodes} topics</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--border-subtle)] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* 5. Progress Overview (ring) — placed top-right */}
            <div>
              <SectionCard
                icon={<TrendingUp className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />}
                title="Progress Overview"
                subtitle="Roadmap completion"
              >
                <div className="flex flex-col items-center gap-4 py-2">
                  <ProgressRing pct={progress} size={104} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {progress < 30
                        ? 'Just Getting Started'
                        : progress < 60
                        ? 'Making Progress'
                        : progress < 90
                        ? 'Almost There!'
                        : 'Roadmap Complete 🎉'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">Target: {roleLabel}</p>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* ══════════════════════════════════════
              ROW 2 — Daily Plan + Weekly Schedule
          ══════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 2. Daily Study Plan */}
            <SectionCard
              icon={<BookOpen className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />}
              title="Daily Study Plan"
              subtitle="Today's recommended focus areas"
              accentClass="border-cyan-500/15"
            >
              {dailyTasks.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-6">
                  All caught up! No tasks in progress or recommended.
                </p>
              ) : (
                <div className="space-y-3">
                  {dailyTasks.map((node, idx) => (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-colors hover:brightness-110 ${statusBg(node.data?.status)}`}
                    >
                      <div className="flex-shrink-0">{statusIcon(node.data?.status)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                          {nodeLabel(node)}
                        </p>
                        {node.data?.estimatedHours && (
                          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {node.data.estimatedHours}h estimated
                          </p>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusColor(node.data?.status)}`}>
                        {node.data?.status?.replace('_', ' ') ?? 'pending'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* 3. Weekly Schedule */}
            <SectionCard
              icon={<CalendarDays className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />}
              title="Weekly Schedule"
              subtitle="Topics mapped across the week"
              accentClass="border-emerald-500/15"
            >
              <div className="grid grid-cols-7 gap-1.5">
                {weeklySchedule.map(({ day, topic }, idx) => {
                  const isToday = new Date().getDay() === (idx === 6 ? 0 : idx + 1);
                  return (
                    <div
                      key={day}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span
                        className={`text-[10px] font-bold ${
                          isToday ? 'text-violet-400' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {day.charAt(0)}
                      </span>
                      <div
                        className={`w-full min-h-[56px] rounded-xl flex flex-col items-center justify-center p-1 border transition-all duration-200 ${
                          topic
                            ? isToday
                              ? 'bg-violet-500/20 border-violet-500/40 shadow-[0_0_12px_rgba(124,92,252,0.25)]'
                              : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:border-[var(--border)]'
                            : 'bg-[var(--surface-hover)] border-transparent opacity-40'
                        }`}
                        title={topic ? nodeLabel(topic) : undefined}
                      >
                        {topic ? (
                          <>
                            <Layers className={`w-3 h-3 mb-1 ${isToday ? 'text-violet-400' : 'text-[var(--text-muted)]'}`} />
                            <p
                              className={`text-[8px] font-medium text-center leading-tight line-clamp-2 ${
                                isToday ? 'text-violet-300' : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {nodeLabel(topic)}
                            </p>
                          </>
                        ) : (
                          <span className="text-[9px] text-[var(--text-muted)] opacity-50">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-violet-500/50 border border-violet-500/60" />
                  <span className="text-[10px] text-[var(--text-muted)]">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-[var(--surface-card-hover)] border border-[var(--border)]" />
                  <span className="text-[10px] text-[var(--text-muted)]">Scheduled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded bg-[var(--surface-hover)] border border-[var(--border-subtle)] opacity-50" />
                  <span className="text-[10px] text-[var(--text-muted)]">Empty</span>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ══════════════════════════════════════
              ROW 3 — Weak Area Recommendations
          ══════════════════════════════════════ */}
          <div>
            <SectionCard
              icon={<AlertTriangle className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />}
              title="Weak Area Recommendations"
              subtitle="Topics that need your attention"
              accentClass="border-amber-500/15"
            >
              {weakAreas.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-6">
                  No weak areas detected — great work! Keep mastering your roadmap.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {weakAreas.map((node, idx) => (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.06 }}
                      className={`p-4 rounded-xl border flex flex-col gap-2 transition-all duration-200 hover:brightness-110 ${statusBg(node.data?.status)}`}
                    >
                      <div className="flex items-center gap-2">
                        {statusIcon(node.data?.status)}
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate flex-1">
                          {nodeLabel(node)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${statusColor(node.data?.status)}`}
                        >
                          {node.data?.status?.replace('_', ' ') ?? 'unknown'}
                        </span>
                        {node.data?.priority && (
                          <span className="text-[10px] text-[var(--text-muted)]">
                            Priority: {node.data.priority}
                          </span>
                        )}
                      </div>
                      {node.data?.status === 'review' && (
                        <p className="text-[10px] text-amber-400/70 leading-relaxed">
                          Revisit this topic and test yourself before moving on.
                        </p>
                      )}
                      {node.data?.status === 'locked' && (
                        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                          Complete prerequisites to unlock this topic.
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

        </div>
      )}
    </AppPageLayout>
  );
};

export default StudyPlannerPage;
