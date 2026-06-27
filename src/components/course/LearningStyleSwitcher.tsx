import React from 'react';
import { motion } from 'framer-motion';
import { Video, FileText, Code } from 'lucide-react';

interface Props {
  currentStyle: 'visual' | 'text' | 'interactive';
  onStyleChange: (style: 'visual' | 'text' | 'interactive') => void;
}

export const LearningStyleSwitcher: React.FC<Props> = ({ currentStyle, onStyleChange }) => {
  const styles = [
    { id: 'visual' as const, icon: Video, label: 'Visual Mode' },
    { id: 'text' as const, icon: FileText, label: 'Text Mode' },
    { id: 'interactive' as const, icon: Code, label: 'Interactive Mode' },
  ];

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-dark-800 rounded-lg">
      {styles.map((style) => (
        <motion.button
          key={style.id}
          onClick={() => onStyleChange(style.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all ${
            currentStyle === style.id
              ? 'bg-white dark:bg-dark-700 shadow-md text-primary-600'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <style.icon className="w-4 h-4" />
          <span className="hidden sm:inline">{style.label}</span>
          {currentStyle === style.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-white dark:bg-dark-700 rounded-lg -z-10"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
};