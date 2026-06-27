import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, Clock, TrendingUp, AlertCircle, CheckCircle2, Award, ArrowRight } from 'lucide-react';

interface Choice {
  id: string;
  text: string;
  consequence: string;
  impact: {
    satisfaction: number;
    productivity: number;
    teamwork: number;
    learning: number;
  };
  nextScenario?: string;
}

interface Scenario {
  id: string;
  time: string;
  title: string;
  description: string;
  context: string;
  choices: Choice[];
  careerPath: string;
}

const scenarios: Record<string, Scenario> = {
  'morning-standup': {
    id: 'morning-standup',
    time: '9:00 AM',
    title: 'Morning Stand-up',
    description: 'The team gathers for the daily stand-up meeting. Your sprint task is blocked because the API endpoint you need isn\'t ready yet.',
    context: 'You\'re a Full Stack Developer working on a new feature. The backend team is running behind schedule.',
    careerPath: 'Full Stack Developer',
    choices: [
      {
        id: 'wait',
        text: 'Wait for the backend team to finish',
        consequence: 'You lose a day of productivity, but maintain good team relations.',
        impact: { satisfaction: -10, productivity: -20, teamwork: 10, learning: 0 },
        nextScenario: 'afternoon-meeting',
      },
      {
        id: 'mock',
        text: 'Create mock data and build the frontend independently',
        consequence: 'You stay productive and can test integration later.',
        impact: { satisfaction: 10, productivity: 20, teamwork: 0, learning: 15 },
        nextScenario: 'code-review',
      },
      {
        id: 'help',
        text: 'Offer to help the backend team unblock the issue',
        consequence: 'You demonstrate cross-functional skills and strengthen team bonds.',
        impact: { satisfaction: 15, productivity: 5, teamwork: 25, learning: 20 },
        nextScenario: 'pair-programming',
      },
    ],
  },
  
  'code-review': {
    id: 'code-review',
    time: '11:30 AM',
    title: 'Code Review Feedback',
    description: 'You receive feedback on your PR. A senior developer suggests a completely different architectural approach.',
    context: 'The suggestion would require rewriting most of your code, but it\'s technically superior.',
    careerPath: 'Full Stack Developer',
    choices: [
      {
        id: 'refactor',
        text: 'Accept the feedback and refactor everything',
        consequence: 'You learn best practices but miss your sprint deadline.',
        impact: { satisfaction: 0, productivity: -15, teamwork: 10, learning: 30 },
        nextScenario: 'afternoon-meeting',
      },
      {
        id: 'compromise',
        text: 'Propose a hybrid approach for current sprint, full refactor later',
        consequence: 'You show pragmatism and communication skills.',
        impact: { satisfaction: 15, productivity: 10, teamwork: 20, learning: 15 },
        nextScenario: 'deployment',
      },
      {
        id: 'defend',
        text: 'Defend your approach with technical reasoning',
        consequence: 'You stand your ground but may seem inflexible.',
        impact: { satisfaction: 5, productivity: 15, teamwork: -10, learning: 5 },
        nextScenario: 'afternoon-meeting',
      },
    ],
  },
  
  'pair-programming': {
    id: 'pair-programming',
    time: '2:00 PM',
    title: 'Pair Programming Session',
    description: 'You\'re pairing with a junior developer who is struggling with a concept you find simple.',
    context: 'You could do it yourself in 30 minutes, but teaching them will take 2 hours.',
    careerPath: 'Full Stack Developer',
    choices: [
      {
        id: 'teach',
        text: 'Take time to explain concepts thoroughly',
        consequence: 'You invest in team growth and become a mentor.',
        impact: { satisfaction: 20, productivity: -10, teamwork: 30, learning: 10 },
        nextScenario: 'end-positive',
      },
      {
        id: 'quick',
        text: 'Show them the solution quickly and move on',
        consequence: 'You stay on schedule but miss a mentoring opportunity.',
        impact: { satisfaction: 0, productivity: 10, teamwork: 5, learning: 0 },
        nextScenario: 'deployment',
      },
    ],
  },
  
  'afternoon-meeting': {
    id: 'afternoon-meeting',
    time: '3:30 PM',
    title: 'Unexpected Client Meeting',
    description: 'The PM asks you to join a client call to explain a technical limitation.',
    context: 'The client is frustrated and the PM needs technical backup.',
    careerPath: 'Full Stack Developer',
    choices: [
      {
        id: 'join',
        text: 'Join the meeting and clearly explain technical constraints',
        consequence: 'You demonstrate communication skills beyond coding.',
        impact: { satisfaction: 15, productivity: -5, teamwork: 20, learning: 15 },
        nextScenario: 'deployment',
      },
      {
        id: 'alternative',
        text: 'Suggest a creative workaround before the meeting',
        consequence: 'You\'re a problem-solver and might save the relationship.',
        impact: { satisfaction: 25, productivity: 5, teamwork: 25, learning: 20 },
        nextScenario: 'end-positive',
      },
    ],
  },
  
  'deployment': {
    id: 'deployment',
    time: '4:45 PM',
    title: 'Pre-Production Deployment',
    description: 'You notice a potential bug right before deploying to staging.',
    context: 'Fixing it means staying late. Ignoring it might be fine... or cause issues.',
    careerPath: 'Full Stack Developer',
    choices: [
      {
        id: 'fix',
        text: 'Stay late and fix the bug properly',
        consequence: 'You ensure quality but sacrifice work-life balance.',
        impact: { satisfaction: -5, productivity: 10, teamwork: 10, learning: 5 },
        nextScenario: 'end-neutral',
      },
      {
        id: 'deploy',
        text: 'Deploy with a detailed note for QA to test thoroughly',
        consequence: 'You trust the process and maintain boundaries.',
        impact: { satisfaction: 10, productivity: 0, teamwork: 5, learning: 0 },
        nextScenario: 'end-neutral',
      },
      {
        id: 'hotfix',
        text: 'Add it to the hotfix queue for tomorrow morning',
        consequence: 'You prioritize effectively and plan ahead.',
        impact: { satisfaction: 15, productivity: 5, teamwork: 15, learning: 10 },
        nextScenario: 'end-positive',
      },
    ],
  },
  
  'end-positive': {
    id: 'end-positive',
    time: '5:30 PM',
    title: 'End of Day - Great Impact!',
    description: 'You\'ve had a productive day balancing technical work, collaboration, and learning.',
    context: 'Your manager notices your contributions and thanks you in Slack.',
    careerPath: 'Full Stack Developer',
    choices: [],
  },
  
  'end-neutral': {
    id: 'end-neutral',
    time: '5:30 PM',
    title: 'End of Day - Solid Work',
    description: 'You completed your tasks and contributed to the team.',
    context: 'A normal day in the life of a developer.',
    careerPath: 'Full Stack Developer',
    choices: [],
  },
};

