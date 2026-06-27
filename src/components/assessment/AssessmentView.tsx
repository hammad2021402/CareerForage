import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Circle, 
  ArrowRight,
  Send,
  Sparkles
} from 'lucide-react';
import { AIFeedback } from './AIFeedback';

interface Question {
  id: string;
  type: 'multiple-choice' | 'fill-blank' | 'descriptive';
  question: string;
  options?: string[];
  correctAnswer?: string;
  userAnswer?: string;
}

export const AssessmentView: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const questions: Question[] = [
    {
      id: '1',
      type: 'multiple-choice',
      question: 'What is the purpose of React Hooks?',
      options: [
        'To add styling to components',
        'To manage state and side effects in functional components',
        'To create class components',
        'To handle routing',
      ],
      correctAnswer: 'To manage state and side effects in functional components',
      userAnswer: 'To manage state and side effects in functional components',
    },
    {
      id: '2',
      type: 'fill-blank',
      question: 'The _____ hook allows you to perform side effects in functional components.',
      correctAnswer: 'useEffect',
      userAnswer: 'useEffect',
    },
    {
      id: '3',
      type: 'descriptive',
      question:
        'Explain the difference between useState and useRef hooks in React. Provide examples of when you would use each.',
      userAnswer:
        'useState is used for managing state that triggers re-renders when updated. For example, form inputs or toggle states. useRef is used for accessing DOM elements or storing mutable values that persist across renders without causing re-renders. Examples include focus management or storing previous values.',
    },
  ];

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showResults) {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-effect rounded-2xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-2">Assessment Complete!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Great job! Here's your performance summary:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl">
              <div className="text-4xl font-bold text-primary-600 mb-2">85%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Score</div>
            </div>
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
              <div className="text-4xl font-bold text-green-600 mb-2">2/3</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
            </div>
            <div className="p-6 bg-gradient-to-br from-accent-50 to-primary-50 dark:from-accent-900/20 dark:to-primary-900/20 rounded-xl">
              <div className="text-4xl font-bold text-accent-600 mb-2">12:34</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Time Spent</div>
            </div>
          </div>

          {/* AI Feedback for Descriptive Answers */}
          <AIFeedback 
            question={questions[2].question}
            answer={questions[2].userAnswer || ''}
          />

          <div className="flex gap-4 justify-center mt-8">
            <button className="btn-secondary">Review Answers</button>
            <button className="btn-primary flex items-center gap-2">
              <span>Continue Learning</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">React Hooks Assessment</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Module 2 Review
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-primary-600 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-dark-800 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-primary-600 to-accent-600"
            />
          </div>
        </div>

        {/* Question Navigation Dots */}
        <div className="flex gap-2 mt-4">
          {questions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentQuestion(idx)}
              className={`flex-1 h-2 rounded-full transition-all ${
                idx === currentQuestion
                  ? 'bg-primary-600'
                  : idx < currentQuestion
                  ? 'bg-green-500'
                  : 'bg-gray-200 dark:bg-dark-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="glass-effect rounded-2xl p-8"
        >
          <h2 className="text-xl font-bold mb-6">{questions[currentQuestion].question}</h2>

          {/* Multiple Choice */}
          {questions[currentQuestion].type === 'multiple-choice' && (
            <div className="space-y-3">
              {questions[currentQuestion].options?.map((option, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full p-4 text-left rounded-xl border-2 border-gray-200 dark:border-dark-700 hover:border-primary-600 dark:hover:border-primary-600 transition-all flex items-center gap-3"
                >
                  <Circle className="w-5 h-5 text-gray-400" />
                  <span>{option}</span>
                </motion.button>
              ))}
            </div>
          )}

          {/* Fill in the Blank */}
          {questions[currentQuestion].type === 'fill-blank' && (
            <div>
              <input
                type="text"
                placeholder="Type your answer here..."
                className="input-field text-lg"
              />
            </div>
          )}

          {/* Descriptive Answer */}
          {questions[currentQuestion].type === 'descriptive' && (
            <div className="space-y-4">
              <textarea
                placeholder="Write your detailed answer here..."
                rows={8}
                className="input-field resize-none font-sans"
              />
              <div className="p-4 bg-accent-50 dark:bg-accent-900/20 border-l-4 border-accent-600 rounded-r-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-accent-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-accent-600 mb-1">AI-Powered Feedback</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your answer will be evaluated by our AI system, which will provide
                      detailed feedback on strengths, weaknesses, and suggestions for
                      improvement.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-dark-800">
            <button
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion(currentQuestion - 1)}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {currentQuestion === questions.length - 1 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowResults(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span>Submit Assessment</span>
              </motion.button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="btn-primary flex items-center gap-2"
              >
                <span>Next</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};