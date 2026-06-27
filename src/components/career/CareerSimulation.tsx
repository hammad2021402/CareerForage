import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

interface Choice {
  id: string;
  text: string;
  consequence: 'good' | 'bad' | 'neutral';
  feedback: string;
  xpGained?: number;
}

interface Scenario {
  id: number;
  situation: string;
  context: string;
  choices: Choice[];
  nextScenario?: (choice: Choice) => number | null;
}

interface CareerSimulationProps {
  careerPath: string;
}

const backendScenarios: Scenario[] = [
  {
    id: 1,
    situation: "Critical Bug: Users Can't Log In",
    context: "It's 9 AM Monday morning. The support team reports that users are getting a '500 Internal Server Error' when trying to log in. The error logs show database connection issues. What's your first move?",
    choices: [
      {
        id: 'a',
        text: 'Check the database connection string and server status',
        consequence: 'good',
        feedback: 'Excellent! You found that the database server was down due to a scheduled maintenance that wasn\'t communicated. You quickly switched to the backup server and restored service in 10 minutes.',
        xpGained: 150,
      },
      {
        id: 'b',
        text: 'Review the latest code commits to the auth service',
        consequence: 'neutral',
        feedback: 'You spend 20 minutes reviewing code but don\'t find any recent changes. While this is thorough, you lost valuable time. The real issue was the database connection.',
        xpGained: 50,
      },
      {
        id: 'c',
        text: 'Immediately ask a senior developer for help',
        consequence: 'bad',
        feedback: 'The senior dev is in a meeting. While it\'s good to ask for help when stuck, you should investigate basic issues first. You could have checked logs and connection status.',
        xpGained: 25,
      },
    ],
  },
  {
    id: 2,
    situation: "Performance Bottleneck Discovered",
    context: "Your monitoring dashboard shows API response times have increased by 300% over the last hour. Users are complaining about slow load times. The traffic is normal. What do you investigate first?",
    choices: [
      {
        id: 'a',
        text: 'Check for slow database queries using the query analyzer',
        consequence: 'good',
        feedback: 'Smart move! You discovered an inefficient query without proper indexing that was scanning millions of rows. Adding an index reduced response time by 95%.',
        xpGained: 200,
      },
      {
        id: 'b',
        text: 'Restart the application servers',
        consequence: 'bad',
        feedback: 'The restart temporarily cleared some caches but didn\'t solve the root cause. The performance degraded again within minutes. You needed to find the actual bottleneck.',
        xpGained: 0,
      },
      {
        id: 'c',
        text: 'Add more server instances to handle the load',
        consequence: 'neutral',
        feedback: 'This helped distribute the load, but it\'s expensive and doesn\'t address the root cause. It\'s a band-aid solution when optimization was needed.',
        xpGained: 75,
      },
    ],
  },
  {
    id: 3,
    situation: "Feature Request from Product Team",
    context: "The product team wants a new API endpoint that aggregates data from 5 different services and returns it all in one response. They need it by end of week. How do you approach this?",
    choices: [
      {
        id: 'a',
        text: 'Design the architecture first, considering caching and async processing',
        consequence: 'good',
        feedback: 'Perfect! You created a design document showing how to use Redis caching and background jobs to avoid blocking requests. The team approved it and you delivered a scalable solution.',
        xpGained: 250,
      },
      {
        id: 'b',
        text: 'Start coding immediately to meet the deadline',
        consequence: 'bad',
        feedback: 'You created a working solution but it makes 5 sequential API calls, blocking for seconds. In production, it caused timeouts and had to be rewritten.',
        xpGained: 50,
      },
      {
        id: 'c',
        text: 'Push back saying it\'s not possible in the timeframe',
        consequence: 'neutral',
        feedback: 'While honest, you didn\'t explore solutions. A better approach is proposing alternatives like phased delivery or suggesting a better architecture.',
        xpGained: 25,
      },
    ],
  },
];

const frontendScenarios: Scenario[] = [
  {
    id: 1,
    situation: "Browser Compatibility Issue",
    context: "A client reports that your new dashboard looks broken in Safari, though it works perfectly in Chrome. The deadline is tomorrow. What's your approach?",
    choices: [
      {
        id: 'a',
        text: 'Open Safari DevTools and test the specific features',
        consequence: 'good',
        feedback: 'Great thinking! You discovered that Safari doesn\'t support certain CSS Grid features you used. You implemented a flexbox fallback and the issue was resolved.',
        xpGained: 150,
      },
      {
        id: 'b',
        text: 'Tell the client to use Chrome instead',
        consequence: 'bad',
        feedback: 'Not professional. Users expect apps to work across browsers. This damages your credibility and the client is unhappy.',
        xpGained: 0,
      },
      {
        id: 'c',
        text: 'Research Safari-specific polyfills and add them all',
        consequence: 'neutral',
        feedback: 'You fixed it but added 200KB of polyfills. Better to identify the specific issue and use targeted fixes to keep bundle size small.',
        xpGained: 75,
      },
    ],
  },
  {
    id: 2,
    situation: "Performance: First Load Too Slow",
    context: "Your app's Lighthouse score shows a 4.5s First Contentful Paint. The bundle size is 1.2MB. Users are complaining about slow initial loads. What's your priority fix?",
    choices: [
      {
        id: 'a',
        text: 'Implement code-splitting and lazy loading for routes',
        consequence: 'good',
        feedback: 'Excellent! You reduced the initial bundle to 300KB and lazy-loaded other routes. FCP improved to 1.2s and users are happy.',
        xpGained: 200,
      },
      {
        id: 'b',
        text: 'Minify the code and enable Gzip compression',
        consequence: 'neutral',
        feedback: 'This helped a bit (reduced to 1MB), but doesn\'t address the fundamental issue of loading too much code upfront. Better than nothing though.',
        xpGained: 100,
      },
      {
        id: 'c',
        text: 'Add a loading spinner so users know something is happening',
        consequence: 'bad',
        feedback: 'A spinner doesn\'t fix slow loading, it just makes it visible. Users still wait 4.5 seconds. You needed to actually improve performance.',
        xpGained: 25,
      },
    ],
  },
];

