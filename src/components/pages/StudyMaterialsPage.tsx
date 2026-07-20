import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiApi, gamificationApi, learningApi } from '@/services/api';
import { useUser } from '@/context/UserContext';
import { toast } from 'react-hot-toast';
import { AppPageLayout } from '@/components/layout/AppPageLayout';
import { PageHero, GlassCard, StatCard, EmptyState, SkeletonCard } from '@/components/ui';
import { cn } from '@/utils/cn';

/* ── Design tokens ──────────────────────────────────── */
const C = {
  bg: 'var(--bg)',
  surface: 'var(--bg-1)',
  card: 'var(--surface-card)',
  cardHov: 'var(--surface-card-hover)',
  border: 'var(--border)',
  cyan: 'var(--cyan)',
  violet: 'var(--violet)',
  gold: 'var(--gold)',
  green: 'var(--emerald)',
  pink: 'var(--rose)',
  muted: 'var(--text-muted)',
  text: 'var(--text-primary)',
  glowCyan: 'var(--glow-cyan)',
  glowViolet: 'var(--glow-xs)',
  glowGold: 'var(--glow-gold)',
  glowGreen: 'var(--glow-xs)',
};

/* ── Types ──────────────────────────────────────────── */
type NodeStatus = 'locked' | 'recommended' | 'in_progress' | 'mastered' | 'review' | 'milestone';
type NodeKind = 'skill' | 'project' | 'review';
type FilterType = 'all' | 'recommended' | 'in_progress' | 'mastered' | 'locked';

interface SkillData {
  label: string;
  level: string;
  estimatedHours: number;
  status: NodeStatus;
  description: string;
  kind: NodeKind;
  completedAt?: string;
}

interface RoadmapNode {
  id: string;
  type?: string;
  position?: { x: number; y: number };
  data: SkillData;
}

interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface ContextMenuState { x: number; y: number; nodeId: string; }

interface QuizState {
  nodeId: string; nodeLabel: string; question: string; answer: string;
  score: number | null; strengths: string[]; improvements: string[];
  loading: boolean; done: boolean;
}

const STORAGE_KEY = 'apex_roadmap_state';
const CACHE_VERSION = 3;
const PASS_THRESHOLD = 70;

/* ── Topological sort (BFS logic, returns ordered array) ── */
function topologicalSort(nodes: RoadmapNode[], edges: RoadmapEdge[]): RoadmapNode[] {
  if (nodes.length === 0) return nodes;
  const out: Record<string, string[]> = {};
  const inDeg: Record<string, number> = {};
  nodes.forEach((n) => { out[n.id] = []; inDeg[n.id] = 0; });
  edges.forEach((e) => {
    if (out[e.source]) out[e.source].push(e.target);
    inDeg[e.target] = (inDeg[e.target] ?? 0) + 1;
  });
  const visited = new Set<string>();
  const order: string[] = [];
  const queue = nodes.filter((n) => (inDeg[n.id] ?? 0) === 0).map((n) => n.id);
  const bfs = [...queue];
  while (bfs.length) {
    const id = bfs.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    (out[id] || []).forEach((child) => {
      inDeg[child] = (inDeg[child] ?? 1) - 1;
      if ((inDeg[child] ?? 0) <= 0) bfs.push(child);
    });
  }
  nodes.forEach((n) => { if (!visited.has(n.id)) order.push(n.id); });
  const indexMap: Record<string, number> = {};
  order.forEach((id, i) => { indexMap[id] = i; });
  return [...nodes].sort((a, b) => (indexMap[a.id] ?? 0) - (indexMap[b.id] ?? 0));
}

