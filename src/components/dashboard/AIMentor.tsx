import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { chatApi, type ChatMessage } from '@/services/api';
import { useUser } from '@/context/UserContext';
import { cn } from '@/utils/cn';

/* ── Persistence keys ────────────────────────────── */
const STORAGE_KEY = 'apex_mentor_history';
const MAX_STORED  = 24;

/* ── Mentor persona context ──────────────────────── */
function buildSystemContext(): string {
  const role     = localStorage.getItem('apex_target_role') ?? 'software engineer';
  const deadline = localStorage.getItem('apex_deadline') ?? '3m';
  const complete = localStorage.getItem('apex_onboarding_complete') === 'true';

  const deadlineMap: Record<string, string> = {
    '1m': '1 month (sprint mode, ~3-4 hrs/day)',
    '3m': '3 months (focused pace, ~2 hrs/day)',
    '6m': '6 months (steady growth, ~1 hr/day)',
    '12m': '1 year (relaxed mastery, ~30 min/day)',
  };

  const roleLabel = role.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const deadlineLabel = deadlineMap[deadline] ?? deadline;

  return (
    `You are a Personal AI Mentor and Senior Software Engineer with 10 years of experience. ` +
    `You are acting as a personal mentor for a student who wants to become a ${roleLabel}. ` +
    `Their goal deadline is ${deadlineLabel}. ` +
    (complete
      ? `They have just completed onboarding and are starting their learning journey. `
      : `They are actively learning. `) +
    `Your tone is warm, concise, and motivating — like a senior colleague. ` +
    `Give actionable advice. Be specific about the Indian job market when relevant. ` +
    `Keep responses under 120 words unless the user asks for detail.`
  );
}

/* ── Opening message (generated from context) ───── */
function buildWelcomeMessage(): string {
  const role     = localStorage.getItem('apex_target_role') ?? '';
  const deadline = localStorage.getItem('apex_deadline') ?? '3m';
  const roleLabel = role
    ? role.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'your target role';

  const urgency: Record<string, string> = {
    '1m':  "You've got 30 days — every session counts. Let's move fast.",
    '3m':  "3 months is the sweet spot. Consistent daily practice will get you there.",
    '6m':  "6 months gives us room to go deep. Let's build solid foundations.",
    '12m': "A year is plenty of time to master this. Let's build lasting skills.",
  };

  return (
    `Hey! I'm your Personal AI Mentor. I'll be guiding you toward **${roleLabel}**. ` +
    `${urgency[deadline] ?? ''} ` +
    `What would you like to focus on today?`
  );
}

/* ── Render markdown bold ────────────────────────── */
function renderMessage(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

/* ── Component ───────────────────────────────────── */
interface AIMentorProps {
  className?: string;
  defaultOpen?: boolean;
}

export const AIMentor: React.FC<AIMentorProps> = ({
  className,
  defaultOpen = true,
}) => {
  const { token } = useUser();
  const [open, setOpen]       = useState(defaultOpen);
  const [msgs, setMsgs]       = useState<ChatMessage[]>([]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  /* Load persisted history */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        setMsgs(Array.isArray(parsed) ? parsed : []);
        return;
      }
    } catch {
      /* ignore corrupt data */
    }
    /* First visit — inject welcome message */
    const welcome: ChatMessage = {
      role: 'assistant',
      content: buildWelcomeMessage(),
    };
    setMsgs([welcome]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([welcome]));
  }, []);

  /* Scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  /* Persist on change */
  useEffect(() => {
    if (msgs.length) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(msgs.slice(-MAX_STORED))
      );
    }
  }, [msgs]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMsgs((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const history = msgs.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await chatApi.send(
        {
          message: text,
          code_context: buildSystemContext(),
          conversation_history: history,
        },
        token ?? undefined
      );

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.response,
      };
      setMsgs((prev) => [...prev, assistantMsg]);
      console.info('[APEX] Mentor response received:', res.response.slice(0, 60) + '…');
    } catch (err) {
      console.error('[APEX] AIMentor send error:', err);
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Try again in a moment.",
      };
      setMsgs((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, sending, msgs, token]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const clearHistory = () => {
    const welcome: ChatMessage = { role: 'assistant', content: buildWelcomeMessage() };
    setMsgs([welcome]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([welcome]));
  };

  /* ── Render ───────────────────────────────────── */
  return (
    <div className={cn('rounded-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] overflow-hidden flex flex-col', className)}>

      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between px-5 py-4 hover:bg-[var(--surface-hover)] transition-colors w-full text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--surface-card)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Personal AI Mentor</p>
            <p className="text-[11px] text-[var(--text-secondary)]">Your dedicated career & code guide</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {msgs.length > 1 && (
            <span className="text-[11px] text-[var(--text-muted)]">{msgs.length} msgs</span>
          )}
          {open
            ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          }
        </div>
      </button>

      {/* Chat body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="chat"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {/* Messages */}
            <div className="flex flex-col gap-3 px-4 py-3 overflow-y-auto max-h-72 min-h-[140px]">
              {msgs.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'flex gap-2.5',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5',
                    msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-violet-600 to-cyan-500'
                      : 'bg-[var(--surface-hover)] border border-[var(--border-subtle)]'
                  )}>
                    {msg.role === 'assistant'
                      ? <Sparkles className="w-3 h-3 text-white" />
                      : <User className="w-3 h-3 text-[var(--text-secondary)]" />
                    }
                  </div>

                  {/* Bubble */}
                  <div className={cn(
                    'max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed',
                    msg.role === 'assistant'
                      ? 'bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)]'
                      : 'bg-violet-500/10 border border-violet-500/20 text-[var(--violet-dim)]'
                  )}>
                    {renderMessage(msg.content)}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="flex gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <div className="px-3 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center gap-1">
                    {[0, 1, 2].map((j) => (
                      <motion.div
                        key={j}
                        className="w-1.5 h-1.5 rounded-full bg-violet-500/50"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border-subtle)] mx-4" />

            {/* Input row */}
            <div className="flex items-center gap-2 p-3">
              <input
                ref={inputRef}
                className="flex-1 h-9 px-3 text-sm bg-[var(--surface-hover)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-violet-500/50 focus:bg-[var(--surface-card-hover)] transition-colors"
                placeholder="Ask your mentor anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={sending || !input.trim()}
                className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                  input.trim() && !sending
                    ? 'bg-gradient-to-br from-violet-600 to-cyan-500 hover:shadow-glow-sm text-white'
                    : 'bg-[var(--surface-hover)] text-[var(--text-muted)] cursor-not-allowed'
                )}
                aria-label="Send message"
              >
                {sending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>

            {/* Clear history */}
            {msgs.length > 2 && (
              <div className="px-4 pb-3 -mt-1">
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIMentor;
