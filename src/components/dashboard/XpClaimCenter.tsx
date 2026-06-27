import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Loader2, Sparkles, Clock, CheckCircle } from 'lucide-react';
import type { GamificationClaim, GamificationWeekActivity } from '../../services/api';

interface XpClaimCenterProps {
  xp: number;
  level: number;
  currentLevelXp?: number;
  nextLevelXp?: number;
  levelProgress?: number;
  xpToNext?: number;
  week?: GamificationWeekActivity[];
  claims: GamificationClaim[];
  onClaim: (claimId: string) => Promise<void>;
  isClaiming: (claimId: string) => boolean;
  loading?: boolean;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function percentFromProgress({
  xp,
  currentLevelXp,
  nextLevelXp,
  levelProgress,
}: {
  xp: number;
  currentLevelXp?: number;
  nextLevelXp?: number;
  levelProgress?: number;
}): number {
  if (typeof levelProgress === 'number') {
    return Math.min(100, Math.max(0, Math.round(levelProgress * 100)));
  }
  if (typeof currentLevelXp === 'number' && typeof nextLevelXp === 'number' && nextLevelXp > currentLevelXp) {
    const relative = (xp - currentLevelXp) / (nextLevelXp - currentLevelXp);
    return Math.min(100, Math.max(0, Math.round(relative * 100)));
  }
  if (typeof nextLevelXp === 'number' && nextLevelXp > 0) {
    return Math.min(100, Math.max(0, Math.round((xp / nextLevelXp) * 100)));
  }
  return 0;
}

function xpRemaining(nextLevelXp?: number, xp?: number): number | undefined {
  if (typeof nextLevelXp !== 'number' || typeof xp !== 'number') {
    return undefined;
  }
  return Math.max(0, Math.round(nextLevelXp - xp));
}

function formatRelativeTime(value?: string): string {
  if (!value) {
    return 'Just now';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }
  const diffMs = Date.now() - parsed.getTime();
  const tense = diffMs >= 0 ? 'ago' : 'from now';
  const absMs = Math.abs(diffMs);

  const minutes = Math.round(absMs / 60000);
  if (minutes < 1) {
    return 'moments ago';
  }
  if (minutes < 60) {
    return `${minutes} min ${tense}`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ${tense}`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ${tense}`;
  }
  const weeks = Math.round(days / 7);
  return `${weeks} wk${weeks === 1 ? '' : 's'} ${tense}`;
}

export default function XpClaimCenter({
  xp,
  level,
  currentLevelXp,
  nextLevelXp,
  levelProgress,
  xpToNext,
  week,
  claims,
  onClaim,
  isClaiming,
  loading = false,
}: XpClaimCenterProps) {
  const progressPercent = percentFromProgress({ xp, currentLevelXp, nextLevelXp, levelProgress });
  const remaining = xpToNext ?? xpRemaining(nextLevelXp, xp);
  const hasClaims = claims.length > 0;
  const activity = week && week.length ? week : DAY_LABELS.map((day) => ({ day, active: false }));

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-effect rounded-2xl p-6 shadow-lg border border-white/10 bg-black/60"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">XP Progress</h2>
          <p className="text-sm text-gray-400">Keep leveling up to unlock rewards</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/40 text-accent">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Level {level}</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>{xp.toLocaleString()} XP</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8 }}
            className="h-full bg-gradient-to-r from-accent to-purple-500"
          />
        </div>
        {typeof remaining === 'number' && (
          <p className="text-xs text-gray-500 mt-2">
            {remaining > 0
              ? `${remaining.toLocaleString()} XP until next level`
              : 'Next level reached! Keep the momentum.'}
          </p>
        )}
      </div>

      <div className="border border-white/10 rounded-xl divide-y divide-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
              <Gift className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Pending Rewards</p>
              <p className="text-xs text-gray-400">Claim bonus XP from your recent wins</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-accent">{claims.reduce((sum, claim) => sum + (claim.amount ?? 0), 0).toLocaleString()} XP</p>
            <p className="text-xs text-gray-500">{hasClaims ? `${claims.length} waiting` : 'All caught up'}</p>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-6 text-sm text-gray-400 flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching pending rewards...
            </motion.div>
          ) : hasClaims ? (
            claims.map((claim) => {
              const pending = claim.status ? claim.status === 'pending' : true;
              const claimed = claim.status === 'claimed';
              const claimDisabled = !pending || isClaiming(claim.id);
              const claimLabel = `Claim ${claim.amount.toLocaleString()} XP`;

              return (
                <motion.div
                  key={claim.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="px-4 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {claim.description || claim.reason || 'Bonus XP available'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                      {claim.source && <span>{claim.source}</span>}
                      {claim.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(claim.created_at)}
                        </span>
                      )}
                      {!claim.created_at && claim.expires_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          expires {formatRelativeTime(claim.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: claimDisabled ? 1 : 1.05 }}
                    whileTap={{ scale: claimDisabled ? 1 : 0.95 }}
                    onClick={() => onClaim(claim.id)}
                    disabled={claimDisabled}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                      claimDisabled
                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-accent to-purple-600 text-white shadow-lg'
                    }`}
                  >
                    {isClaiming(claim.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{claimed ? 'Claimed' : claimLabel}</span>
                  </motion.button>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-6 text-sm text-gray-400 flex items-center gap-3"
            >
              <CheckCircle className="w-4 h-4 text-green-400" />
              No pending rewards — keep completing lessons to earn more XP.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-gray-400">
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-wide text-[0.62rem] text-gray-500">Daily Track</span>
          <div className="flex items-center gap-1">
            {activity.map((entry) => (
              <div key={entry.day} className="flex flex-col items-center gap-1">
                <span className="text-[0.6rem]">{entry.day}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    entry.active ? 'bg-accent' : 'bg-white/10'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="uppercase tracking-wide text-[0.62rem] text-gray-500">XP Claimed</span>
          <span className="text-sm font-semibold text-white">{xp.toLocaleString()} XP</span>
        </div>
      </div>
    </motion.div>
  );
}
