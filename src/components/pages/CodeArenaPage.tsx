import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Code, 
  CheckCircle2, 
  Clock, 
  Play,
  Loader2
} from 'lucide-react';
import Editor from '@monaco-editor/react';

interface Assessment {
  id: number;
  title: string;
  type: 'mcq' | 'code';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  questions: number;
  description: string;
  completed: boolean;
  score?: number;
}

const assessments: Assessment[] = [
  { id: 1, title: 'JavaScript Fundamentals', type: 'mcq', difficulty: 'easy', duration: 15, questions: 10, description: 'Test your knowledge of JS basics', completed: true, score: 85 },
  { id: 2, title: 'React Hooks Mastery', type: 'code', difficulty: 'medium', duration: 30, questions: 5, description: 'Write code to demonstrate React Hooks', completed: false },
  { id: 3, title: 'Algorithm Challenge', type: 'code', difficulty: 'hard', duration: 45, questions: 3, description: 'Solve complex algorithmic problems', completed: false },
  { id: 4, title: 'CSS Flexbox Quiz', type: 'mcq', difficulty: 'easy', duration: 10, questions: 8, description: 'Master modern CSS layouts', completed: true, score: 100 },
  { id: 5, title: 'TypeScript Advanced', type: 'code', difficulty: 'hard', duration: 60, questions: 4, description: 'Advanced TypeScript patterns', completed: false },
];

interface MCQQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

const sampleMCQs: MCQQuestion[] = [
  {
    question: 'What is the output of: console.log(typeof [])?',
    options: ['array', 'object', 'undefined', 'null'],
    correctAnswer: 1
  },
  {
    question: 'Which method is used to add an element to the end of an array?',
    options: ['push()', 'pop()', 'shift()', 'unshift()'],
    correctAnswer: 0
  }
];

interface CodeQuestion {
  title: string;
  description: string;
  starterCode: string;
  testCases: { input: string; expected: string }[];
}

const sampleCodeQuestion: CodeQuestion = {
  title: 'Implement a Custom useState Hook',
  description: 'Create a simplified version of React\'s useState hook. It should return an array with the current state value and a function to update it.',
  starterCode: `function myUseState(initialValue) {
  // Your implementation here
  
  return [/* state */, /* setState */];
}

// Test it
const [count, setCount] = myUseState(0);
console.log(count); // Should output: 0
setCount(5);
console.log(count); // Should output: 5`,
  testCases: [
    { input: 'myUseState(0)', expected: 'Returns [0, function]' },
    { input: 'setCount(10)', expected: 'Updates state to 10' }
  ]
};

