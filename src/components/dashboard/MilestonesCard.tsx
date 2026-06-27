import React from 'react';
import { motion } from 'framer-motion';
import { Flag, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

export const MilestonesCard: React.FC = () => {
  const milestones = [
    {
      id: 1,
      title: 'Build a Todo App with TypeScript',
      deadline: '2025-11-15',
      status: 'completed',
      progress: 100,
    },
    {
      id: 2,
      title: 'Complete Custom Hooks Module',
      deadline: '2025-11-20',
      status: 'in-progress',
      progress: 70,
    },
    {
      id: 3,
      title: 'Final Project: E-commerce Dashboard',
      deadline: '2025-12-01',
      status: 'upcoming',
      progress: 15,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'in-progress':
        return 'text-primary-600 bg-primary-100 dark:bg-primary-900/30';
      case 'upcoming':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in-progress':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Flag className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-effect rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-dark-800"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
          <Flag className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Upcoming Milestones</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress</p>
        </div>
      </div>

      <div className="space-y-4">
        {milestones.map((milestone, idx) => (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="p-4 bg-gradient-to-br from-gray-50 to-white dark:from-dark-800 dark:to-dark-800/50 rounded-xl border border-gray-200 dark:border-dark-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{milestone.title}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>Due: {new Date(milestone.deadline).toLocaleDateString()}</span>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(milestone.status)}`}>
                {getStatusIcon(milestone.status)}
                <span className="capitalize">{milestone.status.replace('-', ' ')}</span>
              </div>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-xs font-bold">{milestone.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${milestone.progress}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={`h-full rounded-full ${
                    milestone.status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gradient-to-r from-primary-500 to-accent-500'
                  }`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};