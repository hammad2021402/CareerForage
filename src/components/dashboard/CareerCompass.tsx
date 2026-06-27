import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, TrendingUp, MapPin, DollarSign } from 'lucide-react';

export const CareerCompass: React.FC = () => {
  const recommendations = [
    {
      title: 'Senior Frontend Developer',
      company: 'Tech Corp',
      match: 87,
      salary: '$120k - $160k',
      location: 'Remote',
      skillGaps: ['Testing', 'Performance Optimization'],
    },
    {
      title: 'Full Stack Engineer',
      company: 'StartupXYZ',
      match: 75,
      salary: '$100k - $140k',
      location: 'San Francisco',
      skillGaps: ['Backend APIs', 'DevOps'],
    },
    {
      title: 'React Developer',
      company: 'Digital Agency',
      match: 92,
      salary: '$90k - $120k',
      location: 'New York',
      skillGaps: ['UI/UX Design'],
    },
  ];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-effect rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-dark-800"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
          <Briefcase className="w-6 h-6 text-accent-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Career Compass</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Recommended paths</p>
        </div>
      </div>

      <div className="space-y-4">
        {recommendations.map((job, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-800 dark:to-dark-800/50 rounded-xl cursor-pointer border border-gray-200 dark:border-dark-700"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-bold mb-1">{job.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{job.company}</p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs font-bold text-green-600">{job.match}% Match</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>{job.salary}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{job.location}</span>
              </div>
            </div>

            {job.skillGaps.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Skill gaps:
                </span>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {job.skillGaps.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-accent-100 dark:bg-accent-900/30 text-accent-600 rounded text-xs"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="btn-secondary w-full mt-4"
      >
        Explore More Opportunities
      </motion.button>
    </motion.div>
  );
};