/* ── Status config ──────────────────────────────────── */
const STATUS: Record<NodeStatus, {
  border: string; shadow: string;
  badgeBg: string; badgeColor: string; badgeBorder: string;
  label: string; pulseAnim: boolean;
}> = {
  recommended: {
    border: '1px solid var(--cyan)', shadow: 'var(--glow-xs)',
    badgeBg: 'rgba(6, 182, 212, 0.12)', badgeColor: 'var(--cyan)', badgeBorder: 'rgba(6, 182, 212, 0.3)',
    label: 'Recommended', pulseAnim: true,
  },
  in_progress: {
    border: '1px solid var(--violet)', shadow: 'var(--glow-sm)',
    badgeBg: 'rgba(124, 92, 252, 0.12)', badgeColor: 'var(--violet)', badgeBorder: 'rgba(124, 92, 252, 0.3)',
    label: 'In Progress', pulseAnim: true,
  },
  mastered: {
    border: '1px solid var(--emerald)', shadow: 'none',
    badgeBg: 'rgba(16, 185, 203, 0.12)', badgeColor: 'var(--emerald)', badgeBorder: 'rgba(16, 185, 203, 0.3)',
    label: 'Mastered', pulseAnim: false,
  },
  milestone: {
    border: '1px solid var(--gold)', shadow: 'var(--glow-gold)',
    badgeBg: 'rgba(245, 158, 11, 0.12)', badgeColor: 'var(--gold)', badgeBorder: 'rgba(245, 158, 11, 0.3)',
    label: 'Milestone', pulseAnim: false,
  },
  review: {
    border: '1px solid var(--gold)', shadow: '0 0 18px rgba(245, 158, 11, 0.25)',
    badgeBg: 'rgba(245, 158, 11, 0.10)', badgeColor: 'var(--gold)', badgeBorder: 'rgba(245, 158, 11, 0.3)',
    label: 'Review', pulseAnim: false,
  },
  locked: {
    border: '1px solid var(--border-subtle)', shadow: 'none',
    badgeBg: 'var(--surface-hover)', badgeColor: 'var(--text-muted)', badgeBorder: 'var(--border-subtle)',
    label: 'Locked', pulseAnim: false,
  },
};

const LEVEL_DOT: Record<string, string> = {
  beginner: C.green,
  intermediate: C.cyan,
  advanced: C.pink,
};

/* ── Status icon ────────────────────────────────────── */
function StatusIcon({ status }: { status: NodeStatus }) {
  const iconMap: Record<NodeStatus, { icon: string; bg: string; border: string; color: string }> = {
    mastered: { icon: '✓', bg: 'rgba(34,211,165,0.15)', border: 'rgba(34,211,165,0.3)', color: C.green },
    recommended: { icon: '⭐', bg: 'rgba(0,229,255,0.10)', border: 'rgba(0,229,255,0.25)', color: C.cyan },
    in_progress: { icon: '⟳', bg: 'rgba(157,78,221,0.15)', border: 'rgba(157,78,221,0.3)', color: C.violet },
    milestone: { icon: '🏆', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', color: C.gold },
    review: { icon: '↻', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', color: C.gold },
    locked: { icon: '🔒', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)', color: C.muted },
  };
  const cfg = iconMap[status] ?? iconMap.locked;
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: status === 'locked' ? 12 : 14, color: cfg.color, fontWeight: 700,
    }}>
      {cfg.icon}
    </div>
  );
}

/* ── Context Menu ───────────────────────────────────── */
const ContextMenu: React.FC<{
  menu: ContextMenuState; onClose: () => void;
  onMastered: (id: string) => void; onReview: (id: string) => void; onRename: (id: string) => void;
}> = ({ menu, onClose, onMastered, onReview, onRename }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.12 }}
    style={{ top: menu.y, left: menu.x, background: C.card, border: `1px solid rgba(255,255,255,0.12)` }}
    className="fixed z-[9999] w-52 rounded-xl shadow-2xl overflow-hidden"
  >
    {[
      { label: 'Mark Mastered', onClick: () => { onMastered(menu.nodeId); onClose(); } },
      { label: 'Add Review Node', onClick: () => { onReview(menu.nodeId); onClose(); } },
      { label: 'Rename Topic', onClick: () => { onRename(menu.nodeId); onClose(); } },
    ].map(({ label, onClick }) => (
      <button
        key={label}
        onClick={onClick}
        className="w-full text-left px-4 py-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors border-b border-[var(--border-subtle)] last:border-0"
      >
        {label}
      </button>
    ))}
  </motion.div>
);