interface DayInLifeModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerPath: string;
}

export default function DayInLifeModal({ isOpen, onClose, careerPath }: DayInLifeModalProps) {
  const [currentScenario, setCurrentScenario] = useState('morning-standup');
  const [stats, setStats] = useState({
    satisfaction: 50,
    productivity: 50,
    teamwork: 50,
    learning: 50,
  });
  const [history, setHistory] = useState<Array<{ scenario: string; choice: string }>>([]);
  const [showResults, setShowResults] = useState(false);

  const scenario = scenarios[currentScenario];
  const isEndScenario = scenario.choices.length === 0;

  const handleChoice = (choice: Choice) => {
    // Update stats
    setStats(prev => ({
      satisfaction: Math.max(0, Math.min(100, prev.satisfaction + choice.impact.satisfaction)),
      productivity: Math.max(0, Math.min(100, prev.productivity + choice.impact.productivity)),
      teamwork: Math.max(0, Math.min(100, prev.teamwork + choice.impact.teamwork)),
      learning: Math.max(0, Math.min(100, prev.learning + choice.impact.learning)),
    }));

    // Record history
    setHistory(prev => [...prev, { scenario: currentScenario, choice: choice.id }]);

    // Move to next scenario or show results
    if (choice.nextScenario) {
      setTimeout(() => {
        setCurrentScenario(choice.nextScenario!);
      }, 1500);
    } else {
      setTimeout(() => {
        setShowResults(true);
      }, 1500);
    }
  };

  const reset = () => {
    setCurrentScenario('morning-standup');
    setStats({ satisfaction: 50, productivity: 50, teamwork: 50, learning: 50 });
    setHistory([]);
    setShowResults(false);
  };

  const getPerformanceLevel = () => {
    const avg = (stats.satisfaction + stats.productivity + stats.teamwork + stats.learning) / 4;
    if (avg >= 70) return { level: 'Excellent', color: 'text-green-400', icon: Award };
    if (avg >= 50) return { level: 'Good', color: 'text-blue-400', icon: CheckCircle2 };
    return { level: 'Needs Improvement', color: 'text-yellow-400', icon: AlertCircle };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-gray-900 rounded-2xl shadow-2xl border border-gray-800"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-6 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">A Day in the Life</h2>
                <p className="text-gray-400 text-sm mt-1">{careerPath}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[
                { key: 'satisfaction', label: 'Satisfaction', color: 'bg-purple-500' },
                { key: 'productivity', label: 'Productivity', color: 'bg-blue-500' },
                { key: 'teamwork', label: 'Teamwork', color: 'bg-green-500' },
                { key: 'learning', label: 'Learning', color: 'bg-yellow-500' },
              ].map(stat => (
                <div key={stat.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{stat.label}</span>
                    <span className="text-xs font-bold text-white">
                      {stats[stat.key as keyof typeof stats]}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '50%' }}
                      animate={{ width: `${stats[stat.key as keyof typeof stats]}%` }}
                      className={`h-full ${stat.color}`}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {!showResults && !isEndScenario && (
              <motion.div
                key={currentScenario}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Time & Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-purple-400 font-semibold">{scenario.time}</div>
                    <h3 className="text-2xl font-bold text-white">{scenario.title}</h3>
                  </div>
                </div>

                {/* Context */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-gray-300">{scenario.context}</p>
                </div>

                {/* Description */}
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 text-lg leading-relaxed">{scenario.description}</p>
                </div>

                {/* Choices */}
                <div className="space-y-3 pt-4">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase">What do you do?</h4>
                  {scenario.choices.map(choice => (
                    <motion.button
                      key={choice.id}
                      onClick={() => handleChoice(choice)}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-4 bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-purple-500 rounded-xl transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{choice.text}</span>
                        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                      </div>
                      <p className="text-sm text-gray-400 mt-2">{choice.consequence}</p>
                      
                      {/* Impact Preview */}
                      <div className="flex gap-2 mt-3">
                        {Object.entries(choice.impact).map(([key, value]) => {
                          if (value === 0) return null;
                          const color = value > 0 ? 'text-green-400' : 'text-red-400';
                          return (
                            <span key={key} className={`text-xs ${color} flex items-center gap-1`}>
                              {value > 0 ? '+' : ''}{value}
                              <TrendingUp className="w-3 h-3" />
                            </span>
                          );
                        })}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {!showResults && isEndScenario && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="mb-6">
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-2">{scenario.title}</h3>
                  <p className="text-gray-400 max-w-md mx-auto">{scenario.description}</p>
                </div>
                
                <button
                  onClick={() => setShowResults(true)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
                >
                  View Results
                </button>
              </motion.div>
            )}

            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Performance Summary */}
                <div className="text-center py-8">
                  <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    {(() => {
                      const Icon = getPerformanceLevel().icon;
                      return <Icon className={`w-12 h-12 ${getPerformanceLevel().color}`} />;
                    })()}
                  </div>
                  <h3 className={`text-3xl font-bold ${getPerformanceLevel().color} mb-2`}>
                    {getPerformanceLevel().level}
                  </h3>
                  <p className="text-gray-400">
                    You navigated {history.length} scenarios as a {careerPath}
                  </p>
                </div>

                {/* Final Stats */}
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(stats).map(([key, value]) => (
                    <div key={key} className="p-4 bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-400 capitalize mb-2">{key}</div>
                      <div className="text-3xl font-bold text-white">{value}%</div>
                    </div>
                  ))}
                </div>

                {/* Key Insights */}
                <div className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="font-bold text-white mb-3">Key Insights</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {stats.teamwork >= 60 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Strong collaboration skills - you prioritize team success</span>
                      </li>
                    )}
                    {stats.learning >= 60 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Growth mindset - you seek learning opportunities</span>
                      </li>
                    )}
                    {stats.productivity >= 60 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Effective time management and task completion</span>
                      </li>
                    )}
                    {stats.satisfaction >= 60 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Work-life balance and career fulfillment</span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
