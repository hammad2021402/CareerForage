import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BarChart3,
  BrainCircuit,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { careerApi, type MockInterviewTurn, type MockInterviewScores, type MockInterviewReport } from '../../services/api';
import { useUser } from '../../context/UserContext';
import { cn } from '@/utils/cn';
import { AppPageLayout } from '@/components/layout/AppPageLayout';
import { PageHero, GlassCard, StatCard, EmptyState, Input } from '@/components/ui';

/* ── Types ── */
type Phase = 'setup' | 'active' | 'results';
type InterviewType = 'technical' | 'behavioral' | 'system-design' | 'hr';

interface AnalyticsState {
  confidence: number;
  technical: number;
  communication: number;
  clarity: number;
}

interface SessionFeedback {
  feedback: string;
  tips: string[];
  strengths: string[];
  improvements: string[];
}

interface FillerCount { [word: string]: number; }

interface ExtendedMockInterviewTurn extends MockInterviewTurn {
  quality?: 'Strong' | 'Average' | 'Weak';
  relevance?: number;
  reason?: string;
  scores?: {
    confidence: number;
    technical: number;
    communication: number;
    clarity: number;
  };
}

export function evaluateAnswer(
  question: string,
  answer: string,
  interviewType: string
): {
  relevance: number;
  technical: number;
  communication: number;
  clarity: number;
  status: 'Strong' | 'Average' | 'Weak';
  reason?: string;
} {
  const ansLower = answer.toLowerCase().trim();
  const qLower = question.toLowerCase().trim();
  const wordCount = ansLower.split(/\s+/).filter(Boolean).length;

  if (wordCount < 4) {
    return {
      relevance: 0,
      technical: 0,
      communication: 10,
      clarity: 10,
      status: 'Weak',
      reason: 'Answer is too short to evaluate.'
    };
  }

  // 1. Extract concepts from the question
  const expectedConcepts = new Set<string>();

  // Stopwords to ignore
  const STOPWORDS = new Set([
    'what', 'how', 'why', 'where', 'when', 'who', 'which', 'whom', 'whose',
    'would', 'could', 'should', 'might', 'must', 'shall', 'will',
    'your', 'yours', 'their', 'theirs', 'about', 'some', 'been', 'have', 'has', 'had',
    'does', 'doesnt', 'dont', 'didnt', 'isnt', 'arent', 'wasnt', 'werent',
    'explain', 'describe', 'tell', 'discuss', 'design', 'write', 'create',
    'think', 'know', 'understand', 'please', 'give', 'show', 'make',
    'into', 'from', 'with', 'under', 'over', 'between', 'through', 'during', 'before', 'after',
    'this', 'that', 'these', 'those', 'than', 'then', 'them', 'they', 'their', 'ours', 'yours',
    'about', 'above', 'below', 'down', 'here', 'there', 'both', 'each', 'more', 'most', 'other',
    'some', 'such', 'only', 'own', 'same', 'so', 'too', 'very', 'can', 'just', 'now',
    'an', 'a', 'the', 'and', 'but', 'or', 'if', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'against',
    'up', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'once', 'few', 'no', 'nor', 'not'
  ]);

  // Clean and tokenize question
  const qWords = qLower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").split(/\s+/).filter(Boolean);
  
  // Exclude stopwords and short words
  qWords.forEach(w => {
    if (w.length >= 4 && !STOPWORDS.has(w)) {
      expectedConcepts.add(w);
    }
  });

  // Predefined concept mapping dictionary
  const CONCEPT_DICTIONARY: { [key: string]: string[] } = {
    api: ['endpoint', 'http', 'rest', 'json', 'request', 'response', 'status code', 'get', 'post', 'put', 'delete', 'header', 'auth', 'caching', 'rate limit', 'graphql'],
    rest: ['endpoint', 'http', 'rest', 'json', 'request', 'response', 'status code', 'get', 'post', 'put', 'delete', 'header', 'auth', 'caching', 'rate limit'],
    react: ['hook', 'state', 'props', 'effect', 'usestate', 'useeffect', 'usememo', 'usecallback', 'context', 'render', 'virtual dom', 'component', 'redux'],
    hook: ['react', 'hook', 'usestate', 'useeffect', 'usememo', 'usecallback', 'state', 'render'],
    database: ['sql', 'query', 'table', 'join', 'index', 'primary key', 'foreign key', 'schema', 'transaction', 'nosql', 'mongodb', 'postgresql', 'mysql', 'normalization'],
    sql: ['database', 'query', 'table', 'join', 'index', 'primary key', 'foreign key', 'schema', 'transaction', 'select', 'where', 'group by'],
    scale: ['load balancer', 'cache', 'redis', 'cdn', 'sharding', 'replication', 'microservices', 'queue', 'kafka', 'latency', 'throughput', 'scalability', 'horizontal', 'vertical'],
    scalable: ['load balancer', 'cache', 'redis', 'cdn', 'sharding', 'replication', 'microservices', 'queue', 'kafka', 'latency', 'throughput', 'scalability', 'horizontal', 'vertical'],
    design: ['architecture', 'tradeoff', 'scale', 'load balancer', 'cache', 'database', 'system', 'latency', 'throughput'],
    git: ['branch', 'merge', 'commit', 'pull', 'push', 'rebase', 'repository', 'conflict', 'vcs', 'version control'],
    docker: ['container', 'image', 'volume', 'compose', 'kubernetes', 'k8s', 'registry', 'port', 'expose'],
    kubernetes: ['pod', 'service', 'deployment', 'cluster', 'node', 'ingress', 'k8s', 'replica'],
    python: ['list', 'dict', 'class', 'decorator', 'generator', 'yield', 'self', 'module', 'pip', 'virtualenv', 'poetry'],
    javascript: ['promise', 'async', 'await', 'closure', 'prototype', 'event loop', 'callback', 'scope', 'const', 'let', 'es6'],
    security: ['auth', 'jwt', 'encryption', 'ssl', 'tls', 'oauth', 'token', 'cors', 'xss', 'csrf', 'hash', 'salt'],
    auth: ['jwt', 'oauth', 'token', 'login', 'session', 'cookie', 'permission', 'role', 'encryption'],
    testing: ['unit', 'integration', 'mock', 'jest', 'cypress', 'selenium', 'assert', 'coverage', 'test case', 'tdd'],
    project: ['situation', 'task', 'action', 'result', 'challenge', 'team', 'impact', 'resolved', 'communication', 'star'],
    challenge: ['situation', 'task', 'action', 'result', 'challenge', 'team', 'impact', 'resolved', 'communication', 'star'],
    conflict: ['situation', 'task', 'action', 'result', 'challenge', 'team', 'impact', 'resolved', 'communication', 'star', 'resolution', 'feedback'],
    lead: ['situation', 'task', 'action', 'result', 'team', 'impact', 'resolved', 'leadership', 'initiative', 'star'],
    leadership: ['situation', 'task', 'action', 'result', 'team', 'impact', 'resolved', 'leadership', 'initiative', 'star'],
  };

  // Add concepts from mapping dictionary if a keyword matches
  qWords.forEach(w => {
    if (CONCEPT_DICTIONARY[w]) {
      CONCEPT_DICTIONARY[w].forEach(c => expectedConcepts.add(c));
    }
  });

  // If behavioral or HR round, or question mentions typical behavioral triggers, add behavioral expectations
  const behavioralKeywords = ['tell me', 'conflict', 'challenge', 'difficult', 'mistake', 'failure', 'success', 'project', 'team', 'disagreement', 'leader', 'learned'];
  if (interviewType === 'behavioral' || interviewType === 'hr' || behavioralKeywords.some(kw => qLower.includes(kw))) {
    ['situation', 'task', 'action', 'result', 'impact', 'team', 'learned', 'resolved'].forEach(c => expectedConcepts.add(c));
  }

  // Fallback: If no concepts extracted, extract any words of length >= 3
  if (expectedConcepts.size === 0) {
    qWords.forEach(w => {
      if (w.length >= 3) expectedConcepts.add(w);
    });
  }

  // 2. Analyze user's answer for concepts
  const conceptList = Array.from(expectedConcepts);
  let matchedCount = 0;
  const matchedConcepts: string[] = [];

  conceptList.forEach(concept => {
    const isMatched = concept.includes(' ')
      ? ansLower.includes(concept)
      : new RegExp(`\\b${concept}\\b`, 'i').test(ansLower);

    if (isMatched) {
      matchedCount++;
      matchedConcepts.push(concept);
    }
  });

  // Calculate raw relevance
  let relevance = 0;
  if (conceptList.length > 0) {
    relevance = Math.round((matchedCount / Math.max(3, conceptList.length)) * 100);
    relevance = Math.min(100, relevance);
  } else {
    // If no concepts could be extracted at all (unlikely), default to base check
    relevance = wordCount >= 10 ? 80 : 40;
  }

  // Penalize relevance if word count is very low (e.g. < 8 words)
  if (wordCount < 8) {
    relevance = Math.min(15, relevance);
  }

  // 3. Weak Answer detection: if relevance < 35 or word count < 8
  const isWeak = relevance < 35 || wordCount < 8;
  const status = isWeak ? 'Weak' : (relevance >= 70 ? 'Strong' : 'Average');

  let reason = '';
  if (wordCount < 8) {
    reason = 'Answer is too short (under 8 words).';
  } else if (relevance < 35) {
    reason = 'Answer does not address the question topic.';
  }

  // 4. Calculate other metrics
  let technical = 0;
  if (relevance >= 20) {
    const TECH_JARGON = [
      'framework', 'library', 'database', 'backend', 'frontend', 'server', 'client', 'application', 'code',
      'function', 'class', 'object', 'variable', 'memory', 'performance', 'latency', 'bandwidth', 'optimize',
      'efficiency', 'concurrency', 'asynchronous', 'sync', 'thread', 'process', 'deploy', 'production', 'development',
      'test', 'debug', 'architecture', 'scalability', 'security', 'encryption', 'user', 'interface', 'data', 'json',
      'xml', 'query', 'indexing', 'cache', 'network', 'protocol', 'api', 'endpoint', 'dns', 'implementation',
      'algorithm', 'pattern', 'design', 'service', 'microservices', 'cloud', 'host', 'state', 'props'
    ];
    let techJargonMatches = 0;
    TECH_JARGON.forEach(word => {
      if (new RegExp(`\\b${word}\\b`, 'i').test(ansLower)) {
        techJargonMatches++;
      }
    });

    technical = Math.round(relevance * 0.7 + (techJargonMatches / Math.max(1, wordCount)) * 300);
    technical = Math.max(15, Math.min(99, technical));
  } else {
    technical = 0; // Heavy penalty if off-topic
  }

  // Communication score
  let communication = 0;
  if (wordCount >= 8) {
    const sentences = ansLower.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const avgSentenceLength = wordCount / Math.max(1, sentenceCount);

    const TRANSITION_WORDS = [
      'however', 'therefore', 'furthermore', 'additionally', 'consequently', 'specifically',
      'example', 'instance', 'because', 'since', 'although', 'overall', 'specifically', 'firstly', 'secondly'
    ];
    const STAR_WORDS = [
      'situation', 'task', 'action', 'result', 'role', 'project', 'challenge', 'team', 'metric', 'impact',
      'resolved', 'learned', 'solution', 'goal', 'deliver', 'manage', 'solve'
    ];

    let bonus = 0;
    TRANSITION_WORDS.forEach(word => {
      if (ansLower.includes(word)) bonus += 4;
    });
    STAR_WORDS.forEach(word => {
      if (ansLower.includes(word)) bonus += 4;
    });

    communication = 50 + bonus;
    if (sentenceCount >= 2) communication += 10;
    if (avgSentenceLength >= 8 && avgSentenceLength <= 22) communication += 10;

    // Penalty for too long sentences
    if (avgSentenceLength > 25) communication -= 10;

    communication = Math.max(15, Math.min(99, communication));
    if (relevance < 20) {
      communication = Math.min(20, communication);
    }
  } else {
    communication = 10;
  }

  // Clarity/Confidence score
  let clarity = 0;
  if (wordCount >= 8) {
    const HEDGING_WORDS = ['maybe', 'i think', 'i guess', 'not sure', 'probably', 'perhaps', 'might', 'sort of', 'kind of', 'i suppose'];
    let hedgeCount = 0;
    HEDGING_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      hedgeCount += (ansLower.match(regex) ?? []).length;
    });

    clarity = 75 - hedgeCount * 8 + Math.round(wordCount / 5);
    clarity = Math.max(15, Math.min(99, clarity));

    if (relevance < 20) {
      clarity = Math.min(10, clarity);
    }
  } else {
    clarity = 10;
  }

  return {
    relevance,
    technical,
    communication,
    clarity,
    status,
    reason: reason || undefined
  };
}

