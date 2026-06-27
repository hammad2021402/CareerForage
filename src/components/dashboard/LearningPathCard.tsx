import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Target, ArrowRight } from 'lucide-react';

export const LearningPathCard: React.FC = () => {
  const [learningPathTitle, setLearningPathTitle] = useState('Advanced React & TypeScript');
  const progress = 67;

  useEffect(() => {
    // Simulate fetching the learning path based on the user's saved goal
    const userGoal = localStorage.getItem('userGoal');
    if (userGoal) {
      // This is a simulation. In a real app, you would fetch this from a backend.
      const pathMap: { [key: string]: string } = {
        'Career Switch': 'Full Stack Developer Path',
        'Skill Upgrade': 'Advanced TypeScript Patterns',
        'New Technology': 'Exploring Next.js 14',
        'Certification': 'React Certification Prep Course',
      };
      setLearningPathTitle(pathMap[userGoal] || 'Advanced React & TypeScript');
    }
  }, []);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-effect rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-dark-800"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">My Learning Path</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {learningPathTitle}
          </p>
        </div>
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
          <BookOpen className="w-6 h-6 text-primary-600" />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Overall Progress</span>
          <span className="text-sm font-bold text-primary-600">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-dark-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-full relative"
          >
            <motion.div
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          </motion.div>
        </div>
      </div>

      {/* Next Lesson */}
      <div className="p-4 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-white dark:bg-dark-800 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-lg font-bold text-primary-600">12</span>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Next: Custom Hooks Patterns</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Module 4, Lesson 12</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>25 min</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            <span>3 exercises</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <span>Continue Learning</span>
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
};