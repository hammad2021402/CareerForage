import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, Lock, Star } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  status: 'mastered' | 'learning' | 'locked';
  level: number;
  prerequisites?: string[];
}

export const SkillNavigator: React.FC = () => {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const skills: Skill[] = [
    { id: '1', name: 'React Basics', status: 'mastered', level: 100 },
    { id: '2', name: 'TypeScript', status: 'mastered', level: 100, prerequisites: ['1'] },
    { id: '3', name: 'Custom Hooks', status: 'learning', level: 70, prerequisites: ['1'] },
    { id: '4', name: 'State Management', status: 'learning', level: 45, prerequisites: ['2', '3'] },
    { id: '5', name: 'Performance Optimization', status: 'locked', level: 0, prerequisites: ['3', '4'] },
    { id: '6', name: 'Testing', status: 'locked', level: 0, prerequisites: ['2'] },
  ];

  const getSkillColor = (status: Skill['status']) => {
    switch (status) {
      case 'mastered':
        return 'from-green-500 to-emerald-600';
      case 'learning':
        return 'from-primary-500 to-accent-600';
      case 'locked':
        return 'from-gray-400 to-gray-500';
    }
  };

  const getSkillIcon = (status: Skill['status']) => {
    switch (status) {
      case 'mastered':
        return <Check className="w-5 h-5 text-white" />;
      case 'learning':
        return <Brain className="w-5 h-5 text-white" />;
      case 'locked':
        return <Lock className="w-5 h-5 text-white" />;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-effect rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-dark-800"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold mb-1">Skill Navigator</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your learning journey map
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-accent-100 dark:bg-accent-900/30 rounded-full">
          <Star className="w-4 h-4 text-accent-600" />
          <span className="text-sm font-semibold text-accent-600">12 Skills Mastered</span>
        </div>
      </div>

      {/* Skill Tree */}
      <div className="relative">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {skills.map((skill, idx) => (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedSkill(skill.id === selectedSkill ? null : skill.id)}
              className="cursor-pointer"
            >
              <div
                className={`relative p-4 rounded-xl bg-gradient-to-br ${getSkillColor(
                  skill.status
                )} shadow-lg`}
              >
                <div className="flex flex-col items-center text-center text-white">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-3">
                    {getSkillIcon(skill.status)}
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{skill.name}</h3>
                  {skill.status !== 'locked' && (
                    <div className="w-full">
                      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.level}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.1 }}
                          className="h-full bg-white rounded-full"
                        />
                      </div>
                      <span className="text-xs mt-1 block">{skill.level}%</span>
                    </div>
                  )}
                </div>

                {/* Connection Lines (simplified visual representation) */}
                {skill.prerequisites && skill.prerequisites.length > 0 && (
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full border-2 border-current" />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Skill Details Popup */}
        <AnimatePresence>
          {selectedSkill && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 p-4 glass-effect rounded-xl border border-primary-200 dark:border-primary-800"
            >
              {(() => {
                const skill = skills.find((s) => s.id === selectedSkill);
                return (
                  skill && (
                    <>
                      <h3 className="font-bold mb-2">{skill.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {skill.status === 'mastered'
                          ? '✅ Congratulations! You have mastered this skill.'
                          : skill.status === 'learning'
                          ? '🎯 Currently learning. Keep going!'
                          : '🔒 Complete prerequisites to unlock this skill.'}
                      </p>
                      {skill.prerequisites && skill.prerequisites.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                            Prerequisites:
                          </span>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {skill.prerequisites.map((prereq) => {
                              const prereqSkill = skills.find((s) => s.id === prereq);
                              return (
                                <span
                                  key={prereq}
                                  className="px-2 py-1 bg-gray-200 dark:bg-dark-700 rounded text-xs"
                                >
                                  {prereqSkill?.name}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};