const SENIORITY = ['Beginner', 'Intermediate', 'Advanced'];

const ROLE_LABELS: Record<string, string> = {
  aiml: 'AI Engineer',
  fullstack: 'Full Stack Developer',
  devops: 'DevOps Engineer'
};

const INTERVIEW_TYPES: {
  id: InterviewType; label: string; icon: React.ReactNode;
  desc: string; color: string; tips: string[];
}[] = [
  {
    id: 'technical', label: 'Technical',
    icon: <BrainCircuit className="w-5 h-5" />,
    desc: 'DSA, coding problems, algorithms & data structures',
    color: 'from-violet-600 to-violet-400',
    tips: ['Think out loud — explain your reasoning', 'Clarify edge cases before coding', 'Discuss time & space complexity'],
  },
  {
    id: 'behavioral', label: 'Behavioral',
    icon: <MessageSquare className="w-5 h-5" />,
    desc: 'Situational questions using the STAR method',
    color: 'from-cyan-600 to-cyan-400',
    tips: ['Use STAR: Situation, Task, Action, Result', 'Be specific — use real examples', 'Quantify your impact where possible'],
  },
  {
    id: 'system-design', label: 'System Design',
    icon: <BarChart3 className="w-5 h-5" />,
    desc: 'Architecture, scalability & design tradeoffs',
    color: 'from-emerald-600 to-emerald-400',
    tips: ['Start with requirements & constraints', 'Draw the high-level architecture first', 'Discuss tradeoffs for each decision'],
  },
  {
    id: 'hr', label: 'HR Round',
    icon: <User className="w-5 h-5" />,
    desc: 'Culture fit, salary negotiation & soft skills',
    color: 'from-amber-600 to-amber-400',
    tips: ['Research the company thoroughly', 'Have salary expectations ready', 'Prepare thoughtful questions to ask'],
  },
];

