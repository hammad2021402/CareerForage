import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle,
  Clock,
  Code,
  FileText,
  HelpCircle,
  Link2,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
  Video,
  XCircle,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import AIChat from '../course/AIChat';
import AICodeReview from '../course/AICodeReview';
import { useUser } from '../../context/UserContext';
import { useGamification } from '../../hooks/useGamification';
import {
  codeApi,
  gamificationApi,
  learningApi,
  type CodeExecutionResult,
  type CodeExecutionTestPayload,
} from '../../services/api';

/* ── Groq + YouTube API helpers ──────────────────── */
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;

async function fetchYouTubeVideo(query: string): Promise<{ videoId: string; embedUrl: string } | null> {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' tutorial programming')}&type=video&maxResults=5&order=relevance&videoDuration=medium&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    const videoId = item.id.videoId as string;
    return { videoId, embedUrl: `https://www.youtube.com/embed/${videoId}` };
  } catch {
    return null;
  }
}

/**
 * Extract the assistant text from a Groq Responses-API reply.
 * openai/gpt-oss-20b returns a Responses-API envelope ({ output: [...] })
 * even when called via /v1/chat/completions.  This helper handles both
 * formats so nothing silently falls through to the static hardcoded content.
 */
function extractGroqText(data: Record<string, unknown>): string {
  // Responses API: output[] with a 'message' entry containing 'output_text' content
  const output = data.output as Array<{ type: string; content?: Array<{ type: string; text?: string }> }> | undefined;
  if (Array.isArray(output)) {
    const msgBlock = output.find((o) => o.type === 'message');
    const text = msgBlock?.content?.find((c) => c.type === 'output_text')?.text;
    if (text) return text;
  }
  // Top-level output_text shorthand
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  // Standard Chat Completions fallback
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content ?? '';
}

async function generateLessonWithGroq(topic: string, description: string, level: string): Promise<typeof lessonContent | null> {
  if (!GROQ_API_KEY) return null;
  const systemPrompt = `You are an expert coding tutor. Generate a detailed interactive lesson in JSON format. 
Return ONLY valid JSON, no markdown, no explanation, no backticks. The JSON must match this exact TypeScript structure:
{
  "title": string,
  "moduleTitle": string,
  "xpReward": number,
  "watch": {
    "url": "",
    "duration": string,
    "transcript": [{"timestamp": string, "line": string}],
    "resources": [{"label": string, "href": string}]
  },
  "read": {
    "sections": [{
      "id": string,
      "title": string,
      "paragraphs": [string],
      "codeSample": string | null,
      "callout": string | null
    }],
    "relatedConcepts": [{"title": string, "description": string, "resource": string}]
  },
  "practice": {
    "instructions": string,
    "starterCode": string,
    "solution": string,
    "languages": [{"id": "javascript", "label": "JavaScript", "runtime": "Node 18 + Jest", "monacoLanguage": "javascript"}],
    "tests": [{"id": string, "description": string, "hint": string, "input": string, "expected_output": string}]
  }
}`;

  const userPrompt = `Generate a lesson for: "${topic}"
Description: ${description}
Level: ${level}

Requirements:
- 3-4 read sections with real code examples relevant to ${topic}
- 4-5 transcript entries for the watch section (the video will be fetched separately)
- 2-3 related concepts
- A practice exercise with starter code, solution, and 4 test cases
- XP reward between 150-400 based on difficulty
- All code examples must be in JavaScript/TypeScript and directly related to ${topic}`;

  try {
    // openai/gpt-oss-20b is called via /v1/chat/completions but returns a
    // Responses-API envelope ({ output:[...] }) — extractGroqText() handles both.
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error (Lesson):', res.status, errorText);
      return null;
    }

    const data = await res.json();
    let text: string = extractGroqText(data);

    // 1. Strip out any reasoning traces (e.g., <think>...</think>)
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Safely extract JSON from markdown if the model wrapped it
    // Using hex \x60 for backticks to prevent UI/Markdown parsing issues
    const blockPattern = new RegExp('\\x60\\x60\\x60(?:json)?\\s*([\\s\\S]*?)\\s*\\x60\\x60\\x60', 'i');
    const jsonMatch = text.match(blockPattern);
    const cleaned = jsonMatch ? jsonMatch[1].trim() : text.replace(new RegExp('\\x60\\x60\\x60(?:json)?', 'gi'), '').trim();

    // Robust JSON extraction: find the outermost { ... } block
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error('Groq generation: no JSON object found in response', cleaned.slice(0, 200));
      return null;
    }
    const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonStr) as typeof lessonContent;
    return parsed;
  } catch (err) {
    console.error('Groq generation failed:', err);
    return null;
  }
}

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

