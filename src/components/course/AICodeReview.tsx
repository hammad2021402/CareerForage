import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Check, AlertTriangle, Info, Lightbulb, TrendingUp, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;

interface CodeFeedback {
  type: 'success' | 'warning' | 'info' | 'tip' | 'error';
  message: string;
  suggestion?: string;
}

interface AICodeReviewProps {
  code: string;
  language: string;
  onClose?: () => void;
}

async function callGroqForReview(code: string, language: string): Promise<{
  feedback: CodeFeedback[];
  overall_score: number;
  best_practices: string[];
  suggestions: string[];
  explanation: string;
} | null> {
  if (!GROQ_API_KEY || code.trim().length < 10) return null;

  const prompt = `You are an expert code reviewer. Review this ${language} code and respond ONLY with valid JSON, no markdown, no backticks.

JSON structure:
{
  "overall_score": number (0-100),
  "best_practices": [string],
  "feedback": [{"type": "success"|"warning"|"info"|"tip"|"error", "message": string, "suggestion": string|null}],
  "suggestions": [string],
  "explanation": string
}

Code to review:
\`\`\`${language}
${code}
\`\`\``;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are an expert code reviewer. Return ONLY valid JSON, no markdown, no backticks.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function callGroqForExplanation(code: string, language: string): Promise<string> {
  if (!GROQ_API_KEY || code.trim().length < 10) {
    return `This ${language} code appears to be well-structured.`;
  }

  const prompt = `Explain what this ${language} code does in 2-4 clear sentences for a learner. Be concise and practical.\n\n\`\`\`${language}\n${code}\n\`\`\``;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: 'You are a helpful coding tutor. Explain code clearly and concisely.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      }),
    });
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    return text || `This ${language} code is well-structured.`;
  } catch {
    return `This ${language} code appears to be well-structured.`;
  }
}

export default function AICodeReview({ code, language }: AICodeReviewProps) {
  const [feedback, setFeedback] = useState<CodeFeedback[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [bestPractices, setBestPractices] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const lastAnalyzedCode = useRef('');

  useEffect(() => {
    if (code === lastAnalyzedCode.current) return;

    const handler = setTimeout(async () => {
      if (!code || code.trim().length < 10) {
        setFeedback([]);
        setOverallScore(null);
        setBestPractices([]);
        setSuggestions([]);
        return;
      }

      setIsAnalyzing(true);
      lastAnalyzedCode.current = code;

      const result = await callGroqForReview(code, language);

      if (result) {
        setFeedback(result.feedback ?? []);
        setOverallScore(result.overall_score ?? null);
        setBestPractices(result.best_practices ?? []);
        setSuggestions(result.suggestions ?? []);
        if (result.explanation) setExplanation(result.explanation);
      } else {
        // Lightweight client-side fallback
        const fallback: CodeFeedback[] = [];
        if (code.includes('var '))
          fallback.push({ type: 'warning', message: '`var` detected — prefer `let` or `const` for block scoping.' });
        if (code.includes('.map(') && !code.includes('key='))
          fallback.push({ type: 'warning', message: 'List rendered with `.map()` may need a `key` prop.' });
        if (fallback.length === 0)
          fallback.push({ type: 'success', message: 'Code looks clean! No obvious issues detected.' });
        setFeedback(fallback);
      }

      setIsAnalyzing(false);
    }, 1800);

    return () => clearTimeout(handler);
  }, [code, language]);

  const handleExplain = async () => {
    setShowExplanation((prev) => !prev);
    if (showExplanation) return;
    if (!explanation) {
      setIsExplaining(true);
      const text = await callGroqForExplanation(code, language);
      setExplanation(text);
      setIsExplaining(false);
    }
  };

  const getIcon = (type: CodeFeedback['type']) => {
    switch (type) {
      case 'success': return <Check className="w-5 h-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info':    return <Info className="w-5 h-5 text-blue-400" />;
      case 'tip':     return <Lightbulb className="w-5 h-5 text-violet-400" />;
      case 'error':   return <AlertTriangle className="w-5 h-5 text-red-400" />;
    }
  };

  return (
    <div className="flex flex-col bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl">
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-violet-400" />
          <h3 className="text-lg font-bold text-[var(--text-primary)]">AI Code Review</h3>
        </div>
        {overallScore !== null && !isAnalyzing && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">Score:</span>
            <span className={`text-lg font-bold ${
              overallScore >= 80 ? 'text-green-400' :
              overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}>{overallScore}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
        {isAnalyzing && (
          <div className="flex items-center justify-center py-6 text-[var(--text-secondary)]">
            <Loader2 className="w-6 h-6 mr-3 text-violet-400 animate-spin" />
            <p className="text-sm">Analysing with Groq AI…</p>
          </div>
        )}

        {!isAnalyzing && bestPractices.length > 0 && (
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2 text-sm">
              <Check className="w-4 h-4" /> Best Practices Followed
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-[var(--text-secondary)]">
              {bestPractices.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {!isAnalyzing && feedback.length > 0 && (
          <AnimatePresence>
            {feedback.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.08 }}
                className="p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">{getIcon(item.type)}</div>
                  <p className="text-sm text-[var(--text-secondary)]">{item.message}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {!isAnalyzing && suggestions.length > 0 && (
          <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
            <h4 className="font-semibold text-violet-400 mb-2 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" /> Suggestions
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-[var(--text-secondary)]">
              {suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {!isAnalyzing && feedback.length === 0 && code.trim().length > 10 && (
          <div className="text-center py-4 text-[var(--text-muted)] text-sm">
            <Check className="w-6 h-6 mx-auto mb-1 text-green-500" />
            No issues detected.
          </div>
        )}

        {!isAnalyzing && code.trim().length <= 10 && (
          <div className="text-center py-4 text-[var(--text-muted)] text-sm">
            Start writing code to get AI feedback.
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border-subtle)]">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExplain}
          disabled={isAnalyzing || code.trim().length < 10}
          className="w-full p-3 btn-primary rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isExplaining
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Explaining…</>
            : <><TrendingUp className="w-5 h-5" />{showExplanation ? 'Hide Explanation' : 'Explain My Code'}</>
          }
        </motion.button>

        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '12px' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="p-4 bg-[var(--surface-hover)] rounded-xl border border-[var(--border-subtle)]"
            >
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm text-[var(--text-primary)]">
                <Lightbulb className="w-4 h-4 text-cyan-400" /> AI Explanation
              </h4>
              <p className="text-sm text-[var(--text-secondary)]">
                {isExplaining ? 'Loading…' : explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