const FILLER_WORDS = ['um', 'uh', 'like', 'basically', 'literally', 'actually', 'you know', 'kind of', 'sort of', 'i mean'];

/* ── Sub-components ── */
const ScoreGauge: React.FC<{ value: number; label: string; color: string; size?: number }> = ({
  value, label, color, size = 80,
}) => {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={6} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={6} strokeLinecap="round"
            stroke={color} strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (value / 100) * circ }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold text-[var(--text-primary)]">{value}</span>
        </div>
      </div>
      <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide uppercase">{label}</span>
    </div>
  );
};

const AnswerQualityBadge: React.FC<{
  quality: 'Strong' | 'Average' | 'Weak';
  relevance: number;
  reason?: string;
}> = ({ quality, relevance, reason }) => {
  const badgeConfig = {
    Strong: {
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400',
      label: 'Strong Answer',
    },
    Average: {
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-400',
      label: 'Average Answer',
    },
    Weak: {
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
      dot: 'bg-red-400',
      label: 'Weak Answer',
    },
  };

  const config = badgeConfig[quality];

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold", config.color)} title={reason}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      <span>{config.label} ({relevance}%)</span>
      {reason && (
        <span className="ml-1 text-[9px] opacity-80 cursor-help" title={reason}>
          ℹ️
        </span>
      )}
    </div>
  );
};

const WaveformBars: React.FC<{ active: boolean; color?: string }> = ({ active, color = '#7c5cfc' }) => (
  <div className="flex items-end gap-[3px] h-4">
    {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7].map((h, i) => (
      <motion.div
        key={i} className="w-[3px] rounded-full"
        style={{ height: '16px', transformOrigin: 'bottom', backgroundColor: color }}
        animate={active ? { scaleY: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.3] } : { scaleY: 0.15 }}
        transition={active ? { duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' } : { duration: 0.3 }}
      />
    ))}
  </div>
);

const StarMethodPanel: React.FC = () => (
  <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
    <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-3">STAR Coach</p>
    {[
      { letter: 'S', word: 'Situation', hint: 'Set the context briefly' },
      { letter: 'T', word: 'Task', hint: 'Your specific responsibility' },
      { letter: 'A', word: 'Action', hint: 'Steps you personally took' },
      { letter: 'R', word: 'Result', hint: 'Quantifiable outcome' },
    ].map(({ letter, word, hint }) => (
      <div key={letter} className="flex items-start gap-2.5 mb-2 last:mb-0">
        <div className="w-5 h-5 rounded flex items-center justify-center bg-cyan-500/20 flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-cyan-400">{letter}</span>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--text-secondary)]">{word}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{hint}</p>
        </div>
      </div>
    ))}
  </div>
);

