import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import {
  gamificationApi,
  type ClaimXpPayload,
  type GamificationClaim,
  type GamificationStatus,
  type GamificationStatusResponse,
  type GamificationWeekActivity,
} from '../services/api';
import { useUser } from '../context/UserContext';
import { getRoadmapStats } from '../utils/roadmap';

const DEFAULT_WEEK: GamificationWeekActivity[] = [
  { day: 'Mon', active: false },
  { day: 'Tue', active: false },
  { day: 'Wed', active: false },
  { day: 'Thu', active: false },
  { day: 'Fri', active: false },
  { day: 'Sat', active: false },
  { day: 'Sun', active: false },
];

interface UseGamificationOptions {
  autoFetch?: boolean;
}

interface UseGamificationResult {
  status: GamificationStatus | null;
  loading: boolean;
  error: string | null;
  refreshStatus: () => Promise<GamificationStatus | null>;
  claimXp: (claimId: string) => Promise<void>;
  isClaiming: (claimId: string) => boolean;
  claimingIds: string[];
}

function normaliseWeekActivity(entries?: GamificationWeekActivity[]): GamificationWeekActivity[] {
  if (!entries || !entries.length) {
    return DEFAULT_WEEK;
  }

  return entries.map((entry, index) => {
    const fallbackDay = DEFAULT_WEEK[index % DEFAULT_WEEK.length]?.day ?? `Day ${index + 1}`;
    const label = entry.day ?? (entry as unknown as { label?: string }).label ?? fallbackDay;
    const isActiveRaw = (entry as unknown as { active?: boolean; done?: boolean; completed?: boolean; value?: number }).active ??
      (entry as unknown as { done?: boolean }).done ??
      (entry as unknown as { completed?: boolean }).completed ??
      ((entry as unknown as { value?: number }).value ? Number((entry as unknown as { value?: number }).value) > 0 : undefined);

    return {
      day: label,
      active: Boolean(isActiveRaw),
    };
  });
}

function normaliseClaims(claims: GamificationClaim[] | undefined): GamificationClaim[] {
  if (!claims) {
    return [];
  }

  return claims
    .map((claim, index) => ({
      ...claim,
      id: claim.id ?? String(index),
      amount: Number(claim.amount ?? 0),
    }))
    .filter((claim) => claim.amount > 0);
}

function normaliseGamificationStatus(payload: GamificationStatusResponse): GamificationStatus {
  const xp = Number(payload.xp ?? payload.total_xp ?? 0);
  const level = Number(payload.level ?? payload.current_level ?? 1) || 1;

  const streakSource = payload.streak ?? {
    current: payload.current_streak,
    current_streak: payload.current_streak,
    longest: payload.longest_streak,
    longest_streak: payload.longest_streak,
    total_days: payload.total_days,
    week: payload.week_activity,
  };

  const streakCurrent = Number(streakSource?.current ?? streakSource?.current_streak ?? 0);
  const streakLongest = Number(streakSource?.longest ?? streakSource?.longest_streak ?? 0);
  const streakTotalDays = Number(streakSource?.total_days ?? (streakSource as unknown as { totalDays?: number }).totalDays ?? 0);

  const weekEntries = streakSource?.week ??
    (streakSource as unknown as { week_activity?: GamificationWeekActivity[] }).week_activity ??
    (streakSource as unknown as { recent_activity?: GamificationWeekActivity[] }).recent_activity ??
    payload.week_activity;

  const pendingClaims = normaliseClaims(payload.pending_claims ?? payload.claims);

  return {
    xp,
    level,
    next_level_xp: payload.next_level_xp ?? payload.nextLevelXp,
    current_level_xp: payload.current_level_xp ?? payload.currentLevelXp,
    level_progress: payload.level_progress ?? payload.levelProgress,
    xp_to_next: payload.xp_to_next,
    achievements: payload.achievements,
    pending_claims: pendingClaims,
    streak: {
      current: streakCurrent,
      longest: streakLongest,
      total_days: streakTotalDays,
      week: normaliseWeekActivity(weekEntries),
    },
  };
}

export function useGamification(options: UseGamificationOptions = {}): UseGamificationResult {
  const { autoFetch = true } = options;
  const { token, refreshProfile } = useUser();

  const [status, setStatus] = useState<GamificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());

  const refreshStatus = useCallback(async () => {
    if (!token) {
      setStatus(null);
      return null;
    }

    setLoading(true);
    try {
      const stats = getRoadmapStats();
      const response = await gamificationApi.getStatus(token, { total: stats.total, mastered: stats.mastered });
      const normalised = normaliseGamificationStatus(response);
      setStatus(normalised);
      setError(null);
      return normalised;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load gamification data.';
      setError(message);
      console.warn('[useGamification] Failed to load gamification status:', message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!autoFetch) {
      return;
    }
    void refreshStatus();
  }, [autoFetch, refreshStatus]);

  const claimXp = useCallback(async (claimId: string) => {
    if (!token) {
      toast.error('Sign in to claim XP rewards.');
      return;
    }
    if (!claimId) {
      return;
    }

    setClaimingIds((prev) => {
      const next = new Set(prev);
      next.add(claimId);
      return next;
    });

    try {
      const payload: ClaimXpPayload = { claim_id: claimId };
      const response = await gamificationApi.claimXp(payload, token);
      const message = response.message ?? 'XP claimed successfully!';
      toast.success(message);
      await Promise.all([refreshStatus(), refreshProfile()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to claim XP right now.';
      toast.error(message);
    } finally {
      setClaimingIds((prev) => {
        const next = new Set(prev);
        next.delete(claimId);
        return next;
      });
    }
  }, [token, refreshStatus, refreshProfile]);

  const claimingIdsList = useMemo(() => Array.from(claimingIds), [claimingIds.size]);

  const isClaiming = useCallback((claimId: string) => claimingIds.has(claimId), [claimingIds.size]);

  return {
    status,
    loading,
    error,
    refreshStatus,
    claimXp,
    isClaiming,
    claimingIds: claimingIdsList,
  };
}