export default function CareerSimulation({ careerPath }: CareerSimulationProps) {
  const scenarios = careerPath === 'Backend Developer' ? backendScenarios : frontendScenarios;
  
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState(0);

  const currentScenario = scenarios[currentScenarioIndex];

  const handleChoice = (choice: Choice) => {
    setSelectedChoice(choice);
    if (choice.xpGained) {
      setTotalXP(prev => prev + choice.xpGained!);
    }
    setCompletedScenarios(prev => prev + 1);
  };

  const handleNext = () => {
    if (currentScenarioIndex < scenarios.length - 1) {
      setCurrentScenarioIndex(prev => prev + 1);
      setSelectedChoice(null);
    }
  };

  const handleRestart = () => {
    setCurrentScenarioIndex(0);
    setSelectedChoice(null);
    setTotalXP(0);
    setCompletedScenarios(0);
  };

  const isComplete = currentScenarioIndex === scenarios.length - 1 && selectedChoice !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto text-[var(--text-primary)]"
    >
      {/* Header */}
      <div className="card mb-6 bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">A Day in the Life</h2>
            <p className="text-sm text-[var(--text-secondary)]">Career Path: {careerPath}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-[var(--text-muted)]">Total XP Earned</div>
            <motion.div
              key={totalXP}
              initial={{ scale: 1.5 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold text-accent"
            >
              {totalXP}
            </motion.div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[var(--text-secondary)]">
              Scenario {currentScenarioIndex + 1} of {scenarios.length}
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              {Math.round((completedScenarios / scenarios.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-[var(--border-subtle)] rounded-full h-2 overflow-hidden">
            <motion.div
              animate={{ width: `${(completedScenarios / scenarios.length) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-accent to-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Scenario Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScenarioIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
          className="card bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 rounded-2xl"
        >
          {/* Situation */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)]">{currentScenario.situation}</h3>
            </div>
            <p className="text-[var(--text-primary)] text-lg leading-relaxed">{currentScenario.context}</p>
          </div>

          {/* Choices */}
          <div className="space-y-3 mb-6">
            {currentScenario.choices.map((choice, index) => {
              const isSelected = selectedChoice?.id === choice.id;
              const isDisabled = selectedChoice !== null;

              return (
                <motion.button
                  key={choice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => !isDisabled && handleChoice(choice)}
                  disabled={isDisabled}
                  className={`w-full p-4 rounded-xl text-left transition-all border ${
                    isSelected
                      ? choice.consequence === 'good'
                        ? 'bg-green-500/20 border-green-500 text-[var(--text-primary)]'
                        : choice.consequence === 'bad'
                        ? 'bg-red-500/20 border-red-500 text-[var(--text-primary)]'
                        : 'bg-blue-500/20 border-blue-500 text-[var(--text-primary)]'
                      : isDisabled
                      ? 'bg-[var(--surface-hover)]/40 border-[var(--border-subtle)] opacity-50 text-[var(--text-muted)]'
                      : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:bg-[var(--surface-card-hover)] hover:border-violet-500/40 text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white ${
                      isSelected
                        ? choice.consequence === 'good'
                          ? 'bg-green-500'
                          : choice.consequence === 'bad'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                        : 'bg-[var(--border-subtle)]'
                    }`}>
                      <span className="font-bold">{choice.id.toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-medium">{choice.text}</p>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                      >
                        {choice.consequence === 'good' ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-500" />
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {selectedChoice && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-6 rounded-xl border-2 mb-6 ${
                  selectedChoice.consequence === 'good'
                    ? 'bg-green-500/10 border-green-500/30'
                    : selectedChoice.consequence === 'bad'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {selectedChoice.consequence === 'good' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  ) : selectedChoice.consequence === 'bad' ? (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-2 ${
                      selectedChoice.consequence === 'good'
                        ? 'text-green-600 dark:text-green-500'
                        : selectedChoice.consequence === 'bad'
                        ? 'text-red-600 dark:text-red-500'
                        : 'text-blue-600 dark:text-blue-500'
                    }`}>
                      {selectedChoice.consequence === 'good' ? 'Great Decision!' : selectedChoice.consequence === 'bad' ? 'Not Ideal' : 'Okay Choice'}
                    </h4>
                    <p className="text-[var(--text-primary)] mb-3">{selectedChoice.feedback}</p>
                    {selectedChoice.xpGained && selectedChoice.xpGained > 0 && (
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-accent" />
                        <span className="font-semibold text-accent">+{selectedChoice.xpGained} XP</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          {selectedChoice && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              {!isComplete ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="flex-1 py-3 bg-gradient-to-r from-accent to-purple-500 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent/30 transition-all text-white"
                >
                  Next Scenario
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleRestart}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-green-500/30 transition-all text-white"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </motion.button>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Completion Message */}
      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card mt-6 bg-gradient-to-r from-accent/20 to-purple-500/20 border border-accent/30 p-6 rounded-2xl"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1 }}
              className="inline-block mb-4"
            >
              <Trophy className="w-16 h-16 text-accent" />
            </motion.div>
            <h3 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Simulation Complete!</h3>
            <p className="text-[var(--text-primary)] mb-4">
              You've experienced a day in the life of a {careerPath}. You earned <span className="font-bold text-accent">{totalXP} XP</span>!
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              These scenarios are based on real-world situations developers face every day.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