/* ── Quiz Modal ─────────────────────────────────────── */
const QuizModal: React.FC<{
  quiz: QuizState; onChange: (a: string) => void; onSubmit: () => void; onClose: () => void;
}> = ({ quiz, onChange, onSubmit, onClose }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
    style={{ background: 'rgba(7,8,15,0.85)', backdropFilter: 'blur(8px)' }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  >
    <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
      className="w-full max-w-lg rounded-2xl p-6"
      style={{ background: C.card, border: `1px solid rgba(255,255,255,0.10)`, boxShadow: '0 32px 80px rgba(0,0,0,0.80)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div style={{
            height: 32, width: 32, borderRadius: 12,
            background: 'rgba(157,78,221,0.15)', border: `1px solid rgba(157,78,221,0.30)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BrainCircuit className="w-4 h-4" style={{ color: C.violet }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: C.text }}>{quiz.nodeLabel}</p>
            <p className="text-xs" style={{ color: C.muted }}>Skill Quiz</p>
          </div>
        </div>
        <button onClick={onClose} className="text-lg leading-none transition-colors" style={{ color: C.muted }}>✕</button>
      </div>

      {!quiz.done ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed rounded-xl p-4"
            style={{ color: C.text, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {quiz.loading && !quiz.question
              ? <span style={{ color: C.muted }} className="animate-pulse">Generating question…</span>
              : quiz.question}
          </p>
          <textarea
            className="w-full h-28 px-4 py-3 text-sm rounded-xl outline-none resize-none"
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: C.text, fontFamily: 'inherit',
            }}
            placeholder="Type your answer here…" value={quiz.answer}
            onChange={(e) => onChange(e.target.value)} disabled={quiz.loading}
          />
          <button onClick={onSubmit} disabled={quiz.loading || !quiz.answer.trim()}
            className="w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: `linear-gradient(135deg, ${C.violet}, #6366f1)`, color: '#fff', boxShadow: C.glowViolet }}>
            {quiz.loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Evaluating…</>
              : <><Zap className="w-4 h-4" />Submit Answer</>}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              background: (quiz.score ?? 0) >= PASS_THRESHOLD ? 'rgba(34,211,165,0.10)' : 'rgba(251,191,36,0.10)',
              border: `1px solid ${(quiz.score ?? 0) >= PASS_THRESHOLD ? 'rgba(34,211,165,0.30)' : 'rgba(251,191,36,0.30)'}`,
            }}>
            {(quiz.score ?? 0) >= PASS_THRESHOLD
              ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: C.green }} />
              : <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: C.gold }} />}
            <p className="font-semibold text-sm" style={{ color: (quiz.score ?? 0) >= PASS_THRESHOLD ? C.green : C.gold }}>
              Score: {quiz.score}/100 — {(quiz.score ?? 0) >= PASS_THRESHOLD ? 'Passed! Topic marked mastered.' : 'Below 70 — Review node added.'}
            </p>
          </div>
          {quiz.strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: C.muted }}>Strengths</p>
              <ul className="space-y-1">
                {quiz.strengths.map((s, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: C.text }}>
                    <span style={{ color: C.green }}>✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {quiz.improvements.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: C.muted }}>To Improve</p>
              <ul className="space-y-1">
                {quiz.improvements.map((s, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: C.text }}>
                    <span style={{ color: C.gold }}>→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={onClose}
            className="w-full h-9 rounded-xl text-sm font-medium transition-colors"
            style={{ border: `1px solid rgba(255,255,255,0.10)`, background: 'rgba(255,255,255,0.04)', color: C.text }}>
            Close
          </button>
        </div>
      )}
    </motion.div>
  </motion.div>
);