export default function AssessmentHub() {
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isInFocusMode, setIsInFocusMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [code, setCode] = useState(sampleCodeQuestion.starterCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<boolean[]>([]);

  const startAssessment = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsInFocusMode(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setCode(sampleCodeQuestion.starterCode);
    setAiFeedback(null);
    setTestResults([]);
  };

  const exitFocusMode = () => {
    setIsInFocusMode(false);
    setSelectedAssessment(null);
  };

  const handleSelectAnswer = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (selectedAssessment && currentQuestionIndex < selectedAssessment.questions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const runCode = async () => {
    setIsSubmitting(true);
    setAiFeedback(null);
    setTestResults([]);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const results = sampleCodeQuestion.testCases.map(() => Math.random() > 0.3);
    setTestResults(results);

    const feedback = `Great attempt! Here's some feedback on your implementation:
- Your use of a closure to maintain state is a core concept, well done.
- Consider edge cases: what if the new state is a function? React's \`setState\` handles this.
- Your variable naming is clear and easy to understand.
- For production, you'd need a mechanism to trigger re-renders. Your current implementation doesn't do this, which is expected for this simplified version.`;
    setAiFeedback(feedback);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--bg)] text-[var(--text-primary)]">
      <AnimatePresence mode="wait">
        {isInFocusMode && selectedAssessment ? (
          <FocusView
            assessment={selectedAssessment}
            currentQuestionIndex={currentQuestionIndex}
            onSelectAnswer={handleSelectAnswer}
            selectedAnswers={selectedAnswers}
            onNext={handleNextQuestion}
            onPrev={handlePrevQuestion}
            code={code}
            onCodeChange={setCode}
            onRunCode={runCode}
            isSubmitting={isSubmitting}
            aiFeedback={aiFeedback}
            testResults={testResults}
            onExit={exitFocusMode}
          />
        ) : (
          <HubView 
            assessments={assessments} 
            onStartAssessment={startAssessment} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const HubView = ({ assessments, onStartAssessment }: { assessments: Assessment[], onStartAssessment: (assessment: Assessment) => void }) => (
  <motion.div
    key="hub"
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.3 }}
    className="w-full px-4 py-8"
  >
    <div className="mb-10">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
        Assessment Hub
      </h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Challenge yourself, test your skills, and track your mastery across various domains.
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {assessments.map(assessment => (
        <AssessmentCard 
          key={assessment.id} 
          assessment={assessment} 
          onStart={() => onStartAssessment(assessment)} 
        />
      ))}
    </div>
  </motion.div>
);

const AssessmentCard = ({ assessment, onStart }: { assessment: Assessment, onStart: () => void }) => {
  const difficultyBg = {
    easy: 'bg-green-500/10 text-green-600 dark:text-green-400',
    medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-card)] flex flex-col hover:border-violet-500/20 transition-all duration-200"
    >
      <div className="p-6 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
            {assessment.type === 'mcq' ? <Brain className="w-7 h-7 text-violet-400" /> : <Code className="w-7 h-7 text-cyan-400" />}
          </div>
          {assessment.completed && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 size={18} />
              <span className="font-semibold text-sm">Completed</span>
            </div>
          )}
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{assessment.title}</h3>
        <p className="text-[var(--text-secondary)] text-sm mb-4 h-10">{assessment.description}</p>
        
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-5">
          <span className={`font-bold uppercase tracking-wider px-2 py-1 rounded ${difficultyBg[assessment.difficulty]}`}>
            {assessment.difficulty}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{assessment.duration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{assessment.questions} Qs</span>
            </div>
          </div>
        </div>

        {assessment.score !== undefined && (
          <div className="text-center bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl py-2 mb-4">
            <p className="text-sm text-[var(--text-secondary)]">Your Score: <span className="font-bold text-xl text-green-600 dark:text-green-400">{assessment.score}%</span></p>
          </div>
        )}
      </div>
      
      <div className="px-6 pb-6">
        <motion.button 
          onClick={onStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full flex items-center justify-center gap-2 btn-primary py-3 px-4 rounded-xl font-bold"
        >
          <Play size={18} />
          <span>{assessment.completed ? 'Review' : 'Start Now'}</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

const FocusView = ({ 
  assessment, 
  currentQuestionIndex, 
  onSelectAnswer, 
  selectedAnswers,
  onNext,
  onPrev,
  code,
  onCodeChange,
  onRunCode,
  isSubmitting,
  aiFeedback,
  testResults,
  onExit
}: { 
  assessment: Assessment, 
  currentQuestionIndex: number, 
  onSelectAnswer: (index: number) => void,
  selectedAnswers: number[],
  onNext: () => void,
  onPrev: () => void,
  code: string,
  onCodeChange: (code: string) => void,
  onRunCode: () => void,
  isSubmitting: boolean,
  aiFeedback: string | null,
  testResults: boolean[],
  onExit: () => void
}) => (
  <motion.div 
    key="focus"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="container mx-auto px-4 py-8 h-full flex flex-col"
  >
    <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{assessment.title}</h2>
        <motion.button
            onClick={onExit}
            className="px-4 py-2 text-sm font-semibold bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-300 text-[var(--text-secondary)] rounded-xl transition-colors"
            whileHover={{scale: 1.05}}
            whileTap={{scale: 0.95}}
        >
            Exit Focus Mode
        </motion.button>
    </div>

    {assessment.type === 'mcq' ? (
      <MCQView 
        question={sampleMCQs[currentQuestionIndex]}
        onSelect={onSelectAnswer}
        selectedAnswer={selectedAnswers[currentQuestionIndex]}
        onNext={onNext}
        onPrev={onPrev}
        currentIndex={currentQuestionIndex}
        totalQuestions={assessment.questions}
      />
    ) : (
      <CodeView 
        question={sampleCodeQuestion}
        code={code}
        onCodeChange={onCodeChange}
        onRunCode={onRunCode}
        isSubmitting={isSubmitting}
        aiFeedback={aiFeedback}
        testResults={testResults}
      />
    )}
  </motion.div>
);

const MCQView = ({ question, onSelect, selectedAnswer, onNext, onPrev, currentIndex, totalQuestions }: { 
  question: MCQQuestion;
  onSelect: (index: number) => void;
  selectedAnswer: number;
  onNext: () => void;
  onPrev: () => void;
  currentIndex: number;
  totalQuestions: number;
}) => (
  <div className="flex-grow flex flex-col justify-center">
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl p-8 max-w-3xl mx-auto w-full">
      <p className="text-sm text-[var(--text-muted)] mb-4">Question {currentIndex + 1} of {totalQuestions}</p>
      <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-8">{question.question}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option, index) => (
          <motion.button
            key={index}
            onClick={() => onSelect(index)}
            whileHover={{ scale: 1.03 }}
            className={`p-4 rounded-xl text-left transition-all border ${
              selectedAnswer === index
                ? 'bg-violet-500/15 border-violet-500/60 text-[var(--text-primary)]'
                : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:border-violet-500/30 hover:bg-[var(--surface-card-hover)]'
            }`}
          >
            <span className="font-semibold">{option}</span>
          </motion.button>
        ))}
      </div>
      <div className="flex justify-between mt-8">
        <button onClick={onPrev} disabled={currentIndex === 0} className="px-6 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition">Previous</button>
        <button onClick={onNext} disabled={currentIndex === totalQuestions - 1} className="px-6 py-2 rounded-xl btn-primary disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
      </div>
    </div>
  </div>
);

