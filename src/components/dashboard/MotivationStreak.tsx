import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Award, Trophy, Crown, Medal } from 'lucide-react';
import type { GamificationAchievement, GamificationWeekActivity } from '../../services/api';

interface MotivationStreakProps {
  current?: number;
  longest?: number;
  totalDays?: number;
  week?: GamificationWeekActivity[];
  achievements?: GamificationAchievement[];
  loading?: boolean;
}

const DEFAULT_WEEK: GamificationWeekActivity[] = [
  { day: 'Mon', active: false },
  { day: 'Tue', active: false },
  { day: 'Wed', active: false },
  { day: 'Thu', active: false },
  { day: 'Fri', active: false },
  { day: 'Sat', active: false },
  { day: 'Sun', active: false },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  streak: Flame,
  dedication: Award,
  mastery: Trophy,
  crown: Crown,
  medal: Medal,
};

const FALLBACK_ACHIEVEMENTS: Array<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}> = [
  { icon: Trophy, label: 'Early Bird', description: '5 day streak milestone' },
  { icon: Award, label: 'Dedicated', description: '10 day streak milestone' },
  { icon: Flame, label: 'On Fire!', description: 'Current streak leader' },
];

export const MotivationStreak: React.FC<MotivationStreakProps> = ({
  current = 0,
  longest,
  totalDays,
  week,
  achievements,
  loading = false,
}) => {
  const currentStreak = current;
  const longestStreak = typeof longest === 'number' ? longest : Math.max(currentStreak, 0);
  const totalDaysActive = typeof totalDays === 'number' ? totalDays : Math.max(longestStreak, currentStreak);

  const resolvedWeek = week && week.length ? week : DEFAULT_WEEK;
  const resolvedAchievements = (achievements && achievements.length
    ? achievements.map((achievement, index) => {
        const Icon = ICON_MAP[achievement.type ?? ''] ?? ICON_MAP[achievement.icon ?? ''] ?? Trophy;
        const label = achievement.title ?? achievement.label ?? `Milestone ${index + 1}`;
        const description = achievement.description ?? label;
        return {
          icon: Icon,
          label,
          description,
        };
      })
    : FALLBACK_ACHIEVEMENTS).slice(0, 3);

  if (loading) {
    return (
      <div className="glass-effect rounded-2xl p-6 shadow-lg border border-white/10 animate-pulse">
        <div className="h-8 w-32 bg-white/10 rounded mb-6" />
        <div className="h-24 bg-white/5 rounded-xl mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-white/5 rounded-lg" />
          <div className="h-16 bg-white/5 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-effect rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-dark-800"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-3"
        >
          <Flame className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-1">{currentStreak} Days</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
      </div>

      {/* Week Activity */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3">This Week</h3>
        <div className="grid grid-cols-7 gap-2">
          {resolvedWeek.map((day, idx) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="flex flex-col items-center"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${
                  day.active
                    ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white'
                    : 'bg-gray-200 dark:bg-dark-700 text-gray-400'
                }`}
              >
                {day.active && <Flame className="w-4 h-4" />}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">{day.day}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl">
          <div className="text-2xl font-bold text-primary-600">{longestStreak}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Longest Streak</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
          <div className="text-2xl font-bold text-green-600">{totalDaysActive}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Days</div>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Recent Achievements</h3>
        <div className="space-y-2">
          {resolvedAchievements.map((achievement, idx) => (
            <motion.div
              key={`${achievement.label}-${idx}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-primary-500 rounded-lg flex items-center justify-center">
                <achievement.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold">{achievement.label}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {achievement.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};