/* ── Main Component ─────────────────────────────── */
export default function LearningPathView() {
  const { user, token } = useUser();
  const [nodes, setNodes] = useState<RoadmapNode[]>([]);
  const [edges, setEdges] = useState<RoadmapEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [genError, setGenError] = useState('');
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const storedRole = localStorage.getItem('apex_target_role') ?? '';
  const rawUser = user as unknown as Record<string, unknown> | null;
  const meta = (rawUser?.metadata || rawUser?.preferences || {}) as Record<string, unknown>;
  const metaGoals = Array.isArray(meta.goals) ? (meta.goals as string[]) : undefined;
  const targetRole = storedRole || (metaGoals && metaGoals.length > 0 ? metaGoals[0] : '') || 'Full Stack Developer';
  const roleLabel = targetRole ? targetRole.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

  const persist = useCallback((n: RoadmapNode[], e: RoadmapEdge[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: CACHE_VERSION, nodes: n, edges: e }));
    } catch { /* quota exceeded */ }
  }, []);

  const loadFromStorage = useCallback((): boolean => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { v?: number; nodes: RoadmapNode[]; edges: RoadmapEdge[] };
      if (!parsed.v || parsed.v < CACHE_VERSION) { localStorage.removeItem(STORAGE_KEY); return false; }
      const { nodes: n, edges: e } = parsed;
      if (!Array.isArray(n) || n.length === 0) return false;
      const sorted = topologicalSort(n, e ?? []);
      setNodes(sorted); setEdges(e ?? []);
      return true;
    } catch { return false; }
  }, []);

  const generate = useCallback(async () => {
    const roleToUse = targetRole || 'Full Stack Developer';
    setLoading(true); setGenError('');
    try {
      const resumeB64 = localStorage.getItem('apex_resume_b64');
      const cleanResumeB64 = (resumeB64 && resumeB64.trim().length > 0) ? resumeB64.trim() : undefined;
      const currentSkills = ['beginner'];

      const res = await aiApi.generateRoadmap(
        {
          target_role: roleToUse,
          resume_pdf_base64: cleanResumeB64,
          current_skills: currentSkills,
          max_nodes: 12
        },
        token ?? undefined
      );

      if (!res || !Array.isArray(res.nodes) || res.nodes.length === 0) {
        throw new Error('Received invalid or empty roadmap data from server.');
      }

      const newNodes: RoadmapNode[] = res.nodes.map((n, i) => ({
        id: n.id || `node-${i + 1}`,
        data: {
          label: n.data?.label || `Topic ${i + 1}`,
          level: String(n.data?.level ?? 'intermediate'),
          estimatedHours: Number(n.data?.estimatedHours ?? 10),
          status: i < 2 ? 'recommended' : 'locked',
          description: String(n.data?.description ?? `Learn ${n.data?.label || 'this topic'}`),
          kind: String(n.data?.label ?? '').toLowerCase().includes('project') ? 'project' : 'skill',
        },
      }));
      const newEdges: RoadmapEdge[] = (res.edges || []).map((e, i) => ({
        id: e.id || `edge-${i + 1}`,
        source: e.source,
        target: e.target
      }));
      const sorted = topologicalSort(newNodes, newEdges);
      setNodes(sorted); setEdges(newEdges);
      persist(sorted, newEdges);
      toast.success('New AI learning roadmap generated!');
    } catch (err: any) {
      console.error('Roadmap generation error:', err);
      setGenError(err.message || 'Roadmap generation failed.');
      toast.error(err.message || 'Failed to generate roadmap.');
    } finally {
      setLoading(false);
    }
  }, [targetRole, token, persist]);

  useEffect(() => {
    if (targetRole) {
      const loaded = loadFromStorage();
      if (!loaded) {
        void generate();
      }
    }
  }, [targetRole, loadFromStorage, generate]);

  useEffect(() => {
    if (!token) return;

    // Sync completed lessons from backend database to local storage
    learningApi.getCompletedLessons(token)
      .then((completedLessons) => {
        if (!completedLessons || completedLessons.length === 0) return;

        const completedTitles = new Set(completedLessons.map((l) => l.title));

        setNodes((prev) => {
          let hasChanges = false;
          const updated = prev.map((n) => {
            if (completedTitles.has(n.data.label) && n.data.status !== 'mastered') {
              hasChanges = true;
              return {
                ...n,
                data: {
                  ...n.data,
                  status: 'mastered' as NodeStatus,
                  completedAt: new Date().toISOString()
                }
              };
            }
            return n;
          });

          if (hasChanges) {
            // Also need to unlock dependent nodes for recommended topics
            const resolved = updated.map((n) => {
              if (n.data.status === 'locked') {
                const hasMasteredPrereq = edges.some(
                  (e) => e.target === n.id && updated.find((src) => src.id === e.source)?.data.status === 'mastered'
                );
                if (hasMasteredPrereq) {
                  return { ...n, data: { ...n.data, status: 'recommended' as NodeStatus } };
                }
              }
              return n;
            });
            persist(resolved, edges);
            window.dispatchEvent(new Event('gamification_updated'));
            return resolved;
          }
          return prev;
        });
      })
      .catch((err) => {
        console.error('Failed to sync completed lessons from backend:', err);
      });
  }, [token, edges, persist]);

  const markMastered = useCallback((nodeId: string) => {
    setNodes((prev) => {
      const updated = prev.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, status: 'mastered' as NodeStatus } };
        }
        return n;
      });
      const label = updated.find((n) => n.id === nodeId)?.data?.label || 'topic';

      const resolved = updated.map((n) => {
        if (n.data.status === 'locked') {
          const hasMasteredPrereq = edges.some(
            (e) => e.target === n.id && updated.find((src) => src.id === e.source)?.data.status === 'mastered'
          );
          if (hasMasteredPrereq) {
            return { ...n, data: { ...n.data, status: 'recommended' as NodeStatus } };
          }
        }
        return n;
      });

      persist(resolved, edges);

      if (token) {
        gamificationApi.awardXp(
          { amount: 150, reason: `Mastered skill topic: ${label}` },
          token
        )
          .then((res) => {
            toast.success(`Skill Mastered! Claimed ${res.awarded_xp} XP!`);
            window.dispatchEvent(new Event('gamification_updated'));
          })
          .catch(() => toast.error('Completed! XP claiming failed.'));
      } else {
        toast.success('Skill Mastered locally!');
      }

      return resolved;
    });
  }, [edges, persist, token]);

  const addReviewNode = useCallback((nodeId: string) => {
    setNodes((prev) => {
      const target = prev.find((n) => n.id === nodeId);
      if (!target) return prev;
      const reviewId = `review-${nodeId}-${Date.now()}`;
      const reviewNode: RoadmapNode = {
        id: reviewId,
        data: {
          label: `Review: ${target.data.label}`,
          level: target.data.level,
          estimatedHours: 2,
          status: 'review' as NodeStatus,
          description: `Revise and strengthen understanding of ${target.data.label}.`,
          kind: 'review' as NodeKind,
        }
      };
      const newEdge: RoadmapEdge = { id: `e-rev-${nodeId}`, source: reviewId, target: nodeId };
      const upN = [...prev, reviewNode];
      const upE = [...edges, newEdge];
      persist(upN, upE);
      setEdges(upE);
      return upN;
    });
  }, [edges, persist]);

  const onCardContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId });
  }, []);

  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const startQuiz = useCallback(async (node: RoadmapNode) => {
    setQuiz({
      nodeId: node.id, nodeLabel: node.data.label, question: '', answer: '',
      score: null, strengths: [], improvements: [], loading: true, done: false,
    });
    try {
      const res = await aiApi.nodeInterview(
        { topic: node.data.label, message: "start", difficulty: 'intermediate', target_role: targetRole },
        token ?? undefined
      );
      setQuiz((p) => p ? { ...p, question: res.response, loading: false } : null);
    } catch {
      setQuiz((p) => p ? { ...p, question: `Could not load AI questions for ${node.data.label}.`, loading: false } : null);
    }
  }, [targetRole, token]);

  const submitQuiz = useCallback(async () => {
    if (!quiz) return;
    setQuiz((p) => p ? { ...p, loading: true } : null);
    try {
      const res = await aiApi.nodeInterview(
        {
          topic: quiz.nodeLabel, message: quiz.answer, target_role: targetRole, difficulty: 'intermediate',
          conversation_history: [{ role: 'assistant', content: quiz.question }, { role: 'user', content: quiz.answer }]
        },
        token ?? undefined
      );
      setQuiz((p) => p ? { ...p, score: res.score, strengths: res.strengths, improvements: res.improvements, loading: false, done: true } : null);
      if (res.score >= PASS_THRESHOLD) markMastered(quiz.nodeId);
      else addReviewNode(quiz.nodeId);
    } catch {
      setQuiz((p) => p ? { ...p, loading: false, done: true, score: 0, strengths: [], improvements: ['API unavailable'] } : null);
    }
  }, [quiz, targetRole, token, markMastered, addReviewNode]);

  /* ── Computed stats ─────────────────────────────── */
  const mastered = nodes.filter((n) => n.data.status === 'mastered').length;
  const available = nodes.filter((n) => n.data.status === 'recommended' || n.data.status === 'in_progress').length;
  const lockedCnt = nodes.filter((n) => n.data.status === 'locked').length;
  const progress = nodes.length ? Math.round((mastered / nodes.length) * 100) : 0;
  const remainHrs = nodes.filter((n) => n.data.status !== 'mastered').reduce((s, n) => s + (n.data.estimatedHours || 0), 0);

  /* ── Filtered & searched nodes ──────────────────────── */
  const filteredNodes = nodes.filter((node) => {
    const matchesSearch =
      node.data.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.data.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    return node.data.status === activeFilter;
  });

  const FILTER_TABS: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: nodes.length },
    { key: 'recommended', label: 'Recommended', count: nodes.filter((n) => n.data.status === 'recommended').length },
    { key: 'in_progress', label: 'In Progress', count: nodes.filter((n) => n.data.status === 'in_progress').length },
    { key: 'mastered', label: 'Mastered', count: mastered },
    { key: 'locked', label: 'Locked', count: lockedCnt },
  ];

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ RENDER ━━ */
  return (
    <AppPageLayout>
      {/* ── Page Hero ── */}
      <PageHero
        icon="📚"
        title="Study Materials"
        description="Your AI-generated learning roadmap."
        extraActions={
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            {nodes.length > 0 && !loading && (
              <button
                onClick={() => void generate()}
                disabled={loading}
                className="group flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] hover:opacity-95 text-[var(--text-inverse)] text-xs font-bold transition-all duration-200 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {loading ? 'Generating…' : 'Regenerate'}
              </button>
            )}
          </div>
        }
      />

      <div className="w-full max-w-[820px] mx-auto space-y-6">
        {/* ── Loading ── */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-6 py-8">
              <div className="flex flex-col items-center gap-4 text-center mb-8">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--violet)]/20 border-t-[var(--violet)]" />
                <p className="text-xs text-[var(--text-secondary)] animate-pulse">Building your AI roadmap...</p>
              </div>
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ── */}
        {genError && !loading && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {genError}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && nodes.length === 0 && !genError && (
          <EmptyState
            icon={<BrainCircuit className="w-6 h-6 text-[var(--violet)]" />}
            title="No Learning Roadmap Yet"
            description={targetRole
              ? `Generate your AI learning roadmap for ${roleLabel || targetRole}.`
              : "Generate your learning roadmap to begin your journey."}
            action={
              <button
                onClick={() => void generate()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] hover:opacity-95 active:scale-[0.98] text-[var(--text-inverse)] text-xs font-bold shadow-md transition-all font-display"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate Roadmap
              </button>
            }
          />
        )}

        {/* ── Content (nodes exist) ── */}
        {nodes.length > 0 && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">

            {/* ── Progress Header Card ── */}
            <GlassCard className="p-6">
              <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
                <div>
                  <h2 className="text-base font-extrabold text-[var(--text-primary)] leading-none tracking-tight font-display">
                    {roleLabel || 'Learning Roadmap'}
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-medium">Your personalised AI-generated learning path</p>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--cyan)]">
                  AI GENERATED
                </span>
              </div>

              {/* Progress bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
                  <span>Overall Progress</span>
                  <span className="font-bold text-[var(--text-primary)]">{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--surface-hover)] overflow-hidden border border-[var(--border-subtle)]">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard icon="📚" value={nodes.length} label="Total Topics" />
                <StatCard icon="✅" value={mastered} label="Completed" className="text-[var(--emerald)]" />
                <StatCard icon="⭐" value={available} label="Available" className="text-[var(--cyan)]" />
                <StatCard icon="⏱️" value={`${remainHrs}h`} label="Est. Remaining" className="text-[var(--violet)]" />
              </div>
            </GlassCard>

            {/* ── Search ── */}
            <div className="flex items-center gap-3 px-4 h-11 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] transition-all duration-200 focus-within:border-[var(--border-strong)] focus-within:shadow-[var(--glow-xs)]">
              <Search className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search roadmap topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* ── Filter Tabs ── */}
            <div className="flex items-center gap-2 flex-wrap border-b border-[var(--border-subtle)] pb-2">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border border-transparent',
                    activeFilter === tab.key
                      ? 'bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] text-[var(--text-inverse)] shadow-sm'
                      : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {tab.label} {tab.count > 0 && <span className="opacity-70 ml-1">({tab.count})</span>}
                </button>
              ))}
            </div>

            {/* ── Roadmap Card List ── */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredNodes.length === 0 ? (
                  <motion.div
                    key="empty-filter"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-16 text-xs text-[var(--text-secondary)]"
                  >
                    No topics match your filters.
                  </motion.div>
                ) : (
                  filteredNodes.map((node, index) => {
                    const cfg = STATUS[node.data.status] ?? STATUS.locked;
                    const isExpanded = expandedId === node.id;
                    const isLocked = node.data.status === 'locked';
                    const isMastered = node.data.status === 'mastered';
                    const dotColor = LEVEL_DOT[node.data.level] ?? C.muted;
                    const originalIndex = nodes.findIndex((n) => n.id === node.id);

                    return (
                      <motion.div
                        key={node.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.15) }}
                        onContextMenu={(e) => onCardContextMenu(e, node.id)}
                        className={cn(
                          'rounded-2xl border transition-all duration-200 relative overflow-hidden bg-[var(--surface-card)]',
                          isExpanded ? 'border-[var(--border-strong)] shadow-[var(--glow-xs)]' : 'border-[var(--border-subtle)]',
                          isLocked && !isExpanded ? 'opacity-70' : 'opacity-100'
                        )}
                      >
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : node.id)}
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Step Number */}
                            <div className={cn(
                              'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border',
                              isMastered
                                ? 'bg-[var(--emerald)]/10 border-[var(--emerald)]/25 text-[var(--emerald)]'
                                : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                            )}>
                              {String(originalIndex + 1).padStart(2, '0')}
                            </div>

                            {/* Status Icon */}
                            <StatusIcon status={node.data.status} />

                            {/* Title & Level */}
                            <div className="min-w-0">
                              <h3 className={cn(
                                'text-sm font-bold truncate leading-snug',
                                isLocked ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                              )}>
                                {node.data.label}
                              </h3>
                              <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                                  <span className="capitalize">{node.data.level}</span>
                                </span>
                                <span>•</span>
                                <span>⏱️ {node.data.estimatedHours}h</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Controls */}
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border',
                              cfg.badgeBg ? '' : 'bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                            )} style={{
                              backgroundColor: cfg.badgeBg,
                              color: cfg.badgeColor,
                              borderColor: cfg.badgeBorder
                            }}>
                              {cfg.label}
                            </span>
                            <ChevronDown className={cn(
                              'w-4 h-4 text-[var(--text-muted)] transition-transform duration-200',
                              isExpanded && 'transform rotate-180'
                            )} />
                          </div>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden border-t border-[var(--border-subtle)]"
                            >
                              <div className="p-4 space-y-4">
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                  {node.data.description}
                                </p>

                                {/* Meta properties */}
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Est. Duration</p>
                                    <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">{node.data.estimatedHours}h</p>
                                  </div>
                                  <div className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Difficulty</p>
                                    <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5 capitalize">{node.data.level}</p>
                                  </div>
                                  <div className="p-2 rounded-xl bg-[var(--surface-hover)] border border-[var(--border-subtle)]">
                                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Material Type</p>
                                    <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5 capitalize">{node.data.kind}</p>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                {isLocked ? (
                                  <div className="p-3 text-center text-xs text-[var(--text-secondary)] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)]">
                                    🔒 Complete prerequisites to unlock this topic
                                  </div>
                                ) : (
                                  <div className="flex gap-2 flex-wrap">
                                    <Link
                                      to="/lesson"
                                      state={{ topic: node.data.label, description: node.data.description, level: node.data.level }}
                                      className="flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 bg-gradient-to-r from-[var(--violet)] to-[var(--cyan)] hover:opacity-95 text-[var(--text-inverse)] text-xs font-bold shadow-md transition-all font-display"
                                    >
                                      <BookOpen className="w-3.5 h-3.5" />
                                      Start Lesson
                                    </Link>
                                    <button
                                      onClick={() => void startQuiz(node)}
                                      className="h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 border border-[var(--border-strong)] bg-[var(--surface-hover)] hover:bg-[var(--surface-card-hover)] text-[var(--text-primary)] text-xs font-bold transition-all duration-200"
                                    >
                                      <BrainCircuit className="w-3.5 h-3.5 text-[var(--violet)]" />
                                      Test Knowledge
                                    </button>
                                    {!isMastered && (
                                      <button
                                        onClick={() => markMastered(node.id)}
                                        className="h-9 px-4 rounded-xl flex items-center justify-center gap-1.5 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-bold transition-all duration-200"
                                      >
                                        <BadgeCheck className="w-3.5 h-3.5" />
                                        Complete Topic
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Context Menu ── */}
      <AnimatePresence>
        {ctxMenu && (
          <ContextMenu
            menu={ctxMenu}
            onClose={() => setCtxMenu(null)}
            onMastered={markMastered}
            onReview={addReviewNode}
            onRename={(id) => { setRenameId(id); setRenameVal(nodes.find((n) => n.id === id)?.data.label || ''); }}
          />
        )}
      </AnimatePresence>

      {/* ── Rename Modal ── */}
      <AnimatePresence>
        {renameId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(7,8,15,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 10 }}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: C.card, border: `1px solid rgba(255,255,255,0.08)`, boxShadow: '0 24px 70px rgba(0,0,0,0.70)' }}
            >
              <p style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text, marginBottom: 14 }}>Change Topic</p>
              <input
                autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)}
                style={{
                  width: '100%', height: 40, padding: '0 14px', fontSize: '0.86rem', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`,
                  color: C.text, outline: 'none', marginBottom: 14, boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setRenameId(null)} style={{
                  flex: 1, height: 38, borderRadius: 10, cursor: 'pointer',
                  border: `1px solid rgba(255,255,255,0.08)`,
                  background: 'transparent', color: C.muted, fontSize: '0.84rem',
                }}>Cancel</button>
                <button
                  onClick={() => {
                    setNodes((prev) => {
                      const u = prev.map((n) => n.id === renameId ? { ...n, data: { ...n.data, label: renameVal } } : n);
                      persist(u, edges);
                      return u;
                    });
                    setRenameId(null);
                  }}
                  style={{
                    flex: 1, height: 38, borderRadius: 10, cursor: 'pointer', border: 'none',
                    background: `linear-gradient(135deg, ${C.violet}, #6366f1)`,
                    color: '#fff', fontSize: '0.84rem', fontWeight: 600,
                  }}
                >Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quiz Modal ──────────────────────────────── */}
      <AnimatePresence>
        {quiz && (
          <QuizModal
            quiz={quiz}
            onChange={(a) => setQuiz((p) => p ? { ...p, answer: a } : null)}
            onSubmit={() => void submitQuiz()}
            onClose={() => setQuiz(null)}
          />
        )}
      </AnimatePresence>
    </AppPageLayout>
  );
}