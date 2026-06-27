import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { CheckCircle2, Clock3, Flame, Sparkles, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

type SkillNodeData = {
  label: string;
  level?: string;
  estimatedHours?: number;
  status?: string;
  description?: string;
};

const levelClass: Record<string, string> = {
  beginner: 'from-emerald-400/30 to-cyan-400/20 border-emerald-300/45',
  intermediate: 'from-indigo-500/30 to-blue-400/20 border-indigo-300/45',
  advanced: 'from-fuchsia-500/30 to-violet-400/20 border-fuchsia-300/45',
};

const statusIcon: Record<string, JSX.Element> = {
  mastered: <Trophy className="h-3.5 w-3.5" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
  recommended: <Sparkles className="h-3.5 w-3.5" />,
  in_progress: <Flame className="h-3.5 w-3.5" />,
};

function CustomNode({ data, selected }: NodeProps<SkillNodeData>) {
  const level = (data.level || 'intermediate').toLowerCase();
  const status = (data.status || 'recommended').toLowerCase();
  const levelTone = levelClass[level] ?? levelClass.intermediate;
  const icon = statusIcon[status] ?? statusIcon.recommended;

  return (
    <motion.div
      initial={{ opacity: 0.8, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -2 }}
      className={clsx(
        'relative min-w-[220px] max-w-[260px] rounded-2xl border bg-slate-900/70 p-4 backdrop-blur-xl',
        'bg-gradient-to-br shadow-[0_0_35px_rgba(99,102,241,0.22)]',
        levelTone,
        selected && 'ring-2 ring-indigo-300/70 shadow-[0_0_48px_rgba(129,140,248,0.55)]'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border !border-white/70 !bg-indigo-300"
      />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-300">{level}</div>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-white">{data.label}</h3>
        </div>
        <div className="flex h-7 min-w-7 items-center justify-center rounded-full border border-indigo-200/35 bg-indigo-400/20 text-indigo-100">
          {icon}
        </div>
      </div>

      <p className="line-clamp-2 text-xs leading-relaxed text-slate-300/95">
        {data.description || 'Focused skill milestone in your career roadmap.'}
      </p>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-2.5 py-2 text-xs text-slate-200">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5 text-blue-200" />
          {Math.max(1, Number(data.estimatedHours ?? 8))} hrs
        </span>
        <span className="rounded-full border border-indigo-300/35 bg-indigo-500/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-indigo-100">
          {status.replace('_', ' ')}
        </span>
      </div>

      <motion.div
        className="pointer-events-none absolute -inset-[1px] rounded-2xl border border-indigo-200/30"
        animate={{ opacity: [0.35, 0.85, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border !border-white/70 !bg-fuchsia-300"
      />
    </motion.div>
  );
}

export default memo(CustomNode);