const CodeView = ({ question, code, onCodeChange, onRunCode, isSubmitting, aiFeedback, testResults }: { 
  question: CodeQuestion;
  code: string;
  onCodeChange: (code: string) => void;
  onRunCode: () => void;
  isSubmitting: boolean;
  aiFeedback: string | null;
  testResults: boolean[];
}) => (
  <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Left: Problem Description */}
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl p-6 flex flex-col">
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{question.title}</h3>
      <p className="text-[var(--text-secondary)] text-sm flex-grow">{question.description}</p>
    </div>

    {/* Right: Editor and Feedback */}
    <div className="flex flex-col gap-6">
      <div className="flex-grow h-[400px] lg:h-auto">
        <Editor
          height="100%"
          language="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => onCodeChange(value || '')}
          options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
        />
      </div>
      <div className="flex-shrink-0">
        <motion.button
          onClick={onRunCode}
          disabled={isSubmitting}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-full flex items-center justify-center gap-2 btn-primary py-3 px-4 rounded-xl font-bold disabled:opacity-40"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Play size={18} />}
          <span>{isSubmitting ? 'Running Tests...' : 'Run & Get Feedback'}</span>
        </motion.button>
      </div>
      
      <AnimatePresence>
        {(aiFeedback || testResults.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl p-4 overflow-hidden"
          >
            {testResults.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">Test Cases</h4>
                <div className="flex gap-2">
                  {testResults.map((result, index) => (
                    <div key={index} className={`w-full h-2 rounded-full ${result ? 'bg-green-500' : 'bg-red-500'}`} title={`Test ${index + 1}: ${result ? 'Passed' : 'Failed'}`}></div>
                  ))}
                </div>
              </div>
            )}
            {aiFeedback && (
              <div>
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">AI Feedback</h4>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-mono">{aiFeedback}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
