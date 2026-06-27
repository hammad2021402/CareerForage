import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ThumbsUp, AlertTriangle, Lightbulb } from 'lucide-react';

interface Props {
  question: string;
  answer: string;
}

export const AIFeedback: React.FC<Props> = () => {
  // Simulated AI feedback
  const feedback = {
    score: 85,
    strengths: [
      'Clear explanation of useState triggering re-renders',
      'Good use of practical examples',
      'Correctly identified the key differences',
    ],
    improvements: [
      'Could elaborate more on useRef performance benefits',
      'Consider mentioning closure-related use cases for useRef',
    ],
    suggestions: [
      'Try explaining with a specific code example',
      'Mention the .current property of useRef',
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 space-y-4"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-accent-500 to-primary-500 rounded-xl">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">AI-Generated Feedback</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Personalized insights on your answer
          </p>
        </div>
      </div>

      {/* Score Indicator */}
      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-4xl font-bold text-green-600 mb-1">
              {feedback.score}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Answer Quality Score
            </div>
          </div>
          <div className="w-20 h-20 relative">
            <svg className="transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-green-200 dark:text-green-900"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 40 * (1 - feedback.score / 100),
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="text-green-600"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Strengths */}
      <div className="p-6 glass-effect rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <ThumbsUp className="w-5 h-5 text-green-600" />
          <h4 className="font-bold text-green-600">Strengths</h4>
        </div>
        <ul className="space-y-2">
          {feedback.strengths.map((strength, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-2"
            >
              <span className="text-green-600 mt-1">✓</span>
              <span className="text-gray-700 dark:text-gray-300">{strength}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Areas for Improvement */}
      <div className="p-6 glass-effect rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h4 className="font-bold text-amber-600">Areas for Improvement</h4>
        </div>
        <ul className="space-y-2">
          {feedback.improvements.map((improvement, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 + 0.3 }}
              className="flex items-start gap-2"
            >
              <span className="text-amber-600 mt-1">!</span>
              <span className="text-gray-700 dark:text-gray-300">{improvement}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Suggestions */}
      <div className="p-6 glass-effect rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-primary-600" />
          <h4 className="font-bold text-primary-600">Suggestions</h4>
        </div>
        <ul className="space-y-2">
          {feedback.suggestions.map((suggestion, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 + 0.6 }}
              className="flex items-start gap-2"
            >
              <span className="text-primary-600 mt-1">💡</span>
              <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};