async function generateQuizWithGroq(
  title: string,
  sections: { title: string; paragraphs: string[] }[],
): Promise<QuizQuestion[] | null> {
  if (!GROQ_API_KEY) return null;
  const lessonSummary = sections
    .map((s) => `${s.title}: ${s.paragraphs.slice(0, 2).join(' ')}`)
    .join('\n');

  const systemPrompt = `You are a quiz generator for coding lessons. Generate exactly 5 multiple-choice questions.
Return ONLY valid JSON with no markdown, no backticks, no explanation.
Format: {"questions": [{"question": string, "options": [string, string, string, string], "correctIndex": number (0-3), "explanation": string}]}`;

  const userPrompt = `Create a quiz for this lesson: "${title}"\n\nLesson content:\n${lessonSummary}\n\nMake questions that test understanding, not just recall. Vary difficulty.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error (Quiz):', res.status, errorText);
      return null;
    }

    const data = await res.json();
    let text: string = extractGroqText(data);

    // 1. Strip out any reasoning traces
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // 2. Extract JSON safely
    const blockPattern = new RegExp('\\x60\\x60\\x60(?:json)?\\s*([\\s\\S]*?)\\s*\\x60\\x60\\x60', 'i');
    const jsonMatch = text.match(blockPattern);
    const cleaned = jsonMatch ? jsonMatch[1].trim() : text.replace(new RegExp('\\x60\\x60\\x60(?:json)?', 'gi'), '').trim();

    // Robust JSON extraction: find the outermost { ... } block
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error('Quiz generation: no JSON object found in response', cleaned.slice(0, 200));
      return null;
    }
    const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(jsonStr) as { questions: QuizQuestion[] };
    return parsed.questions ?? null;
  } catch (err) {
    console.error('Quiz generation failed:', err);
    return null;
  }
}

type LearningMode = 'read' | 'watch' | 'practice' | 'quiz';
type WatchTab = 'transcript' | 'notes';

type LessonSection = {
  id: string;
  title: string;
  paragraphs: string[];
  codeSample?: string;
  callout?: string;
};

type RelatedConcept = {
  title: string;
  description: string;
  resource?: string;
};

type PracticeLanguage = {
  id: string;
  label: string;
  runtime: string;
  monacoLanguage: string;
};

type PracticeTest = CodeExecutionTestPayload & {
  hint: string;
};

const lessonContent = {
  title: 'State Management with Hooks',
  moduleTitle: 'React & Redux Path',
  xpReward: 250,
  watch: {
    url: 'https://www.youtube.com/embed/O6P86uwfdR0',
    duration: '15:30',
    transcript: [
      { timestamp: '00:05', line: 'Welcome! In this lesson we explore stateful React components.' },
      { timestamp: '02:14', line: 'useState gives us a state variable and a setter.' },
      { timestamp: '06:40', line: 'Demonstration: building a counter with incremental updates.' },
      { timestamp: '09:55', line: 'Avoid mutating state directly - always call the setter.' },
      { timestamp: '12:10', line: 'Preview: coordinating effects with useEffect.' },
    ],
    resources: [
      { label: 'Lesson Slides', href: '#' },
      { label: 'Official useState Docs', href: 'https://react.dev/reference/react/useState' },
      { label: 'Sample Counter Project', href: '#' },
    ],
  },
  read: {
    sections: [
      {
        id: 'intro',
        title: 'Why Hooks Changed State Management',
        paragraphs: [
          'Hooks let us manage component state without converting to class components. They unlock powerful composition patterns by keeping stateful logic close to the UI it impacts.',
          'Before hooks, sharing stateful logic meant higher-order components or render props. Hooks give us primitives such as useState, useReducer, and useEffect to express intent directly.',
        ],
        callout:
          'Hooks embrace functional programming ideas - prefer pure functions, derive state from props when possible, and keep side effects explicit.',
      },
      {
        id: 'use-state',
        title: 'Getting Comfortable with useState',
        paragraphs: [
          'useState returns a state value paired with a setter. The setter schedules a re-render with the new value. You can pass either the new value or a function that receives the previous value.',
          'State updates are batched inside event handlers, so multiple setCount calls will consolidate into a single render cycle.',
        ],
        codeSample: `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount((prev) => prev + 1)}>Increment</button>
    </div>
  );
}

export default Counter;`,
      },
      {
        id: 'use-effect',
        title: 'Synchronising Side Effects with useEffect',
        paragraphs: [
          'useEffect runs after the component paint. It is perfect for data fetching, subscriptions, or manual DOM manipulations. The dependency array controls when it re-runs.',
          'Remember to clean up subscriptions by returning a function from your effect. React will call it before the effect runs again and when the component unmounts.',
        ],
        codeSample: `import { useEffect, useState } from 'react';

function TimezoneClock({ timezone }: { timezone: string }) {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return <p>{time.toLocaleTimeString('en-US', { timeZone: timezone })}</p>;
}

export default TimezoneClock;`,
      },
      {
        id: 'best-practices',
        title: 'Patterns And Best Practices',
        paragraphs: [
          'Keep state minimal - derive what you can during render. Prefer multiple useState calls over a single object when the data updates independently.',
          'Lift state up to the nearest shared ancestor instead of duplicating it. When state transitions get complex, reach for useReducer.',
        ],
      },
    ] satisfies LessonSection[],
    relatedConcepts: [
      {
        title: 'Context API',
        description: 'Use context to pass state deeply without prop drilling. Combine with custom hooks for ergonomics.',
        resource: 'https://react.dev/reference/react/useContext',
      },
      {
        title: 'useReducer',
        description: 'Model multi-step state transitions with reducers. Perfect for forms, wizards, and complex workflows.',
        resource: 'https://react.dev/reference/react/useReducer',
      },
      {
        title: 'Memoization Strategies',
        description: 'useMemo and useCallback ensure expensive computations only re-run when needed.',
        resource: 'https://react.dev/reference/react/useMemo',
      },
    ] satisfies RelatedConcept[],
  },
  practice: {
    instructions:
      'Build a Counter component that responds to increment and decrement actions. Ensure the decrement button is disabled when the count is zero and expose a reset action. When you are ready, run the automated test suite (powered by Judge0).',
    starterCode: `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <h2>Counter Component</h2>
      <p>Count: {count}</p>
      <div className="actions">
        <button onClick={() => setCount(count + 1)}>Increment</button>
        <button onClick={() => setCount(count - 1)}>Decrement</button>
        <button>Reset</button>
      </div>
    </div>
  );
}

