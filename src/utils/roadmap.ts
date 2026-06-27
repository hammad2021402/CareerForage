/* ─────────────────────────────────────────────────────────────── */
/*  Shared Roadmap Utility — single source of truth               */
/*  Used by: Dashboard, AnalyticsPage, StudyPlannerPage           */
/* ─────────────────────────────────────────────────────────────── */

export interface RoadmapNodeData {
  label?: string;
  title?: string;
  status?: string;
  level?: string;
  estimatedHours?: number;
  description?: string;
  completedAt?: string;
  kind?: string;
  [key: string]: unknown;
}

export interface RoadmapNode {
  id: string;
  data: RoadmapNodeData;
  [key: string]: unknown;
}

export interface RoadmapStats {
  nodes: RoadmapNode[];
  total: number;
  mastered: number;
  inProgress: number;
  recommended: number;
  locked: number;
  completionPct: number;
  xp: number;
  level: number;
  xpInCurrentLevel: number;
  nextLevelXp: number;
  xpProgressPct: number;
}

export interface WeekActivity {
  day: string;
  active: boolean;
}

const STORAGE_KEY = 'apex_roadmap_state';
const XP_PER_TOPIC = 125;
const XP_PER_LEVEL = 100;

/* ── Parse nodes from localStorage safely ─────────────────────── */
export function readRoadmapNodes(): RoadmapNode[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { nodes?: RoadmapNode[] };
    return Array.isArray(parsed.nodes) ? parsed.nodes : [];
  } catch {
    return [];
  }
}

/* ── Single canonical stats function ─────────────────────────── */
export function getRoadmapStats(): RoadmapStats {
  const nodes = readRoadmapNodes();
  const total = nodes.length;

  const mastered = nodes.filter(
    (n) => n.data?.status === 'mastered' || n.data?.status === 'completed',
  ).length;

  const inProgress = nodes.filter(
    (n) => n.data?.status === 'in_progress',
  ).length;

  const recommended = nodes.filter(
    (n) => n.data?.status === 'recommended',
  ).length;

  const locked = nodes.filter(
    (n) => n.data?.status === 'locked',
  ).length;

  const completionPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  const xp = mastered * XP_PER_TOPIC;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpInCurrentLevel = xp % XP_PER_LEVEL;
  const nextLevelXp = level * XP_PER_LEVEL;
  const xpProgressPct = xpInCurrentLevel;

  return {
    nodes,
    total,
    mastered,
    inProgress,
    recommended,
    locked,
    completionPct,
    xp,
    level,
    xpInCurrentLevel,
    nextLevelXp,
    xpProgressPct,
  };
}

/* ── Week activity from completedAt timestamps ─────────────────── */
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getStartOfWeek(d: Date): Date {
  const date = new Date(d.getTime());
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function isSameISOWeek(d1: Date, d2: Date): boolean {
  const s1 = getStartOfWeek(d1);
  const s2 = getStartOfWeek(d2);
  return (
    s1.getFullYear() === s2.getFullYear() &&
    s1.getMonth() === s2.getMonth() &&
    s1.getDate() === s2.getDate()
  );
}

function getDayName(d: Date): string {
  return DAYS_OF_WEEK[d.getDay() === 0 ? 6 : d.getDay() - 1];
}

export function buildWeekActivity(nodes: RoadmapNode[]): WeekActivity[] {
  const completedNodes = nodes.filter(
    (n) => n.data?.status === 'mastered' || n.data?.status === 'completed',
  );

  return DAYS_OF_WEEK.map((day, idx) => {
    // 1. Check timestamped completions this week
    const hasNodeOnDay = completedNodes.some((n) => {
      if (!n.data?.completedAt) return false;
      const d = new Date(n.data.completedAt as string);
      return isSameISOWeek(d, new Date()) && getDayName(d) === day;
    });

    if (hasNodeOnDay) return { day, active: true };

    // 2. Fallback: distribute nodes without timestamps deterministically
    const noTimestamp = completedNodes.filter((n) => !n.data?.completedAt);
    const isFallbackActive = noTimestamp.some((_, i) => i % 7 === idx);

    return { day, active: isFallbackActive };
  });
}

/* ── Real XP history from completedAt ─────────────────────────── */
export interface XpDayEntry {
  day: string;
  xp: number;
}

export function buildRealXpHistory(nodes: RoadmapNode[]): XpDayEntry[] {
  const completedNodes = nodes.filter(
    (n) => n.data?.status === 'mastered' || n.data?.status === 'completed',
  );

  const xpByDay: Record<string, number> = {};
  DAYS_OF_WEEK.forEach((d) => (xpByDay[d] = 0));

  completedNodes.forEach((n) => {
    if (n.data?.completedAt) {
      const d = new Date(n.data.completedAt as string);
      if (isSameISOWeek(d, new Date())) {
        const dayName = getDayName(d);
        xpByDay[dayName] = (xpByDay[dayName] ?? 0) + XP_PER_TOPIC;
      }
    }
  });

  // If no timestamped data this week but there are completed nodes,
  // show total XP distributed evenly across Mon-Fri (non-random, deterministic)
  const hasThisWeekData = completedNodes.some((n) => {
    if (!n.data?.completedAt) return false;
    return isSameISOWeek(new Date(n.data.completedAt as string), new Date());
  });

  if (!hasThisWeekData && completedNodes.length > 0) {
    const workDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    completedNodes.forEach((_, i) => {
      const day = workDays[i % workDays.length];
      xpByDay[day] = (xpByDay[day] ?? 0) + XP_PER_TOPIC;
    });
  }

  return DAYS_OF_WEEK.map((day) => ({ day, xp: xpByDay[day] ?? 0 }));
}
