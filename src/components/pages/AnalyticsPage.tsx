import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Flame,
  Rocket,
  Star,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGamification } from '../../hooks/useGamification';
import { cn } from '@/utils/cn';
import { AppPageLayout } from '@/components/layout/AppPageLayout';
import { PageHero, GlassCard, StatCard, Skeleton } from '@/components/ui';
import {
  getRoadmapStats,
  buildWeekActivity,
  buildRealXpHistory,
} from '@/utils/roadmap';

/* ── Helpers ────────────────────────────────────── */
function roleLabelFmt(r: string) {
  return r.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function daysLeft(deadline: string): number {
  const map: Record<string, number> = { '1m': 30, '3m': 90, '6m': 180, '12m': 365 };
  const setAt = Number(localStorage.getItem('apex_deadline_set_at') ?? Date.now());
  const total = map[deadline] ?? 90;
  const elapsed = Math.floor((Date.now() - setAt) / 86400000);
  return Math.max(0, total - elapsed);
}

/* ── Custom recharts tooltip ─────────────────────── */
const XpTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs text-[var(--text-primary)] shadow-xl">
      <p className="text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="font-bold">{payload[0].value} XP</p>
    </div>
  );
};

/* ── Main ────────────────────────────────────────── */
export default function AnalyticsPage() {
  const { status, loading, refreshStatus } = useGamification();
  const [stats, setStats] = useState(() => getRoadmapStats());

  const streak = status?.streak?.current ?? 0;
  const longest = status?.streak?.longest ?? 0;
  const apiAchievements = status?.achievements ?? [];

  const targetRole = localStorage.getItem('apex_target_role') ?? '';
  const deadline = localStorage.getItem('apex_deadline') ?? '3m';
  const days = useMemo(() => daysLeft(deadline), [deadline]);

  // Keep stats in sync reactively
  useEffect(() => {
    const handleUpdate = () => {
      setStats(getRoadmapStats());
      refreshStatus();
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    window.addEventListener('gamification_updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      window.removeEventListener('gamification_updated', handleUpdate);
    };
  }, [refreshStatus]);

  const { nodes, total: roadmapTotal, mastered, inProgress, locked, completionPct, xp, level } = stats;

  const xpHistory = useMemo(() => buildRealXpHistory(nodes), [nodes]);
  const weekActivity = useMemo(() => buildWeekActivity(nodes), [nodes]);

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  };

  // Level progress from roadmap XP
  const lvlProg = stats.xpProgressPct;

  return (
    <AppPageLayout>
      <PageHero
        icon="📊"
        title="Study Analytics"
        description="Your learning performance at a glance."
      />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Stat row */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            {[
              {
                icon: <Zap className="w-5 h-5 text-violet-400" />,
                label: 'Total XP',
                value: xp.toLocaleString(),
                subtext: `Level ${level}`,
                iconBg: 'bg-violet-500/10 border-violet-500/25',
                glow: true,
              },
              {
                icon: <Flame className="w-5 h-5 text-orange-400" />,
                label: 'Current Streak',
                value: `${streak} days`,
                subtext: `Longest: ${longest}d`,
                iconBg: 'bg-orange-500/10 border-orange-500/25',
              },
              {
                icon: <Target className="w-5 h-5 text-cyan-400" />,
                label: 'Days to Goal',
                value: days,
                subtext: targetRole ? roleLabelFmt(targetRole) : 'Set a goal',
                iconBg: 'bg-cyan-500/10 border-cyan-500/25',
              },
              {
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
                label: 'Skills Mastered',
                value: mastered,
                subtext: `of ${roadmapTotal} total`,
                iconBg: 'bg-emerald-500/10 border-emerald-500/25',
              },
            ].map((s) => (
              <motion.div key={s.label} variants={item}>
                <StatCard {...s} />
              </motion.div>
            ))}
          </motion.div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

            {/* XP bar chart — real data from completedAt */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <GlassCard className="p-6 h-full flex flex-col justify-between" glow>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">XP This Week</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {xp > 0 ? 'Based on actual topic completions' : 'Complete roadmap topics to earn XP'}
                    </p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                </div>
                {xp === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-center my-auto">
                    <Rocket className="w-10 h-10 text-[var(--text-muted)]" />
                    <p className="text-sm text-[var(--text-muted)]">No XP earned yet.</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Master topics in your Learning Path to see XP activity here.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={xpHistory} barSize={24}>
                      <defs>
                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip content={<XpTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="xp" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </GlassCard>
            </motion.div>

            {/* Level ring — real from roadmap XP */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <GlassCard className="p-6 flex flex-col justify-between h-full" glow>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Level Progress</p>
                  <Star className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <svg width={100} height={100} className="-rotate-90">
                      <circle cx={50} cy={50} r={40} fill="none" stroke="var(--border-subtle)" strokeWidth={8} />
                      <motion.circle
                        cx={50}
                        cy={50}
                        r={40}
                        fill="none"
                        strokeWidth={8}
                        strokeLinecap="round"
                        stroke="url(#lvlGrad)"
                        strokeDasharray={251.2}
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{ strokeDashoffset: 251.2 - (lvlProg / 100) * 251.2 }}
                        transition={{ duration: 1.2 }}
                      />
                      <defs>
                        <linearGradient id="lvlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-2xl font-extrabold text-[var(--text-primary)]">{level}</span>
                       <span className="text-[10px] text-[var(--text-muted)]">level</span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
                      <span>{xp.toLocaleString()} XP</span>
                      <span>{Math.round(lvlProg)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${lvlProg}%` }}
                        transition={{ duration: 1 }}
                      />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Weekly activity — from buildWeekActivity (completedAt) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-6 h-full flex flex-col justify-between" glow>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Weekly Activity</p>
                  <CalendarDays className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex gap-2">
                  {weekActivity.map((d) => (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          'w-full aspect-square rounded-lg flex items-center justify-center',
                          d.active
                            ? 'bg-gradient-to-br from-violet-600 to-cyan-500'
                            : 'bg-[var(--surface-hover)] border border-[var(--border-subtle)]',
                        )}
                      >
                        {d.active && <Zap className="w-2.5 h-2.5 text-white" />}
                      </div>
                       <span className="text-[9px] text-[var(--text-muted)]">{d.day.slice(0, 1)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">{streak} day streak</span>
                  <span className="text-xs text-orange-400 font-semibold">🔥 Keep it up!</span>
                </div>
              </GlassCard>
            </motion.div>

            {/* Roadmap mastery */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <GlassCard className="p-6 h-full flex flex-col justify-between" glow>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Roadmap Mastery</p>
                  <BrainCircuit className="w-4 h-4 text-violet-400" />
                </div>
                {roadmapTotal === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-4 text-center my-auto">
                    <Rocket className="w-8 h-8 text-[var(--text-muted)]" />
                    <p className="text-xs text-[var(--text-muted)]">Generate your roadmap to see mastery stats.</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-5">
                      <p
                        className="text-3xl font-extrabold"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {completionPct}%
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">overall mastery</p>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Mastered', count: mastered, color: 'bg-emerald-500', tc: 'text-emerald-400' },
                        { label: 'In Progress', count: inProgress, color: 'bg-violet-500', tc: 'text-violet-400' },
                        { label: 'Locked', count: locked, color: 'bg-[var(--text-muted)]', tc: 'text-[var(--text-muted)]' },
                      ].map(({ label, count, color, tc }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className={cn('text-xs font-medium w-24 flex-shrink-0', tc)}>{label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                            <motion.div
                              className={cn('h-full rounded-full', color)}
                              initial={{ width: 0 }}
                              animate={{ width: roadmapTotal ? `${(count / roadmapTotal) * 100}%` : '0%' }}
                              transition={{ duration: 0.8 }}
                            />
                          </div>
                          <span className="text-xs text-[var(--text-muted)] w-6 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </GlassCard>
            </motion.div>

            {/* Achievements */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-6 h-full flex flex-col justify-between" glow>
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Achievements</p>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                {apiAchievements.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-4 text-center my-auto">
                    <Award className="w-8 h-8 text-[var(--text-muted)]" />
                    <p className="text-xs text-[var(--text-secondary)] font-medium">No achievements yet</p>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Complete your first roadmap topic to earn achievements and badges!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {apiAchievements.slice(0, 9).map((a) => (
                      <div
                        key={a.id}
                        title={a.title ?? a.label ?? a.id}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
                      >
                        <span className="text-xl">{a.icon ?? '🏆'}</span>
                         <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight line-clamp-2">
                          {a.title ?? a.label ?? 'Badge'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show roadmap-based milestones if no API achievements */}
                {apiAchievements.length === 0 && mastered > 0 && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                    <p className="text-[10px] text-[var(--text-muted)] mb-3 uppercase tracking-widest font-semibold text-left">
                      Roadmap Milestones
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {mastered >= 1 && (
                        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-lg">🎯</span>
                          <span className="text-[9px] text-emerald-400 text-center">First Topic</span>
                        </div>
                      )}
                      {mastered >= 3 && (
                        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                          <span className="text-lg">⚡</span>
                          <span className="text-[9px] text-violet-400 text-center">Momentum</span>
                        </div>
                      )}
                      {mastered >= 5 && (
                        <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <span className="text-lg">🏆</span>
                          <span className="text-[9px] text-amber-400 text-center">Half Way</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>
        </>
      )}
    </AppPageLayout>
  );
}
