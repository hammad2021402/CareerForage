import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, X, Loader2, Sparkles, RotateCcw, ChevronDown,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { chatApi } from '@/services/api';
import type { ChatMessage } from '@/services/api';
import { useUser } from '@/context/UserContext';

/* ── Types ───────────────────────────────────────── */
interface Message extends ChatMessage {
  id: string;
  loading?: boolean;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your Personal AI Mentor. Ask me anything about your studies, a concept you're confused about, or how to use the platform. I'm here to help! 🚀",
};

const SUGGESTIONS = [
  'Explain React hooks with examples',
  'What is Big O notation?',
  'How do I start learning DSA?',
  'Difference between REST and GraphQL',
];

/* ═══════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════ */
export default function AIAssistant() {
  const { token } = useUser();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  /* Auto-scroll to bottom */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Focus input when opened */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: msg };
    const botPlaceholder: Message = { id: `b_${Date.now()}`, role: 'assistant', content: '', loading: true };

    setMessages(prev => [...prev, userMsg, botPlaceholder]);
    setLoading(true);

    try {
      /* Build conversation history (exclude welcome + placeholder) */
      const history: ChatMessage[] = messages
        .filter(m => m.id !== 'welcome' && !m.loading)
        .map(({ role, content }) => ({ role, content }));

      const res = await chatApi.send(
        { message: msg, conversation_history: history },
        token ?? undefined,
      );

      setMessages(prev =>
        prev.map(m => m.loading ? { ...m, content: res.response, loading: false } : m),
      );
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages(prev =>
        prev.map(m => m.loading ? { ...m, content: `⚠️ ${errText}`, loading: false } : m),
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, token]);

  const clearChat = () => setMessages([WELCOME]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  return (
    <>
      {/* ── Floating button ────────────────────────── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 28 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-2xl flex items-center justify-center',
          'shadow-[0_0_28px_rgba(124,92,252,0.50)] transition-all duration-300',
          open
            ? 'bg-[var(--surface-elevated)] border border-violet-500/40'
            : 'bg-gradient-to-br from-violet-600 to-cyan-500', /* intentional: gradient CTA */
        )}
        aria-label="Toggle AI Assistant"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <ChevronDown className="w-5 h-5 text-violet-300" />
            </motion.span>
          ) : (
            <motion.span key="bot"
              initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Bot className="w-6 h-6 text-white" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-2xl animate-ping opacity-20
            bg-gradient-to-br from-violet-600 to-cyan-500 pointer-events-none" />
        )}
      </motion.button>

      {/* ── Chat panel ─────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] flex flex-col rounded-2xl overflow-hidden
              border border-[var(--border)] shadow-[0_24px_64px_rgba(0,0,0,0.50),0_0_0_1px_rgba(124,92,252,0.12)]"
            style={{ height: 520, background: 'var(--surface-glass)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--border-subtle)] flex-shrink-0"
              style={{ background: 'linear-gradient(90deg, rgba(124,92,252,0.10), transparent)' }}>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500
                  flex items-center justify-center shadow-[0_0_12px_rgba(124,92,252,0.40)]">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: 'Sora, sans-serif' }}>
                    AI Assistant
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">Always here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="h-7 w-7 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]
                    flex items-center justify-center transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="h-7 w-7 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]
                    flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map(m => (
                <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="h-6 w-6 rounded-lg bg-violet-500/20 border border-violet-500/25
                      flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                      <Bot className="w-3 h-3 text-violet-400" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[82%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed',
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-violet-600/80 to-violet-700/60 text-white rounded-tr-sm border border-violet-500/30' /* intentional: user message gradient */
                      : 'bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] rounded-tl-sm',
                  )}>
                    {m.loading ? (
                      <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        <span className="flex gap-0.5">
                          {[0, 1, 2].map(i => (
                            <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400"
                              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </span>
                        Thinking…
                      </span>
                    ) : (
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions (show only after welcome with no further messages) */}
            {messages.length === 1 && (
              <div className="px-4 pb-2 flex-shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-2">Suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)]
                        text-[var(--text-secondary)] hover:bg-violet-500/10 hover:border-violet-500/25 hover:text-violet-300
                        transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                bg-[var(--surface-hover)] border border-[var(--border)] focus-within:border-violet-500/40 transition-colors">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={loading}
                  placeholder="Ask anything…"
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
                <button
                  onClick={() => void send()}
                  disabled={!input.trim() || loading}
                  className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500
                    flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed
                    hover:opacity-90 transition-opacity flex-shrink-0"
                >
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Send className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] text-center mt-1.5">
                Powered by Gemini · Press Enter to send
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
