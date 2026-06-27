import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Code, 
  Brain, 
  Gamepad, 
  Palette, 
  Shield,
  Video,
  BookOpen,
  Laptop,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';

interface Option {
  id: string;
  label: string;
  icon: typeof Target;
  description?: string;
}

interface Question {
  id: number;
  question: string;
  subtitle: string;
  type: 'single' | 'multi';
  options: Option[];
}

const questions: Question[] = [
  {
    id: 1,
    question: 'What is your primary goal?',
    subtitle: 'Help us understand what drives you',
    type: 'single',
    options: [
      { 
        id: 'career-change', 
        label: 'Career Change', 
        icon: Target,
        description: 'Switch to a new field or industry'
      },
      { 
        id: 'skill-up', 
        label: 'Skill Up', 
        icon: Brain,
        description: 'Enhance existing skills and knowledge'
      },
      { 
        id: 'project-building', 
        label: 'Project Building', 
        icon: Code,
        description: 'Create real-world applications'
      },
      { 
        id: 'just-curious', 
        label: 'Just Curious', 
        icon: Gamepad,
        description: 'Exploring and learning for fun'
      },
    ],
  },
  {
    id: 2,
    question: 'Which domains excite you?',
    subtitle: 'Select all that interest you',
    type: 'multi',
    options: [
      { id: 'web-dev', label: 'Web Development', icon: Code },
      { id: 'ai-ml', label: 'AI & Machine Learning', icon: Brain },
      { id: 'game-design', label: 'Game Design', icon: Gamepad },
      { id: 'ui-ux', label: 'UI/UX Design', icon: Palette },
      { id: 'cybersecurity', label: 'Cybersecurity', icon: Shield },
    ],
  },
  {
    id: 3,
    question: 'How do you learn best?',
    subtitle: 'Choose your preferred learning style',
    type: 'single',
    options: [
      { 
        id: 'visual', 
        label: 'Visual Learner', 
        icon: Video,
        description: 'Videos, diagrams, and demonstrations'
      },
      { 
        id: 'text', 
        label: 'Text-Based Learner', 
        icon: BookOpen,
        description: 'Articles, documentation, and reading'
      },
      { 
        id: 'interactive', 
        label: 'Interactive Learner', 
        icon: Laptop,
        description: 'Hands-on coding and experimentation'
      },
    ],
  },
];

export default function Assessment() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const navigate = useNavigate();

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleSelectOption = (optionId: string) => {
    const questionId = currentQuestion.id;
    
    if (currentQuestion.type === 'single') {
      setAnswers(prev => ({ ...prev, [questionId]: [optionId] }));
    } else {
      setAnswers(prev => {
        const current = prev[questionId] || [];
        const isSelected = current.includes(optionId);
        
        return {
          ...prev,
          [questionId]: isSelected
            ? current.filter(id => id !== optionId)
            : [...current, optionId],
        };
      });
    }
  };

  const isOptionSelected = (optionId: string) => {
    return answers[currentQuestion.id]?.includes(optionId) || false;
  };

  const canProceed = () => {
    const currentAnswers = answers[currentQuestion.id];
    return currentAnswers && currentAnswers.length > 0;
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Save answers to localStorage
      localStorage.setItem('assessmentAnswers', JSON.stringify(answers));
      navigate('/dashboard');
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col overflow-hidden">
      {/* Ambient orb */}
      <div aria-hidden className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vh] rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />

      {/* Gradient progress bar */}
      <div className="fixed top-16 left-0 right-0 h-0.5 bg-[var(--border-subtle)] z-40">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-24 relative z-10">
        <div className="w-full max-w-3xl">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {questions.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-400 ${
                i <= currentStep
                  ? 'w-8 bg-gradient-to-r from-violet-500 to-cyan-500'
                  : 'w-4 bg-[var(--border-subtle)]'
              }`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="w-full"
            >
              {/* Question Header */}
              <div className="text-center mb-10">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-4"
                >
                  Question {currentStep + 1} of {questions.length}
                </motion.p>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] mb-3">
                  {currentQuestion.question}
                </h1>
                <p className="text-[var(--text-secondary)]">{currentQuestion.subtitle}</p>
              </div>

              {/* Options */}
              <div className={`grid gap-3 mb-10 ${
                currentQuestion.options.length > 3
                  ? 'grid-cols-2 lg:grid-cols-4'
                  : 'grid-cols-1 sm:grid-cols-3'
              }`}>
                {currentQuestion.options.map((option, index) => {
                  const Icon = option.icon;
                  const isSelected = isOptionSelected(option.id);
                  return (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.06 }}
                      onClick={() => handleSelectOption(option.id)}
                      className={`relative text-left p-5 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'bg-violet-500/12 border-violet-500/60 shadow-[0_0_20px_rgba(139,92,246,0.18)]'
                          : 'bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-violet-500/30 hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                            className="absolute top-3 right-3 w-5 h-5 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-full flex items-center justify-center"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className={`inline-flex p-2.5 rounded-xl mb-3 transition-colors ${
                        isSelected ? 'bg-violet-500/20' : 'bg-[var(--surface-hover)]'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-violet-400' : 'text-[var(--text-secondary)]'}`} />
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{option.label}</h3>
                      {option.description && (
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{option.description}</p>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 h-10 px-4 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="btn-primary h-10 px-6 rounded-xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLastQuestion ? 'Generate My Path' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
