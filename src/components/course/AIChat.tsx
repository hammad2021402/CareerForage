import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, User, Loader2, Sparkles, ShieldCheck, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useUser } from '@/context/UserContext';
import { aiApi, ApiError, type NodeInterviewTurn } from '@/services/api';

type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
  score?: number;
  followUp?: string;
  strengths?: string[];
  improvements?: string[];
};

type AIChatMode = 'assistant' | 'interviewer';

type AIResponsePayload = {
  text: string;
  score?: number;
  followUp?: string;
  strengths?: string[];
  improvements?: string[];
};

interface AIChatProps {
  lessonId?: string;
  codeContext?: string;
  mode?: AIChatMode;
  topic?: string;
  targetRole?: string;
  className?: string;
}

const toHistory = (messages: ChatMessage[]): NodeInterviewTurn[] =>
  messages.map((msg) => ({
    role: msg.sender === 'ai' ? 'assistant' : 'user',
    content: msg.text,
  }));

export default function AIChat({
  lessonId,
  codeContext,
  mode = 'assistant',
  topic,
  targetRole,
  className = '',
}: AIChatProps) {
  const { token } = useUser();

  const intro = useMemo(() => {
    if (mode === 'interviewer') {
      const resolvedTopic = topic || 'System Design';
      return {
        sender: 'ai' as const,
        text: `Strict Interview Mode enabled for ${resolvedTopic}. Answer concisely with architecture, trade-offs, and edge cases.` ,
      };
    }

    return {
      sender: 'ai' as const,
      text: "Hello! I'm your AI coding assistant. Ask me anything about this lesson or coding in general.",
    };
  }, [mode, topic]);

  const [messages, setMessages] = useState<ChatMessage[]>([intro]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendAssistantMessage = async (userMessage: string, history: ChatMessage[]): Promise<AIResponsePayload> => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const conversationHistory = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: userMessage,
        lesson_id: lessonId,
        code_context: codeContext,
        conversation_history: conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    return {
      text: String(data.response || 'Please try again with more context.'),
    };
  };

  const sendInterviewerMessage = async (userMessage: string, history: ChatMessage[]): Promise<AIResponsePayload> => {
    const response = await aiApi.nodeInterview(
      {
        topic: topic || 'System Design',
        message: userMessage,
        target_role: targetRole,
        difficulty: 'intermediate',
        conversation_history: toHistory(history).slice(-10),
      },
      token || undefined
    );

    const followUp = response.follow_up_question?.trim();
    const composed = followUp ? `${response.response}\n\nFollow-up: ${followUp}` : response.response;

    return {
      text: composed,
      score: response.score,
      followUp,
      strengths: response.strengths,
      improvements: response.improvements,
    };
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage = input.trim();
    const withUser: ChatMessage[] = [...messages, { sender: 'user', text: userMessage }];
    setMessages(withUser);
    setInput('');
    setIsLoading(true);

    try {
      const result =
        mode === 'interviewer'
          ? await sendInterviewerMessage(userMessage, messages)
          : await sendAssistantMessage(userMessage, messages);

      setMessages([
        ...withUser,
        {
          sender: 'ai',
          text: result.text,
          score: result.score,
          followUp: result.followUp,
          strengths: result.strengths,
          improvements: result.improvements,
        },
      ]);
    } catch (cause) {
      const fallbackText =
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : 'I had trouble responding. Please try again.';

      setMessages([
        ...withUser,
        {
          sender: 'ai',
          text: `I apologize, but I hit a connection issue: ${fallbackText}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex h-full flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-xl ${className}`}>
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/15 p-2">
            {mode === 'interviewer' ? <ShieldCheck className="h-5 w-5 text-violet-300" /> : <Bot className="h-5 w-5 text-violet-300" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {mode === 'interviewer' ? 'AI Mock Interviewer' : 'AI Coding Buddy'}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {mode === 'interviewer' ? `Topic: ${topic || 'Technical Round'}` : 'Context-aware lesson assistant'}
            </p>
          </div>
        </div>
        {mode === 'interviewer' ? (
          <div className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/15 px-2.5 py-1 text-[11px] text-violet-300">
            <Target className="h-3.5 w-3.5" /> Strict
          </div>
        ) : null}
      </div>

      <div className="flex-grow space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}
          >
            {msg.sender === 'ai' && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}

            <div className="max-w-[75%] space-y-2">
              <div
                className={`rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'border-[var(--violet)]/30 bg-[var(--violet)]/10 text-[var(--violet-dim)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-primary)]'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {msg.sender === 'ai' && typeof msg.score === 'number' ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-2 text-xs text-violet-600 dark:text-violet-200">
                    <span className="opacity-80">Score</span>
                    <div className="mt-0.5 text-base font-semibold">{msg.score}/100</div>
                  </div>
                  <div className="rounded-lg border border-emerald-300/35 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-600 dark:text-emerald-100">
                    <div className="mb-1 font-medium">Strengths</div>
                    <ul className="space-y-0.5">
                      {(msg.strengths || []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-100">
                    <div className="mb-1 font-medium">Improvements</div>
                    <ul className="space-y-0.5">
                      {(msg.improvements || []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>

            {msg.sender === 'user' && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                <User className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
            )}
          </motion.div>
        ))}

        <AnimatePresence>
          {isLoading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-3 py-2.5 text-[var(--text-primary)]">
                <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="border-t border-[var(--border-subtle)] p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder={mode === 'interviewer' ? 'Answer the interviewer...' : 'Ask a question...'}
            disabled={isLoading}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--violet)]/50 focus:ring-2 focus:ring-[var(--violet)]/15 disabled:opacity-60"
          />
          <button
            onClick={() => void handleSend()}
            disabled={isLoading || !input.trim()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white transition hover:shadow-glow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
          <Sparkles className="h-3.5 w-3.5" />
          {mode === 'interviewer'
            ? 'Strict interviewer evaluates your technical depth, trade-offs, and clarity.'
            : 'Ask for hints, concept explanations, or code walkthroughs.'}
        </div>
      </div>
    </div>
  );
}