export default Counter;`,
    solution: `import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => setCount((prev) => prev + 1);
  const decrement = () => setCount((prev) => Math.max(0, prev - 1));
  const reset = () => setCount(0);

  return (
    <div className="counter space-y-3">
      <h2>Counter Component</h2>
      <p>Count: {count}</p>
      <div className="actions flex gap-2">
        <button onClick={increment}>Increment</button>
        <button onClick={decrement} disabled={count === 0}>Decrement</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}

export default Counter;`,
    languages: [
      { id: 'javascript', label: 'JavaScript', runtime: 'Node 18 + Jest', monacoLanguage: 'javascript' },
      { id: 'typescript', label: 'TypeScript', runtime: 'TS 5 / Node 18', monacoLanguage: 'typescript' },
    ] satisfies PracticeLanguage[],
    tests: [
      {
        id: 'initial-render',
        description: 'Initial render shows Count: 0',
        hint: 'Remember to set the initial state.',
        input: 'render',
        expected_output: 'Count: 0',
      },
      {
        id: 'increment-behaviour',
        description: 'Increment button increases the count',
        hint: 'Invoke setCount with previous value plus one.',
        input: 'click increment',
        expected_output: 'Count: 1',
      },
      {
        id: 'decrement-floor',
        description: 'Decrement button never drops below zero',
        hint: 'Guard against negative values before updating state.',
        input: 'click decrement three times',
        expected_output: 'Count: 0',
      },
      {
        id: 'reset-action',
        description: 'Reset button returns the counter to 0',
        hint: 'Reset should work regardless of the current value.',
        input: 'set count 7 then press reset',
        expected_output: 'Count: 0',
      },
    ] satisfies PracticeTest[],
  },
};

const FALLBACK_QUIZ: QuizQuestion[] = [
  {
    question: 'What is the primary purpose of state in a React component?',
    options: [
      'To style the component',
      'To store values that cause re-renders when changed',
      'To define the component structure',
      'To communicate with the server',
    ],
    correctIndex: 1,
    explanation: 'State holds values that, when updated via a setter, schedule a re-render with the new value.',
  },
  {
    question: 'Which hook runs a side effect after every render by default?',
    options: ['useState', 'useRef', 'useEffect', 'useCallback'],
    correctIndex: 2,
    explanation: 'useEffect without a dependency array runs after every render — add an array to control when it fires.',
  },
  {
    question: 'How do you prevent useEffect from running on every render?',
    options: [
      'Pass null as the second argument',
      'Wrap it in useCallback',
      'Provide a dependency array',
      'Call it inside an if-statement',
    ],
    correctIndex: 2,
    explanation: 'The dependency array tells React to re-run the effect only when listed values change.',
  },
  {
    question: 'What does useState return?',
    options: [
      'The current state only',
      'A setter function only',
      'A tuple of [currentState, setterFn]',
      'An object with get and set methods',
    ],
    correctIndex: 2,
    explanation: 'useState returns a two-element array: the current state value and a setter function.',
  },
  {
    question: 'When is useReducer preferred over multiple useState calls?',
    options: [
      'When the component is purely presentational',
      'When state transitions are complex and interdependent',
      'When you need to fetch data from an API',
      'When you want to avoid re-renders entirely',
    ],
    correctIndex: 1,
    explanation: 'useReducer shines when multiple state values update together or when transitions follow explicit action types.',
  },
];

/* ── Derive a topic from the stored roadmap or target role ── */
function deriveDefaultTopic(): { topic: string; description: string; level: string } {
  // 1. Try to pull the first recommended node from the cached roadmap
  try {
    const raw = localStorage.getItem('apex_roadmap_state');
    if (raw) {
      const parsed = JSON.parse(raw) as { nodes?: Array<{ data?: { label?: string; description?: string; level?: string; status?: string } }> };
      const recommended = parsed.nodes?.find((n) => n.data?.status === 'recommended' || n.data?.status === 'in_progress');
      if (recommended?.data?.label) {
        return {
          topic: recommended.data.label,
          description: recommended.data.description ?? '',
          level: recommended.data.level ?? 'intermediate',
        };
      }
      // fallback to first node
      const first = parsed.nodes?.[0];
      if (first?.data?.label) {
        return { topic: first.data.label, description: first.data.description ?? '', level: first.data.level ?? 'beginner' };
      }
    }
  } catch { /* ignore */ }

  // 2. Fallback: build topic from target role
  const role = localStorage.getItem('apex_target_role') ?? '';
  if (role) {
    const label = role.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { topic: `Core Fundamentals of ${label}`, description: `Essential skills and concepts every ${label} needs to know`, level: 'beginner' };
  }

  // 3. Last resort hardcoded default
  return { topic: 'JavaScript ES6+ Essentials', description: 'Modern JavaScript features every developer must know', level: 'beginner' };
}

export default function LessonInterface() {
  const location = useLocation();
  const routeState = location.state as { topic?: string; description?: string; level?: string } | null;
  const topicFromRoute = routeState?.topic;

  // Always generate — from route state if available, else derive from roadmap/role
  const derived = topicFromRoute ? null : deriveDefaultTopic();
  const effectiveTopic = topicFromRoute ?? derived!.topic;
  const effectiveDescription = routeState?.description ?? derived?.description ?? '';
  const effectiveLevel = routeState?.level ?? derived?.level ?? 'intermediate';

  const [isGenerating, setIsGenerating] = useState(true);
  const [generatingStep, setGeneratingStep] = useState<'lesson' | 'video' | 'done'>('lesson');
  const [dynamicContent, setDynamicContent] = useState<typeof lessonContent | null>(null);
  const [dynamicVideoUrl, setDynamicVideoUrl] = useState<string | null>(null);

  // Warn in dev if keys are missing
  useEffect(() => {
    if (!GROQ_API_KEY) console.warn('[LessonInterface] VITE_GROQ_API_KEY is not set — falling back to static content.');
    if (!YOUTUBE_API_KEY) console.warn('[LessonInterface] VITE_YOUTUBE_API_KEY is not set — video will use static fallback.');
  }, []);

  // content = dynamically generated content (if available), else static fallback
  const content = dynamicContent ?? lessonContent;
  const watchUrl = dynamicVideoUrl ?? lessonContent.watch.url;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsGenerating(true);
      setGeneratingStep('lesson');

      // 1. Generate lesson content via Groq
      const generated = await generateLessonWithGroq(
        effectiveTopic,
        effectiveDescription,
        effectiveLevel,
      );
      if (!cancelled && generated) {
        setDynamicContent(generated);
      }

      // 2. Fetch best YouTube video
      setGeneratingStep('video');
      const yt = await fetchYouTubeVideo(effectiveTopic);
      if (!cancelled && yt) {
        setDynamicVideoUrl(yt.embedUrl);
      }

      if (!cancelled) {
        setGeneratingStep('done');
        setIsGenerating(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTopic]);

  const [mode, setMode] = useState<LearningMode>('read');
  const [watchTab, setWatchTab] = useState<WatchTab>('transcript');
  const [notes, setNotes] = useState(() => localStorage.getItem(`lesson_notes_${effectiveTopic}`) ?? '');
  const [panePercent, setPanePercent] = useState(42);
  const [editorHeightPercent, setEditorHeightPercent] = useState(65);
  const [language, setLanguage] = useState<PracticeLanguage>(lessonContent.practice.languages[0]);

  // Sync language to whichever content is active (static → dynamic)
  useEffect(() => {
    if (content.practice.languages?.[0]) {
      setLanguage(content.practice.languages[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.practice.languages]);
  const [code, setCode] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<CodeExecutionResult[] | null>(null);
  const [activeSection, setActiveSection] = useState<string>(() => content.read.sections[0]?.id ?? 'intro');

  // Reset active section when sections change (dynamic content load)
  useEffect(() => {
    const firstId = content.read.sections[0]?.id ?? 'intro';
    setActiveSection(firstId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.read.sections]);
  const { token, refreshProfile } = useUser();
  const { refreshStatus } = useGamification({ autoFetch: false });

  /* ── Lesson Completion ────────────────────────── */
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleCompleteLesson = useCallback(async () => {
    if (!token) { toast.error('Sign in to save your progress.'); return; }
    if (isCompleted || isCompleting) return;
    setIsCompleting(true);
    try {
      // 1. Call learningApi to save progress in database and award XP
      const res = await learningApi.completeLesson(effectiveTopic, token, code || undefined);
      
      // 2. Update roadmap state in localStorage
      try {
        const raw = localStorage.getItem('apex_roadmap_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          const nodes = parsed.nodes || [];
          const edges = parsed.edges || [];
          
          // Find the node matching the effectiveTopic
          const targetNode = nodes.find((n: any) => n.data?.label === effectiveTopic);
          if (targetNode) {
            const nodeId = targetNode.id;
            const updatedNodes = nodes.map((n: any) => {
              if (n.id === nodeId) {
                return { ...n, data: { ...n.data, status: 'mastered', completedAt: new Date().toISOString() } };
              }
              // Unlock dependent nodes
              if (edges.find((e: any) => e.source === nodeId && e.target === n.id) && n.data?.status === 'locked') {
                return { ...n, data: { ...n.data, status: 'recommended' } };
              }
              return n;
            });
            
            localStorage.setItem('apex_roadmap_state', JSON.stringify({ ...parsed, nodes: updatedNodes }));
          }
        }
      } catch (err) {
        console.error('Failed to update roadmap in localStorage:', err);
      }
      
      setIsCompleted(true);
      
      // 3. Trigger UI Sync by dispatching event, refreshing profile and status
      window.dispatchEvent(new Event('gamification_updated'));
      await Promise.all([refreshProfile(), refreshStatus()]);
      
      // 4. Show toast
      const msg = res.leveled_up
        ? `+${res.xp_earned} XP & Level Up to ${res.level}! 🎉`
        : `+${res.xp_earned} XP earned! Great work 🚀`;
      toast.success(msg);
    } catch (err) {
      console.error(err);
      toast.error('Could not save progress. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  }, [token, isCompleted, isCompleting, effectiveTopic, code, refreshProfile, refreshStatus]);

  /* ── Quiz State ───────────────────────────────── */
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{ selected: number; correct: number }[]>([]);
  const [quizComplete, setQuizComplete] = useState(false);
  const [quizXpClaimed, setQuizXpClaimed] = useState(false);

  const loadQuiz = useCallback(async () => {
    if (quizQuestions || quizLoading) return;
    setQuizLoading(true);
    const questions = await generateQuizWithGroq(content.title, content.read.sections);
    setQuizQuestions(questions ?? FALLBACK_QUIZ);
    setQuizLoading(false);
  }, [quizQuestions, quizLoading, content.title, content.read.sections]);

  const handleOptionSelect = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
  };

  const handleNextQuestion = () => {
    if (selectedOption === null) return;
    const current = quizQuestions![quizIndex];
    setQuizAnswers((prev) => [...prev, { selected: selectedOption, correct: current.correctIndex }]);
    if (quizIndex + 1 >= (quizQuestions?.length ?? 0)) {
      setQuizComplete(true);
    } else {
      setQuizIndex((i) => i + 1);
      setSelectedOption(null);
    }
  };

  const handleQuizReset = () => {
    setQuizIndex(0);
    setSelectedOption(null);
    setQuizAnswers([]);
    setQuizComplete(false);
    setQuizXpClaimed(false);
    setQuizQuestions(null);
  };

  const handleClaimQuizXp = useCallback(async () => {
    if (!token || quizXpClaimed) return;
    const correct = quizAnswers.filter((a) => a.selected === a.correct).length;
    const total = quizAnswers.length;
    const xpEarned = Math.round((correct / total) * 80);
    if (xpEarned <= 0) { toast.error('Answer at least one question correctly to earn XP!'); return; }
    try {
      await gamificationApi.awardXp({ amount: xpEarned, reason: `Quiz: ${content.title}` }, token);
      setQuizXpClaimed(true);
      toast.success(`✅ +${xpEarned} XP successfully added`);
      window.dispatchEvent(new Event('gamification_updated'));
      await Promise.all([refreshProfile(), refreshStatus()]);
    } catch {
      toast.error('Could not claim quiz XP. Try again.');
    }
  }, [token, quizAnswers, quizXpClaimed, content.title, refreshProfile, refreshStatus]);

  // Sync starter code whenever content changes (dynamic or static). No !code guard —
  // the guard was preventing the dynamic starter code from ever loading.
  useEffect(() => {
    if (content.practice.starterCode) {
      setCode(content.practice.starterCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.practice.starterCode]);

  // Reset quiz state whenever dynamic content arrives so it generates for the new topic.
  useEffect(() => {
    if (dynamicContent) {
      setQuizQuestions(null);
      setQuizComplete(false);
      setQuizIndex(0);
      setQuizAnswers([]);
      setQuizXpClaimed(false);
      setSelectedOption(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicContent]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(`lesson_notes_${effectiveTopic}`, notes);
  }, [notes, effectiveTopic]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0.25, 0.5] },
    );

    const elements = content.read.sections
      .map((section) => sectionRefs.current[section.id])
      .filter((element): element is HTMLElement => Boolean(element));

    elements.forEach((element) => observer.observe(element));

    return () => {
      elements.forEach((element) => observer.unobserve(element));
      observer.disconnect();
    };
  }, [content.read.sections]);

  const startDrag = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const offset = moveEvent.clientX - rect.left;
      const percentage = Math.min(Math.max((offset / rect.width) * 100, 26), 68);
      setPanePercent(percentage);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    event.preventDefault();
  }, []);

  const startVerticalDrag = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!rightPaneRef.current) {
      return;
    }

    const rect = rightPaneRef.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const offset = moveEvent.clientY - rect.top;
      const percentage = Math.min(Math.max((offset / rect.height) * 100, 25), 85);
      setEditorHeightPercent(percentage);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    event.preventDefault();
  }, []);

  const runSummary = useMemo(() => {
    if (!testResults) {
      return null;
    }

    const passed = testResults.filter((result) => result.status === 'passed').length;
    const failed = testResults.filter((result) => result.status !== 'passed').length;

    return {
      total: testResults.length,
      passed,
      failed,
    };
  }, [testResults]);

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Add some code before running the tests.');
      return;
    }

    setIsRunning(true);
    setRunError(null);
    setTestResults(null);

    try {
      const response = await codeApi.runSnippet({
        language: language.id,
        code,
        test_cases: content.practice.tests.map(({ hint, ...test }) => test),
      });

      setTestResults(response.results);
      toast.success('Tests finished running.');
    } catch (error) {
      console.error('Run code failed', error);
      setRunError(error instanceof Error ? error.message : 'Unable to execute code.');
      toast.error('Unable to execute code.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = content.practice.languages.find((item) => item.id === event.target.value);
    if (next) {
      setLanguage(next);
    }
  };

  const modes: Array<{ id: LearningMode; label: string; icon: typeof FileText }> = [
    { id: 'read', label: 'Read', icon: FileText },
    { id: 'watch', label: 'Watch', icon: Video },
    { id: 'practice', label: 'Practice', icon: Code },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  ];

  const handleModeChange = (id: LearningMode) => {
    setMode(id);
    if (id === 'quiz') void loadQuiz();
  };

  /* ── Loading screen while Groq + YouTube generate ── */
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl border border-violet-500/30 bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-violet-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
              Generating Lesson
            </h2>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
              AI is crafting a personalised lesson for <span className="text-violet-300 font-semibold">{effectiveTopic}</span>
            </p>
          </div>
          <div className="w-full space-y-3">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${generatingStep === 'lesson'
                ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                : 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-muted)]'
              }`}>
              {generatingStep === 'lesson'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Check className="w-4 h-4 text-green-400" />
              }
              <span className="text-sm font-medium">Generating lesson content with Groq</span>
            </div>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${generatingStep === 'video'
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                : generatingStep === 'done'
                  ? 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-muted)]'
                  : 'border-[var(--border-subtle)]/50 bg-transparent text-[var(--text-muted)]/70'
              }`}>
              {generatingStep === 'video'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : generatingStep === 'done'
                  ? <Check className="w-4 h-4 text-green-400" />
                  : <Video className="w-4 h-4 opacity-40" />
              }
              <span className="text-sm font-medium">Finding best YouTube video</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col">
      <header className="bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] sticky top-0 z-30 h-14 flex items-center">
        <div className="w-full px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/study-materials"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2 rounded-full hover:bg-[var(--surface-hover)]"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <p className="text-sm text-[var(--text-muted)] font-medium">Part of the "{content.moduleTitle}"</p>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">{content.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="text-sm text-[var(--text-secondary)] font-medium">Reward:</div>
                <div className="text-violet-400 font-bold bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-lg text-sm">
                  +{content.xpReward} XP
                </div>
              </div>
              <button
                onClick={() => void handleCompleteLesson()}
                disabled={isCompleting || isCompleted}
                className={`h-10 px-5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 group transition-all ${isCompleted
                    ? 'bg-green-600/20 border border-green-500/40 text-green-400 cursor-default'
                    : 'btn-primary'
                  }`}
              >
                {isCompleting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>Saving…</span></>
                ) : isCompleted ? (
                  <><CheckCircle className="w-5 h-5" /><span>Completed!</span></>
                ) : (
                  <><Check className="w-5 h-5 group-hover:scale-125 transition-transform" /><span>Complete Lesson</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-grow container mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex border-b border-[var(--border-subtle)] overflow-x-auto">
            {modes.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleModeChange(item.id)}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all text-sm whitespace-nowrap ${mode === item.id ? 'text-[var(--text-primary)] border-b-2 border-[var(--violet)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.id === 'quiz' && !quizLoading && !quizComplete && (
                    <span className="ml-1 text-[10px] bg-violet-500/20 border border-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full">AI</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <main>
          <AnimatePresence mode="wait">
            {mode === 'watch' && (
              <motion.div
                key="watch"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full space-y-8"
              >
                <div className="aspect-video bg-[var(--surface-card)] rounded-2xl overflow-hidden shadow-2xl shadow-black/10 border border-[var(--border-subtle)]">
                  <iframe
                    className="w-full h-full"
                    src={watchUrl}
                    title="Lesson Video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
                  <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl">
                    <div className="flex items-center gap-4 border-b border-[var(--border-subtle)] px-6 py-3">
                      <button
                        onClick={() => setWatchTab('transcript')}
                        className={`text-sm font-semibold transition-colors ${watchTab === 'transcript' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                      >
                        Transcript
                      </button>
                      <button
                        onClick={() => setWatchTab('notes')}
                        className={`text-sm font-semibold transition-colors ${watchTab === 'notes' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                      >
                        Notes
                      </button>
                    </div>

                    {watchTab === 'transcript' ? (
                      <div className="max-h-72 overflow-y-auto px-6 py-4 space-y-3 text-sm text-[var(--text-secondary)]">
                        {content.watch.transcript.map((entry) => (
                          <div key={entry.timestamp} className="flex gap-3">
                            <span className="text-violet-400 font-mono text-xs mt-0.5">{entry.timestamp}</span>
                            <p>{entry.line}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-6 py-4 space-y-4">
                        <div className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                          <Pencil className="w-4 h-4" />
                          These notes are saved locally in your browser.
                        </div>
                        <textarea
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder="Capture key takeaways, questions, or follow-up tasks..."
                          className="input-apex min-h-[180px] resize-none"
                        />
                      </div>
                    )}
                  </div>

                  <aside className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl px-6 py-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Play className="w-5 h-5 text-violet-400" />
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Resources</h3>
                    </div>
                    <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                      {content.watch.resources.map((resource) => (
                        <li key={resource.label} className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-violet-400" />
                          <a
                            href={resource.href}
                            className="hover:text-[var(--text-primary)] transition-colors"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {resource.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </aside>
                </div>
              </motion.div>
            )}

            {mode === 'read' && (
              <motion.div
                key="read"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-[220px_minmax(0,1fr)_260px] gap-8"
              >
                <nav className="sticky top-28 h-fit bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-4 space-y-3 text-sm">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">On this page</p>
                  {content.read.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        sectionRefs.current[section.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`text-left transition-colors ${activeSection === section.id ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>

                <article className="space-y-12">
                  {content.read.sections.map((section) => (
                    <section
                      key={section.id}
                      id={section.id}
                      ref={(element) => {
                        sectionRefs.current[section.id] = element;
                      }}
                      className="scroll-mt-28"
                    >
                      <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-4">{section.title}</h2>
                      <div className="space-y-4 text-base leading-relaxed text-[var(--text-secondary)]">
                        {section.paragraphs.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                      {section.callout && (
                        <div className="mt-6 p-4 rounded-xl border border-violet-500/30 bg-violet-500/10 text-sm text-violet-300">
                          <Sparkles className="w-4 h-4 inline mr-2" />
                          {section.callout}
                        </div>
                      )}
                      {section.codeSample && (
                        <pre className="mt-6 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] overflow-x-auto">
                          <code className="block p-4 text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre">
                            {section.codeSample}
                          </code>
                        </pre>
                      )}
                    </section>
                  ))}
                </article>

                <aside className="space-y-4 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-5 h-fit">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                    <BookOpen className="w-5 h-5 text-violet-400" />
                    Related Concepts
                  </h3>
                  <ul className="space-y-4 text-sm text-[var(--text-secondary)]">
                    {content.read.relatedConcepts.map((concept) => (
                      <li key={concept.title} className="border border-[var(--border-subtle)] rounded-xl p-4">
                        <p className="font-semibold text-[var(--text-primary)] mb-1">{concept.title}</p>
                        <p className="text-[var(--text-muted)] mb-2">{concept.description}</p>
                        {concept.resource && (
                          <a
                            href={concept.resource}
                            target="_blank"
                            rel="noreferrer"
                            className="text-violet-400 hover:text-white text-xs transition-colors"
                          >
                            View resource
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </aside>
              </motion.div>
            )}

            {mode === 'practice' && (
              <motion.div
                key="practice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full"
              >
                <div className="flex-grow flex gap-4 h-full" ref={containerRef}>
                  {/* Left Pane: Instructions */}
                  <div style={{ width: `${panePercent}%` }} className="flex flex-col gap-4">
                    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-6 flex-grow flex flex-col">
                      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Instructions</h2>
                      <div className="prose prose-invert prose-sm max-w-none flex-grow overflow-y-auto pr-2">
                        <p className="text-[var(--text-secondary)]">{content.practice.instructions}</p>
                      </div>
                    </div>
                    <AIChat />
                    <AICodeReview code={code} language={language.label} />
                  </div>

                  {/* Resizer */}
                  <div
                    onMouseDown={startDrag}
                    className="w-1.5 cursor-col-resize bg-[var(--border-subtle)] hover:bg-[var(--violet)]/60 transition-colors rounded-full"
                  />

                  {/* Right Pane: Editor & Output */}
                  <div
                    style={{ width: `${100 - panePercent}%` }}
                    className="flex flex-col"
                    ref={rightPaneRef}
                  >
                    {/* Top: Editor */}
                    <div
                      style={{ height: `${editorHeightPercent}%` }}
                      className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl flex-grow flex flex-col"
                    >
                      <div className="flex items-center justify-between p-3 border-b border-[var(--border-subtle)]">
                        <select
                          value={language.id}
                          onChange={handleLanguageChange}
                          className="bg-transparent border-0 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
                        >
                          {content.practice.languages.map((lang) => (
                            <option key={lang.id} value={lang.id} className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">
                              {lang.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setShowSolution(!showSolution)}
                          className="h-8 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] transition-colors text-sm font-medium"
                        >
                          {showSolution ? 'Hide' : 'Show'} Solution
                        </button>
                      </div>
                      <div className="flex-grow relative">
                        <Editor
                          height="100%"
                          language={language.monacoLanguage}
                          theme="vs-dark"
                          value={showSolution ? content.practice.solution : code}
                          onChange={(value) => !showSolution && setCode(value ?? '')}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            readOnly: showSolution,
                          }}
                          className="absolute top-0 left-0 w-full h-full"
                        />
                      </div>
                      <div className="p-3 border-t border-[var(--border-subtle)] flex justify-end">
                        <button
                          onClick={handleRunCode}
                          disabled={isRunning}
                          className="btn-primary text-sm flex items-center gap-2"
                        >
                          {isRunning ? (
                            <>
                              <Clock className="w-4 h-4 animate-spin" />
                              <span>Running...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Run Tests</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Vertical Resizer */}
                    <div
                      onMouseDown={startVerticalDrag}
                      className="h-1.5 cursor-row-resize bg-[var(--border-subtle)] hover:bg-[var(--violet)]/60 transition-colors rounded-full my-2"
                    />

                    {/* Bottom: Output */}
                    <div
                      style={{ height: `${100 - editorHeightPercent}%` }}
                      className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl flex-grow flex flex-col"
                    >
                      <div className="flex items-center justify-between p-3 border-b border-[var(--border-subtle)]">
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Test Results</h3>
                        {runSummary && (
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <span>{runSummary.passed} Passed</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-red-400">
                              <XCircle className="w-4 h-4" />
                              <span>{runSummary.failed} Failed</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-grow p-4 overflow-y-auto">
                        {isRunning && (
                          <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                            <p>Executing tests...</p>
                          </div>
                        )}
                        {runError && (
                          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400">
                            <div className="flex items-center gap-2 font-bold mb-2">
                              <AlertTriangle className="w-5 h-5" />
                              Execution Error
                            </div>
                            <pre className="text-xs whitespace-pre-wrap">{runError}</pre>
                          </div>
                        )}
                        {testResults && (
                          <div className="space-y-3">
                            {testResults.map((result, index) => {
                              const testCase = content.practice.tests[index];
                              const isPassed = result.status === 'passed';
                              const output = result.stdout || result.stderr;
                              return (
                                <div
                                  key={testCase.id}
                                  className={`p-3 rounded-lg border ${isPassed
                                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                                    }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-semibold">
                                      {isPassed ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                      )}
                                      <span>{testCase.description}</span>
                                    </div>
                                    <span className="text-xs font-mono text-[var(--text-muted)]">
                                      {result.time?.toFixed(2)}s
                                    </span>
                                  </div>
                                  {!isPassed && output && (
                                    <div className="mt-2 pt-2 border-t border-red-500/20">
                                      <pre className="text-xs text-red-500 dark:text-red-300 bg-[var(--surface-hover)] p-2 rounded">
                                        {output}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!isRunning && !runError && !testResults && (
                          <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                            <p>Click "Run Tests" to see the output.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {mode === 'quiz' && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto"
              >
                {/* Loading */}
                {quizLoading && (
                  <div className="flex flex-col items-center gap-4 py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl border border-violet-500/30 bg-violet-500/10 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-violet-400 animate-pulse" />
                    </div>
                    <p className="text-[var(--text-primary)] font-semibold text-lg">Generating Your Quiz…</p>
                    <p className="text-[var(--text-secondary)] text-sm">AI is crafting questions tailored to this lesson.</p>
                  </div>
                )}

                {/* Quiz in progress */}
                {!quizLoading && quizQuestions && !quizComplete && (
                  <div className="space-y-6">
                    {/* Progress bar */}
                    <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] mb-1">
                      <span>Question {quizIndex + 1} of {quizQuestions.length}</span>
                      <span>{quizAnswers.filter((a) => a.selected === a.correct).length} correct so far</span>
                    </div>
                    <div className="h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                        animate={{ width: `${((quizIndex) / quizQuestions.length) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>

                    {/* Question card */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={quizIndex}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-6 space-y-5"
                      >
                        <p className="text-[var(--text-primary)] text-lg font-semibold leading-snug">
                          {quizQuestions[quizIndex].question}
                        </p>

                        <div className="space-y-3">
                          {quizQuestions[quizIndex].options.map((option, i) => {
                            const isSelected = selectedOption === i;
                            const isCorrect = i === quizQuestions[quizIndex].correctIndex;
                            const revealed = selectedOption !== null;
                            let cls = 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:border-[var(--violet)]/40 hover:bg-[var(--violet)]/5';
                            if (revealed && isSelected && isCorrect) cls = 'border-green-500/60 bg-green-500/10 text-green-700 dark:text-green-300';
                            else if (revealed && isSelected && !isCorrect) cls = 'border-red-500/60 bg-red-500/10 text-red-700 dark:text-red-300';
                            else if (revealed && isCorrect) cls = 'border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400';
                            else if (revealed) cls = 'border-[var(--border-subtle)]/50 bg-transparent text-[var(--text-muted)] cursor-default';
                            return (
                              <button
                                key={i}
                                onClick={() => handleOptionSelect(i)}
                                disabled={revealed}
                                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${cls}`}
                              >
                                <span className="opacity-50 mr-2">{String.fromCharCode(65 + i)}.</span>
                                {option}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {selectedOption !== null && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded-xl border text-sm leading-relaxed ${selectedOption === quizQuestions[quizIndex].correctIndex
                                ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-200'
                                : 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-200'
                              }`}
                          >
                            <span className="font-semibold mr-1">
                              {selectedOption === quizQuestions[quizIndex].correctIndex ? '✓ Correct! ' : '✗ Not quite. '}
                            </span>
                            {quizQuestions[quizIndex].explanation}
                          </motion.div>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex justify-end">
                      <button
                        onClick={handleNextQuestion}
                        disabled={selectedOption === null}
                        className="btn-primary h-10 px-6 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {quizIndex + 1 >= quizQuestions.length ? 'Finish Quiz' : 'Next Question'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Quiz complete / results */}
                {!quizLoading && quizComplete && (
                  <div className="space-y-6">
                    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-8 text-center space-y-4">
                      {(() => {
                        const correct = quizAnswers.filter((a) => a.selected === a.correct).length;
                        const total = quizAnswers.length;
                        const pct = Math.round((correct / total) * 100);
                        const xpEarned = Math.round((correct / total) * 80);
                        return (
                          <>
                            <div className={`text-5xl font-bold ${pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {pct}%
                            </div>
                            <p className="text-[var(--text-primary)] text-xl font-semibold">
                              {pct >= 80 ? '🎉 Excellent work!' : pct >= 50 ? '👍 Good effort!' : '📚 Keep studying!'}
                            </p>
                            <p className="text-[var(--text-secondary)] text-sm">
                              {correct} of {total} correct · Up to <span className="text-violet-400 font-semibold">+{xpEarned} XP</span> available
                            </p>

                            <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                              {quizAnswers.map((a, i) => (
                                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${a.selected === a.correct ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300' : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                                  }`}>
                                  {a.selected === a.correct
                                    ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    : <XCircle className="w-4 h-4 flex-shrink-0" />}
                                  <span>Q{i + 1}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-2">
                              {!quizXpClaimed && xpEarned > 0 && (
                                <button
                                  onClick={() => void handleClaimQuizXp()}
                                  className="btn-primary h-10 px-5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  Claim +{xpEarned} XP
                                </button>
                              )}
                              {quizXpClaimed && (
                                <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                                  <CheckCircle className="w-4 h-4" /> XP Claimed!
                                </div>
                              )}
                              <button
                                onClick={handleQuizReset}
                                className="h-10 px-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] transition-colors inline-flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" /> Retake Quiz
                              </button>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}