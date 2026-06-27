import React from 'react';
import { motion } from 'framer-motion';
import { LearningPathCard } from './LearningPathCard';
import { SkillNavigator } from './SkillNavigator';
import { CareerCompass } from './CareerCompass';
import { MilestonesCard } from './MilestonesCard';
import { MotivationStreak } from './MotivationStreak';

export const Dashboard: React.FC = () => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Welcome back, <span className="gradient-text">Rahul</span>! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          You're making great progress. Keep up the momentum!
        </p>
      </motion.div>

      {/* Dashboard Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left Column - Primary Cards */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          <LearningPathCard />
          <SkillNavigator />
          <MilestonesCard />
        </motion.div>

        {/* Right Column - Secondary Cards */}
        <motion.div variants={item} className="space-y-6">
          <MotivationStreak />
          <CareerCompass />
        </motion.div>
      </motion.div>
    </div>
  );
};