/* ── Setup Phase ── */
const SetupPhase: React.FC<{
  role: string; setRole: (v: string) => void;
  seniority: string; setSeniority: (v: string) => void;
  interviewType: InterviewType; setInterviewType: (v: InterviewType) => void;
  onStart: () => void; loading: boolean;
}> = ({ role, setRole, seniority, setSeniority, interviewType, setInterviewType, onStart, loading }) => {
  const selectedType = INTERVIEW_TYPES.find(t => t.id === interviewType)!;
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHero
          icon={<Sparkles className="w-6 h-6 text-[var(--violet)]" />}
          title="AI Interview Studio"
          description="Voice input · Live transcription · AI feedback · Real-time scoring — all in one place."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <GlassCard>
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">Interview Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {INTERVIEW_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setInterviewType(type.id)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-32',
                      interviewType === type.id
                        ? 'bg-[var(--surface-card-hover)] border-[var(--violet)] shadow-[var(--glow-xs)]'
                        : 'bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)]'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={cn('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', type.color)}>
                        {type.icon}
                      </div>
                      {interviewType === type.id && <CheckCircle2 className="w-4 h-4 text-[var(--violet)]" />}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-[var(--text-primary)] block mt-2">{type.label}</span>
                      <p className="text-[11px] text-[var(--text-muted)] leading-normal line-clamp-2 mt-0.5">{type.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider">Your Target</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] mb-1.5 block font-semibold uppercase tracking-wider">Role</label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full appearance-none h-10 pr-8 pl-3 text-sm bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--violet)]/50 transition-colors cursor-pointer"
                    >
                      <option value="aiml" className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">AI Engineer</option>
                      <option value="fullstack" className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">Full Stack Developer</option>
                      <option value="devops" className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">DevOps Engineer</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] mb-1.5 block font-semibold uppercase tracking-wider">Seniority</label>
                  <div className="relative">
                    <select
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value)}
                      className="w-full appearance-none h-10 pr-8 pl-3 text-sm bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] outline-none focus:border-[var(--violet)]/50 transition-colors cursor-pointer"
                    >
                      {SENIORITY.map((s) => (
                        <option key={s} value={s} className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          <div className="space-y-6">
            <GlassCard className="h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                  <div className={cn('w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', selectedType.color)}>
                    {selectedType.icon}
                  </div>
                  <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{selectedType.label} Tips</p>
                </div>
                <div className="space-y-3">
                  {selectedType.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--violet)] flex-shrink-0 mt-1.5" />
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onStart}
                disabled={loading || !role.trim()}
                className={cn(
                  'w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all mt-6',
                  loading || !role.trim()
                    ? 'bg-[var(--surface-hover)] text-[var(--text-muted)] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] text-white hover:opacity-95 hover:scale-[1.01] shadow-[var(--glow-xs)]'
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Preparing Studio…
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    Start Interview
                  </>
                )}
              </button>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Results Phase ── */
const ResultsPhase: React.FC<{
  analytics: AnalyticsState; feedback: SessionFeedback[];
  questionCount: number; wordCount: number; fillerCount: FillerCount;
  role: string; interviewType: InterviewType; history: ExtendedMockInterviewTurn[];
  weakAnswerCount: number;
  report: MockInterviewReport | null;
  onReset: () => void;
}> = ({ analytics, feedback, questionCount, wordCount, fillerCount, role, interviewType, history, weakAnswerCount, report, onReset }) => {
  const overall = report ? report.overall_score : Math.round((analytics.confidence + analytics.technical + analytics.communication + analytics.clarity) / 4);
  const confidenceScore = report ? report.confidence_score : analytics.confidence;
  const technicalScore = report ? report.technical_score : analytics.technical;
  const communicationScore = report ? report.communication_score : analytics.communication;
  const clarityScore = report ? report.clarity_score : analytics.clarity;

  const topFiller = Object.entries(fillerCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const allStrengths = report ? report.strong_topics : feedback.flatMap(f => f.strengths).filter(Boolean).slice(0, 4);
  const allImprovements = report ? report.weak_topics : feedback.flatMap(f => f.improvements).filter(Boolean).slice(0, 4);
  const allTips = report ? report.suggestions : feedback.flatMap(f => f.tips).filter(Boolean).slice(0, 3);
  const scoreColor = overall >= 75 ? '#22c55e' : overall >= 50 ? '#f59e0b' : '#ef4444';
  const scoreLabel = overall >= 75 ? 'Excellent' : overall >= 50 ? 'Good' : 'Needs Work';

  const downloadReport = () => {
    const typeLabel = INTERVIEW_TYPES.find(t => t.id === interviewType)?.label ?? interviewType;
    const lines = [
      `INTERVIEW REPORT — ${ROLE_LABELS[role] || role} (${typeLabel})`,
      `Date: ${new Date().toLocaleDateString()}`,
      '─'.repeat(50),
      '',
      `OVERALL SCORE: ${overall}/100`,
      `  Confidence:    ${confidenceScore}/100`,
      `  Technical:     ${technicalScore}/100`,
      `  Communication: ${communicationScore}/100`,
      `  Clarity:       ${clarityScore}/100`,
      '',
      `STATISTICS:`,
      `  Questions Answered: ${questionCount}`,
      `  Total Words Spoken: ${wordCount}`,
      `  Weak Answers:       ${weakAnswerCount}${weakAnswerCount >= 3 ? ' (25-point penalty applied)' : ''}`,
      `  Top Filler Words:   ${topFiller.map(([w, c]) => `"${w}" (${c}x)`).join(', ') || 'None!'}`,
      '',
      ...(report ? [
        'AI RECOMMENDATION:',
        `  ${report.recommendation}`,
        '',
        'SUGGESTIONS FOR IMPROVEMENT:',
        ...report.suggestions.map(s => `  • ${s}`),
        '',
        'TOPICS COVERED:',
        ...report.topics_covered.map(t => `  • ${t}`),
        ''
      ] : []),
      ...(allStrengths.length > 0 ? ['STRENGTHS / STRONG AREAS:', ...allStrengths.map(s => `  • ${s}`), ''] : []),
      ...(allImprovements.length > 0 ? ['AREAS FOR IMPROVEMENT:', ...allImprovements.map(i => `  • ${i}`), ''] : []),
      'FULL TRANSCRIPT:',
      '─'.repeat(50),
      ...history.map(h => {
        const ext = h as ExtendedMockInterviewTurn;
        const badge = ext.quality ? ` [${ext.quality} Answer - Relevance ${ext.relevance}%]` : '';
        return `[${h.role === 'coach' ? 'INTERVIEWER' : 'YOU'}]${badge}: ${h.message}\n`;
      }),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHero
          icon={<Award className="w-6 h-6 text-[var(--violet)]" />}
          title="Interview Complete"
          description={`Overall Score: ${overall}% • ${scoreLabel} Performance`}
          extraActions={
            <div className="flex items-center gap-3">
              <button
                onClick={downloadReport}
                className="h-10 px-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Report
              </button>
              <button
                onClick={onReset}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[var(--glow-xs)]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Session
              </button>
            </div>
          }
        />

        {weakAnswerCount >= 3 && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center" style={{ borderColor: scoreColor }}>
            ⚠️ A global 25-point penalty has been applied because 3 or more answers were weak (off-topic or too short).
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<BrainCircuit className="w-4 h-4" />} label="Confidence" value={`${confidenceScore}%`} />
          <StatCard icon={<Zap className="w-4 h-4" />} label="Technical" value={`${technicalScore}%`} />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Communication" value={`${communicationScore}%`} />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Clarity" value={`${clarityScore}%`} />
        </div>

        {report && (
          <GlassCard className="relative overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-hover)]/40 p-6 rounded-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-[var(--violet)]" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-[var(--violet)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">AI Evaluation & Recommendation</h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              {report.recommendation}
            </p>
            {report.suggestions && report.suggestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">Personalized Improvement Suggestions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                      <div className="w-5 h-5 rounded-full bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="text-center py-4">
            <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Questions</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{questionCount}</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Difficulty Reached</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{report ? report.difficulty_reached : (overall >= 80 ? 'Hard' : 'Medium')}</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Topic Coverage</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{report ? `${report.question_coverage_pct}%` : '80%'}</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1">Weak Answers</p>
            <p className={cn("text-xl font-bold", weakAnswerCount >= 3 ? "text-[var(--error)]" : "text-[var(--text-primary)]")}>{weakAnswerCount}</p>
          </GlassCard>
        </div>

        {report && report.topics_covered && report.topics_covered.length > 0 && (
          <GlassCard className="p-5">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Syllabus Topics Covered
            </h3>
            <div className="flex flex-wrap gap-2">
              {report.topics_covered.map((t) => {
                const isWeak = report.weak_topics?.includes(t);
                const isStrong = report.strong_topics?.includes(t);
                const badgeColor = isStrong 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : isWeak 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                    : 'bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
                return (
                  <span key={t} className={cn("text-xs px-3 py-1.5 rounded-full border font-semibold flex items-center gap-1", badgeColor)}>
                    {isStrong && '✓ '}
                    {isWeak && '⚠️ '}
                    {t}
                  </span>
                );
              })}
            </div>
          </GlassCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Strong Areas</h3>
            </div>
            {allStrengths.length > 0 ? (
              <div className="space-y-3">
                {allStrengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">No specific strengths recorded.</p>
            )}
          </GlassCard>

          <GlassCard className="bg-amber-500/5 border-amber-500/10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Needs Improvement</h3>
            </div>
            {allImprovements.length > 0 ? (
              <div className="space-y-3">
                {allImprovements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{imp}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic">No critical areas of improvement detected.</p>
            )}
          </GlassCard>
        </div>

        {topFiller.length > 0 && (
          <GlassCard>
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Filler Word Tracker</h3>
            <div className="flex gap-3 flex-wrap">
              {topFiller.map(([word, count]) => (
                <div key={word} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                  <span className="text-xs text-[var(--text-secondary)]">"{word}"</span>
                  <span className="text-xs font-bold text-[var(--violet)]">{count}×</span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

/* ── Main Component ── */
const InterviewHubPage: React.FC = () => {
  const { token } = useUser();

  const storedRole = localStorage.getItem('apex_target_role') ?? '';
  const getInitialRole = () => {
    const clean = storedRole.toLowerCase();
    if (clean.includes('ai') || clean.includes('machine') || clean.includes('ml')) return 'aiml';
    if (clean.includes('devops') || clean.includes('infra') || clean.includes('site')) return 'devops';
    return 'fullstack';
  };
  const defaultRole = getInitialRole();

  const [phase, setPhase] = useState<Phase>('setup');
  const [role, setRole] = useState(defaultRole);
  const [seniority, setSeniority] = useState('Intermediate');
  const [interviewType, setInterviewType] = useState<InterviewType>('technical');
  const [history, setHistory] = useState<ExtendedMockInterviewTurn[]>([]);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [finalReport, setFinalReport] = useState<MockInterviewReport | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [weakAnswerCount, setWeakAnswerCount] = useState(0);

  const [voiceActive, setVoiceActive] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [analytics, setAnalytics] = useState<AnalyticsState>({ confidence: 50, technical: 50, communication: 50, clarity: 50 });
  const [feedbackHistory, setFeedbackHistory] = useState<SessionFeedback[]>([]);
  const [latestFeedback, setLatestFeedback] = useState<string[]>([]);
  const [latestTips, setLatestTips] = useState<string[]>([]);
  const [fillerCount, setFillerCount] = useState<FillerCount>({});

  /* Tab Switch Detection (Anti-cheat) */
  const MAX_TAB_SWITCHES = 5;
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
  const [interviewCancelled, setInterviewCancelled] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  /* Timer */
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  /* Tab Switch Detection */
  useEffect(() => {
    if (phase !== 'active' || interviewCancelled) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          if (next >= MAX_TAB_SWITCHES) {
            setInterviewCancelled(true);
            window.speechSynthesis?.cancel();
            setHistory(h => [...h, {
              role: 'coach',
              message: '🚫 Interview terminated. You have exceeded the maximum number of allowed tab switches. This session has been cancelled due to integrity violation.'
            }]);
          } else {
            setTabSwitchWarning(true);
            setTimeout(() => setTabSwitchWarning(false), 4000);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [phase, interviewCancelled]);

  /* Camera */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraEnabled(true); setCameraError(false);
    } catch {
      setCameraError(true); setCameraEnabled(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraEnabled(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  /* Voice Recognition */
  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR() as SpeechRecognition;
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    recognitionRef.current = rec;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      if (final) {
        setInput(prev => (prev + ' ' + final).trim());
        const lower = final.toLowerCase();
        FILLER_WORDS.forEach(fw => {
          const m = (lower.match(new RegExp(`\\b${fw.replace(' ', '\\s')}\\b`, 'g')) ?? []).length;
          if (m > 0) setFillerCount(prev => ({ ...prev, [fw]: (prev[fw] ?? 0) + m }));
        });
      }
      setLiveTranscript(interim);
    };
    rec.onend = () => { setVoiceActive(false); setLiveTranscript(''); };
    rec.onerror = () => { setVoiceActive(false); };
    rec.start();
    setVoiceActive(true);
  }, []);

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setVoiceActive(false); setLiveTranscript('');
  }, []);

  const toggleVoice = () => voiceActive ? stopVoice() : startVoice();

  /* AI Speech */
  const speakText = useCallback((text: string) => {
    if (!voiceOutputEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 1; utt.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      ?? voices.find(v => v.lang.startsWith('en')) ?? null;
    if (preferred) utt.voice = preferred;
    utt.onstart = () => setAiSpeaking(true);
    utt.onend = () => setAiSpeaking(false);
    utt.onerror = () => setAiSpeaking(false);
    window.speechSynthesis.speak(utt);
  }, [voiceOutputEnabled]);

  /* Analytics — uses real AI scores when available, local evaluation engine fallback otherwise */
  const updateAnalytics = useCallback((
    res: {
      feedback?: string; tips?: string[];
      strengths?: string[]; improvements?: string[];
      scores?: MockInterviewScores;
    },
    latestTurn?: ExtendedMockInterviewTurn,
    currentWeakCount?: number
  ) => {
    if (res.scores) {
      // Use real AI-returned scores directly
      setAnalytics({
        confidence: Math.max(10, Math.min(99, res.scores.confidence)),
        technical: Math.max(10, Math.min(99, res.scores.technical)),
        communication: Math.max(10, Math.min(99, res.scores.communication)),
        clarity: Math.max(10, Math.min(99, res.scores.clarity)),
      });
    } else {
      // Local evaluation engine scoring fallback
      // Compute the running average of all candidate turns' local scores
      const turnsInState = history.filter(t => t.role === 'candidate') as ExtendedMockInterviewTurn[];
      const allCandidateTurns = [...turnsInState];
      if (latestTurn && !allCandidateTurns.some(t => t.message === latestTurn.message)) {
        allCandidateTurns.push(latestTurn);
      }

      if (allCandidateTurns.length > 0) {
        let sumConfidence = 0;
        let sumTechnical = 0;
        let sumComm = 0;
        let sumClarity = 0;

        allCandidateTurns.forEach(turn => {
          if (turn.scores) {
            sumConfidence += turn.scores.confidence;
            sumTechnical += turn.scores.technical;
            sumComm += turn.scores.communication;
            sumClarity += turn.scores.clarity;
          }
        });

        const avgConfidence = sumConfidence / allCandidateTurns.length;
        const avgTechnical = sumTechnical / allCandidateTurns.length;
        const avgComm = sumComm / allCandidateTurns.length;
        const avgClarity = sumClarity / allCandidateTurns.length;

        // Apply penalty if weak answer count >= 3
        const weakCount = currentWeakCount !== undefined ? currentWeakCount : weakAnswerCount;
        const penalty = weakCount >= 3 ? 25 : 0;

        setAnalytics({
          confidence: Math.max(10, Math.min(99, Math.round(avgConfidence - penalty))),
          technical: Math.max(10, Math.min(99, Math.round(avgTechnical - penalty))),
          communication: Math.max(10, Math.min(99, Math.round(avgComm - penalty))),
          clarity: Math.max(10, Math.min(99, Math.round(avgClarity - penalty))),
        });
      }
    }

    const strengths = res.strengths ?? (res.feedback ? [res.feedback.split('.')[0]?.trim()].filter(Boolean) : []);
    const improvements = res.improvements ?? (res.feedback ? [res.feedback.split('.').at(-2)?.trim()].filter(Boolean) : []);

    if (res.feedback) {
      setFeedbackHistory(prev => [...prev, {
        feedback: res.feedback!,
        tips: res.tips ?? [],
        strengths: strengths as string[],
        improvements: improvements as string[],
      }]);
      setLatestFeedback(prev => [res.feedback!, ...prev].slice(0, 3));
    } else if (latestTurn && latestTurn.reason) {
      // Local feedback fallback when backend feedback is empty
      const localFeedback = `Relevance was low (${latestTurn.relevance}%). ${latestTurn.reason}`;
      setFeedbackHistory(prev => [...prev, {
        feedback: localFeedback,
        tips: ['Try to use specific technical terminology related to the question.', 'Refer to the expected concepts shown in the tips section.'],
        strengths: [],
        improvements: [latestTurn.reason!],
      }]);
      setLatestFeedback(prev => [localFeedback, ...prev].slice(0, 3));
    }

    if (res.tips?.length) {
      setLatestTips(res.tips.slice(0, 3));
    } else if (latestTurn && latestTurn.quality === 'Weak') {
      setLatestTips(['Focus on answering the question directly.', 'Avoid unrelated topics or simple filler answers.']);
    }
  }, [history, weakAnswerCount]);

  /* Start session */
  const startSession = useCallback(async () => {
    setSending(true);
    setFinalReport(null);
    setInterviewId(null);
    try {
      const typeLabel = INTERVIEW_TYPES.find(t => t.id === interviewType)?.label ?? 'Technical';
      const displayRole = ROLE_LABELS[role] || role;
      const backendSkill = interviewType === 'technical' ? role : interviewType;
      const res = await careerApi.continueMockInterview(
        { role: `${displayRole} — ${typeLabel} Interview`, seniority, history: [], skills: [backendSkill] },
        token ?? undefined
      );
      if (res.interview_id) {
        setInterviewId(res.interview_id);
      }
      const question = res.question ?? res.prompt ?? `Welcome! Let's begin your ${typeLabel} interview for ${displayRole}. Tell me about yourself.`;
      setHistory([{ role: 'coach', message: question }]);
      setQuestionCount(1);
      setPhase('active');
      speakText(question);
    } catch {
      const typeLabel = INTERVIEW_TYPES.find(t => t.id === interviewType)?.label ?? 'Technical';
      const displayRole = ROLE_LABELS[role] || role;
      const fallback = `Welcome to your ${seniority} ${displayRole} ${typeLabel} interview. Let's start — tell me about a challenging project you've worked on recently.`;
      setHistory([{ role: 'coach', message: fallback }]);
      setQuestionCount(1);
      setPhase('active');
      speakText(fallback);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [role, seniority, interviewType, token, speakText]);

  /* Send answer */
  const sendAnswer = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    stopVoice();
    const words = text.split(/\s+/).filter(Boolean).length;
    setWordCount(prev => prev + words);
    const lower = text.toLowerCase();
    FILLER_WORDS.forEach(fw => {
      const m = (lower.match(new RegExp(`\\b${fw.replace(' ', '\\s')}\\b`, 'g')) ?? []).length;
      if (m > 0) setFillerCount(prev => ({ ...prev, [fw]: (prev[fw] ?? 0) + m }));
    });

    const lastCoachTurn = [...history].reverse().find(h => h.role === 'coach');
    const questionText = lastCoachTurn ? lastCoachTurn.message : '';
    const localResult = evaluateAnswer(questionText, text, interviewType);

    const userTurn: ExtendedMockInterviewTurn = {
      role: 'candidate',
      message: text,
      quality: localResult.status,
      relevance: localResult.relevance,
      reason: localResult.reason,
      scores: {
        confidence: localResult.clarity,
        technical: localResult.technical,
        communication: localResult.communication,
        clarity: localResult.clarity
      }
    };

    let newWeakCount = weakAnswerCount;
    if (localResult.status === 'Weak') {
      newWeakCount = weakAnswerCount + 1;
      setWeakAnswerCount(newWeakCount);
    }

    setHistory(prev => [...prev, userTurn]);
    setInput('');
    setSending(true);
    try {
      const typeLabel = INTERVIEW_TYPES.find(t => t.id === interviewType)?.label ?? 'Technical';
      const displayRole = ROLE_LABELS[role] || role;
      const backendSkill = interviewType === 'technical' ? role : interviewType;
      const res = await careerApi.continueMockInterview(
        { 
          role: `${displayRole} — ${typeLabel} Interview`, 
          seniority, 
          history: [...history, userTurn], 
          skills: [backendSkill],
          interview_id: interviewId ?? undefined
        },
        token ?? undefined
      );
      if (res.interview_id) {
        setInterviewId(res.interview_id);
      }
      if (res.done) {
        setSessionDone(true);
        if (res.report) {
          setFinalReport(res.report);
        }
        if (res.closing) {
          setHistory(prev => [...prev, { role: 'coach', message: res.closing! }]);
          speakText(res.closing!);
        }
      } else {
        const next = res.question ?? res.follow_up ?? res.prompt ?? 'Good answer. Can you walk me through a specific example?';
        const chatMessage = res.chat_message ?? (res.feedback ? `${res.feedback}\n\n${next}` : next);
        setHistory(prev => [...prev, { role: 'coach', message: chatMessage }]);
        setQuestionCount(n => n + 1);
        speakText(chatMessage);
      }
      updateAnalytics(res, userTurn, newWeakCount);
    } catch {
      const fallback = "Let's continue — can you elaborate on that with a concrete example?";
      setHistory(prev => [...prev, { role: 'coach', message: fallback }]);
      speakText(fallback);
      updateAnalytics({}, userTurn, newWeakCount);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, sending, history, role, seniority, interviewType, token, stopVoice, speakText, updateAnalytics, weakAnswerCount, interviewId]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendAnswer(); }
  };

  const resetSession = () => {
    window.speechSynthesis?.cancel();
    stopVoice(); stopCamera();
    setPhase('setup'); setHistory([]); setInput('');
    setSessionDone(false); setQuestionCount(0); setWordCount(0); setElapsed(0);
    setWeakAnswerCount(0);
    setInterviewId(null);
    setFinalReport(null);
    setAnalytics({ confidence: 50, technical: 50, communication: 50, clarity: 50 });
    setFeedbackHistory([]); setLatestFeedback([]); setLatestTips([]); setFillerCount({});
    setTabSwitchCount(0); setTabSwitchWarning(false); setInterviewCancelled(false);
  };

  const overall = Math.round(
    (analytics.confidence + analytics.technical + analytics.communication + analytics.clarity) / 4
  );

  if (phase === 'active') {
    return (
      <div className="h-[calc(100vh-4rem)] bg-[var(--bg)] flex flex-col overflow-hidden relative">
        {/* Tab Switch Warning Overlay */}
        <AnimatePresence>
          {tabSwitchWarning && !interviewCancelled && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
                className="max-w-md mx-4 p-6 rounded-2xl border border-red-500/40 bg-[var(--surface)]/95 backdrop-blur-xl shadow-2xl shadow-red-500/20 text-center"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/15 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-red-400 mb-2">⚠️ Tab Switch Detected!</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  Switching tabs during a live interview is not allowed. This is tracked to maintain interview integrity.
                </p>
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  {Array.from({ length: MAX_TAB_SWITCHES }).map((_, i) => (
                    i < MAX_TAB_SWITCHES - tabSwitchCount ? (
                      <CheckCircle2 key={i} className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <XCircle key={i} className="w-5 h-5 text-red-500 fill-red-500/10" />
                    )
                  ))}
                </div>
                <p className="text-xs text-red-400/80 font-medium">
                  {MAX_TAB_SWITCHES - tabSwitchCount} {MAX_TAB_SWITCHES - tabSwitchCount === 1 ? 'life' : 'lives'} remaining — interview ends at 0
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interview Cancelled Overlay */}
        <AnimatePresence>
          {interviewCancelled && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }}
                className="max-w-lg mx-4 p-8 rounded-2xl border border-red-500/50 bg-[var(--surface)] shadow-2xl shadow-red-500/30 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-red-400 mb-2">Interview Cancelled</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-6">
                  Your interview session has been terminated due to excessive tab switching ({MAX_TAB_SWITCHES} violations detected).
                  This is considered an integrity violation in a live interview environment.
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={resetSession}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Start New Interview
                  </button>
                  <Link to="/career"
                    className="px-5 py-2.5 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] transition-colors">
                    Back to Career
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="h-8 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs flex items-center gap-1.5 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />Back
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">AI Interview Studio</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-hover)]">
              {INTERVIEW_TYPES.find(t => t.id === interviewType)?.label} · {seniority} {ROLE_LABELS[role] || role}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{formatTime(elapsed)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <motion.div className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <span className="text-xs text-red-400 font-medium">LIVE</span>
            </div>
            {/* Tab Switch Lives */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-hover)]" title={`${MAX_TAB_SWITCHES - tabSwitchCount} lives remaining — switching tabs costs a life`}>
              {Array.from({ length: MAX_TAB_SWITCHES }).map((_, i) => (
                i < MAX_TAB_SWITCHES - tabSwitchCount ? (
                  <CheckCircle2 key={i} className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" />
                ) : (
                  <XCircle key={i} className="w-3.5 h-3.5 text-red-500 fill-red-500/10" />
                )
              ))}
            </div>
            <button onClick={() => { setVoiceOutputEnabled(v => !v); window.speechSynthesis?.cancel(); }}
              className="h-7 w-7 rounded-lg border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title={voiceOutputEnabled ? 'Mute AI' : 'Unmute AI'}>
              {voiceOutputEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => cameraEnabled ? stopCamera() : startCamera()}
              className={cn('h-7 w-7 rounded-lg border flex items-center justify-center transition-colors',
                cameraEnabled ? 'border-[var(--violet)]/40 bg-[var(--violet)]/10 text-[var(--violet)]' : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]')}>
              {cameraEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
            </button>
            <span className="text-xs text-[var(--text-muted)]">{questionCount} Q · {overall} pts</span>
            <button onClick={() => setPhase('results')}
              className="h-7 px-3 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs flex items-center gap-1.5 hover:bg-violet-500/20 transition-colors">
              <Award className="w-3 h-3" />End & Score
            </button>
            <button onClick={resetSession}
              className="h-7 px-3 rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs flex items-center gap-1.5 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />Reset
            </button>
          </div>
        </div>

        {/* Active Phase Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Chat panel */}
          <div className="flex-1 flex flex-col border-r border-[var(--border-subtle)] min-w-0">
            {/* Camera + AI waveform strip */}
            <AnimatePresence>
              {(cameraEnabled || aiSpeaking) && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface-hover)] overflow-hidden">
                  {cameraEnabled && (
                    <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-[var(--border-subtle)] flex-shrink-0">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                      <div className="absolute top-1 left-1 flex items-center gap-1 bg-black/60 rounded px-1 py-0.5">
                        <motion.div className="w-1.5 h-1.5 rounded-full bg-red-500"
                          animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                        <span className="text-[8px] text-red-400 font-bold">REC</span>
                      </div>
                    </div>
                  )}
                  {aiSpeaking && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                        <BrainCircuit className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--text-muted)] mb-1">AI Interviewer Speaking…</p>
                        <WaveformBars active={aiSpeaking} color="#7c5cfc" />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!cameraEnabled && <video ref={videoRef} className="hidden" autoPlay muted playsInline />}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {history.map((turn, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={cn('flex gap-3', turn.role === 'candidate' ? 'flex-row-reverse' : 'flex-row')}>
                  <div className={cn('h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                    turn.role === 'coach'
                      ? 'bg-gradient-to-br from-violet-600 to-cyan-500'
                      : 'bg-[var(--surface-hover)] border border-[var(--border-subtle)]')}>
                    {turn.role === 'coach' ? <BrainCircuit className="w-3.5 h-3.5 text-white" /> : <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />}
                  </div>
                  <div className="flex flex-col gap-1 max-w-[78%]">
                    <div className={cn('px-4 py-2.5 rounded-2xl text-sm leading-relaxed w-full',
                      turn.role === 'coach'
                        ? 'bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-sm'
                        : 'bg-[var(--violet)]/10 border border-[var(--violet)]/20 text-[var(--violet-dim)] rounded-tr-sm')}>
                      {turn.message}
                    </div>
                    {turn.role === 'candidate' && turn.quality && (
                      <div className="flex justify-end mt-0.5">
                        <AnswerQualityBadge
                          quality={turn.quality}
                          relevance={turn.relevance ?? 0}
                          reason={turn.reason}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <BrainCircuit className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center gap-1.5">
                    {[0, 1, 2].map(j => (
                      <motion.div key={j} className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            {!sessionDone ? (
              <div className="p-4 border-t border-[var(--border-subtle)] space-y-2 flex-shrink-0 bg-[var(--surface-card)]">
                <AnimatePresence>
                  {liveTranscript && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="px-3 py-2 rounded-lg bg-violet-500/8 border border-violet-500/15 text-xs text-violet-300 italic flex items-center gap-2 overflow-hidden">
                      <WaveformBars active color="#7c5cfc" />
                      <span className="truncate">{liveTranscript}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex gap-2 items-end">
                  <button onClick={toggleVoice}
                    className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-200',
                      voiceActive
                        ? 'bg-red-500/15 border-red-500/40 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.20)]'
                        : 'bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border)]')}
                    title={voiceActive ? 'Stop voice' : 'Start voice input'}>
                    {voiceActive
                      ? <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><MicOff className="w-4 h-4" /></motion.div>
                      : <Mic className="w-4 h-4" />}
                  </button>
                  <textarea ref={inputRef}
                    className="flex-1 min-h-[40px] max-h-32 px-4 py-2.5 text-sm bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--violet)]/40 resize-none transition-colors"
                    placeholder={voiceActive ? 'Listening… speak or type here' : 'Type your answer or tap mic to speak (Enter to send)'}
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey} disabled={sending || interviewCancelled} />
                  <button onClick={() => void sendAnswer()} disabled={sending || !input.trim() || interviewCancelled}
                    className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                      input.trim() && !sending
                        ? 'bg-gradient-to-br from-[var(--violet)] to-[var(--cyan)] text-white hover:shadow-[0_0_15px_rgba(124,92,252,0.35)]'
                        : 'bg-[var(--surface-hover)] text-[var(--text-muted)] cursor-not-allowed')}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-[var(--border-subtle)] flex-shrink-0 text-center bg-[var(--surface-card)]">
                <p className="text-xs text-[var(--text-muted)] mb-3">Interview session complete</p>
                <button onClick={() => setPhase('results')}
                  className="h-9 px-5 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] text-white text-sm font-semibold inline-flex items-center gap-2">
                  <Award className="w-3.5 h-3.5" />View Full Report
                </button>
              </div>
            )}
          </div>

          {/* Analytics Sidebar */}
          <div className="w-72 bg-[var(--surface-card)] border-l border-[var(--border-subtle)] flex flex-col overflow-y-auto flex-shrink-0">
            <div className="px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]">
              <p className="text-[11px] font-semibold text-[var(--text-primary)] uppercase tracking-wider">Live Analytics</p>
            </div>
            <div className="p-4 space-y-5 overflow-y-auto">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/5 border border-violet-500/20 text-center">
                <p className="text-3xl font-bold text-[var(--text-primary)] mb-0.5">{overall}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Overall Score</p>
                <div className="mt-2 h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)]"
                    animate={{ width: `${overall}%` }} transition={{ duration: 1 }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ScoreGauge value={analytics.confidence} label="Confidence" color="#7c5cfc" size={72} />
                <ScoreGauge value={analytics.technical} label="Technical" color="#00d4ff" size={72} />
                <ScoreGauge value={analytics.communication} label="Comm." color="#22c55e" size={72} />
                <ScoreGauge value={analytics.clarity} label="Clarity" color="#f59e0b" size={72} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-center">
                  <p className="text-base font-bold text-[var(--text-primary)]">{questionCount}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Questions</p>
                </div>
                <div className="p-2.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-center">
                  <p className="text-base font-bold text-[var(--text-primary)]">{wordCount}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Words</p>
                </div>
              </div>

              {weakAnswerCount > 0 && (
                <div className={cn("p-3 rounded-lg border text-center transition-all duration-200", 
                  weakAnswerCount >= 3 
                    ? "bg-red-500/10 border-red-500/20 text-red-400" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                )}>
                  <p className="text-sm font-bold">{weakAnswerCount}</p>
                  <p className="text-[10px] uppercase tracking-wider font-semibold">Weak Answers</p>
                  {weakAnswerCount >= 3 && (
                    <p className="text-[9px] mt-1 opacity-90 font-medium">⚠️ -25 Point Penalty Applied</p>
                  )}
                </div>
              )}

              {Object.keys(fillerCount).length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Filler Words</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(fillerCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word, count]) => (
                      <div key={word} className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        <span className="text-[10px] text-[var(--text-muted)]">"{word}"</span>
                        <span className="text-[10px] font-bold text-amber-400">{count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {latestFeedback.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="w-3 h-3 text-violet-400" />
                    <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">AI Feedback</p>
                  </div>
                  <AnimatePresence>
                    {latestFeedback.slice(0, 2).map((f, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                        className="mb-2 p-2.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {f.length > 120 ? f.slice(0, 120) + '…' : f}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {latestTips.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3 h-3 text-cyan-400" />
                    <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Tips</p>
                  </div>
                  {latestTips.map((t, i) => (
                    <div key={i} className="flex items-start gap-1.5 mb-2">
                      <div className="w-1 h-1 rounded-full bg-cyan-500 flex-shrink-0 mt-1.5" />
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{t}</p>
                    </div>
                  ))}
                </div>
              )}

              {interviewType === 'behavioral' && <StarMethodPanel />}

              {latestFeedback.length === 0 && latestTips.length === 0 && (
                <EmptyState
                  icon={<BarChart3 className="w-5 h-5" />}
                  title="No feedback yet"
                  description="Analytics update live as you answer questions."
                />
              )}

              {cameraError && (
                <div className="p-3 rounded-lg bg-red-500/8 border border-red-500/20 text-[11px] text-red-400">
                  Camera access denied. Check browser permissions.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppPageLayout>
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="h-8 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Back
          </Link>
          <span className="text-sm font-semibold text-[var(--text-primary)]">AI Interview Studio</span>
          {phase === 'results' && (
            <span className="text-xs text-[var(--text-muted)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-hover)]">
              {INTERVIEW_TYPES.find(t => t.id === interviewType)?.label} · {seniority} {ROLE_LABELS[role] || role}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <SetupPhase
              role={role} setRole={setRole}
              seniority={seniority} setSeniority={setSeniority}
              interviewType={interviewType} setInterviewType={setInterviewType}
              onStart={() => void startSession()} loading={sending} />
          </motion.div>
        )}

        {phase === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ResultsPhase
              analytics={analytics} feedback={feedbackHistory}
              questionCount={questionCount} wordCount={wordCount} fillerCount={fillerCount}
              role={role} interviewType={interviewType} history={history}
              weakAnswerCount={weakAnswerCount} report={finalReport} onReset={resetSession} />
          </motion.div>
        )}
      </AnimatePresence>
    </AppPageLayout>
  );
};

export default InterviewHubPage;
