import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  type Edge,
  type Connection,
  type Node,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
  MarkerType,
  MiniMap,
} from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Loader2,
  MessageSquare,
  Network,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { aiApi, ApiError, type RoadmapEdge, type RoadmapNodeData } from '../../services/api';
import CustomNode from './CustomNode';
import AIChat from '../course/AIChat';
import 'reactflow/dist/style.css';

type SkillTreeProps = {
  onSelectCareer: (career: string) => void;
};

type SkillNode = Node<RoadmapNodeData>;

type GenerateState = {
  role: string;
  skills: string;
};

const nodeTypes = {
  skillNode: CustomNode,
};

const initialForm: GenerateState = {
  role: 'Full-Stack Developer',
  skills: 'React, TypeScript, APIs, System Design',
};

const formatSkills = (skillsInput: string) =>
  skillsInput
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const mapNodes = (
  rawNodes: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: RoadmapNodeData;
  }>
): SkillNode[] =>
  rawNodes.map((node, index) => ({
    id: node.id,
    type: 'skillNode',
    position: {
      x: Number(node.position?.x ?? (index % 3) * 300),
      y: Number(node.position?.y ?? Math.floor(index / 3) * 220),
    },
    draggable: true,
    data: {
      label: String(node.data?.label ?? `Skill ${index + 1}`),
      level: String(node.data?.level ?? 'intermediate'),
      estimatedHours: Number(node.data?.estimatedHours ?? 8),
      status: String(node.data?.status ?? 'recommended'),
      description: String(node.data?.description ?? 'Learning milestone.'),
      recommendedCareer: node.data?.recommendedCareer
        ? String(node.data.recommendedCareer)
        : undefined,
    },
  }));

const mapEdges = (rawEdges: RoadmapEdge[]): Edge[] =>
  rawEdges.map((edge, index) => ({
    id: edge.id || `edge-${index + 1}`,
    source: edge.source,
    target: edge.target,
    type: edge.type || 'smoothstep',
    animated: Boolean(edge.animated ?? true),
    markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
    style: { stroke: 'rgba(139,92,246,0.75)', strokeWidth: 1.8 },
  }));

export default function InteractiveSkillTree({ onSelectCareer }: SkillTreeProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<RoadmapNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [interviewTopic, setInterviewTopic] = useState<string | null>(null);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance | null>(null);

  const [form, setForm] = useState<GenerateState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceTag, setSourceTag] = useState('');

  const nodeCount = nodes.length;
  const edgeCount = edges.length;

  const summary = useMemo(() => {
    const beginner     = nodes.filter((n) => String(n.data.level).toLowerCase() === 'beginner').length;
    const intermediate = nodes.filter((n) => String(n.data.level).toLowerCase() === 'intermediate').length;
    const advanced     = nodes.filter((n) => String(n.data.level).toLowerCase() === 'advanced').length;
    return { beginner, intermediate, advanced };
  }, [nodes]);

  const loadRoadmap = useCallback(
    async (payload: GenerateState) => {
      setLoading(true);
      setError(null);

      try {
        const response = await aiApi.generateRoadmap({
          target_role: payload.role,
          current_skills: formatSkills(payload.skills),
          max_nodes: 14,
        });

        const mappedNodes = mapNodes(response.nodes || []);
        const mappedEdges = mapEdges(response.edges || []);

        setNodes(mappedNodes);
        setEdges(mappedEdges);
        setSourceTag(String(response.meta?.source || 'openai'));

        const inferredCareer =
          mappedNodes.find((n) => typeof n.data.recommendedCareer === 'string')?.data
            .recommendedCareer || payload.role;
        if (inferredCareer) onSelectCareer(inferredCareer);

        requestAnimationFrame(() => {
          flowInstance?.fitView({ duration: 650, padding: 0.24 });
        });
      } catch (cause) {
        const message =
          cause instanceof ApiError
            ? cause.message
            : cause instanceof Error
            ? cause.message
            : 'Failed to generate roadmap.';
        setError(message);
        setNodes([]);
        setEdges([]);
      } finally {
        setLoading(false);
      }
    },
    [flowInstance, onSelectCareer, setEdges, setNodes]
  );

  useEffect(() => {
    void loadRoadmap(initialForm);
  }, [loadRoadmap]);

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            style: { stroke: 'rgba(139,92,246,0.75)', strokeWidth: 1.8 },
            animated: true,
          },
          current
        )
      );
    },
    [setEdges]
  );

  const handleGenerateClick = async () => {
    await loadRoadmap(form);
  };

  const handleResetView = () => {
    flowInstance?.fitView({ duration: 500, padding: 0.24 });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-card)]">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.06] via-transparent to-cyan-500/[0.04] pointer-events-none" />

      {/* ── Header / Controls ─────────────────────── */}
      <div className="relative z-10 border-b border-[var(--border-subtle)] px-6 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
              <Network className="h-6 w-6 text-violet-400" />
              Interactive Skill Tree
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              AI-generated roadmap · drag nodes · right-click for actions
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-xs text-violet-300 font-medium uppercase tracking-widest">
            {sourceTag || 'ai'}
          </div>
        </div>

        {/* Form inputs */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <input
            value={form.role}
            onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}
            placeholder="Target role"
            className="md:col-span-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/50 transition-colors"
          />
          <input
            value={form.skills}
            onChange={(e) => setForm((c) => ({ ...c, skills: e.target.value }))}
            placeholder="Current skills (comma-separated)"
            className="md:col-span-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-violet-500/50 transition-colors"
          />
          <button
            onClick={handleGenerateClick}
            disabled={loading || !form.role.trim()}
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl
              bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white
              hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {[
            { label: `Nodes: ${nodeCount}`,             color: 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-secondary)]'    },
            { label: `Edges: ${edgeCount}`,             color: 'border-[var(--border-subtle)] bg-[var(--surface-hover)] text-[var(--text-secondary)]'    },
            { label: `Beginner: ${summary.beginner}`,   color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
            { label: `Intermediate: ${summary.intermediate}`, color: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300' },
            { label: `Advanced: ${summary.advanced}`,   color: 'border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300' },
          ].map(({ label, color }) => (
            <span key={label} className={`rounded-full border px-3 py-1 ${color}`}>{label}</span>
          ))}
          <button
            onClick={handleResetView}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-3 py-1 text-[var(--text-secondary)] hover:border-violet-500/30 hover:text-violet-300 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset View
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/*
       * ─── REACTFLOW BLACK-SCREEN FIX ─────────────────────────────────────
       * The container MUST have an explicit pixel height, not just a Tailwind
       * class like `h-[640px]` that might collapse if a parent has `height:auto`.
       * Passing `style={{ width: '100%', height: '100%' }}` to <ReactFlow>
       * is the second required half of the fix.
       * ────────────────────────────────────────────────────────────────────
       */}
      <div
        className="relative z-10"
        style={{ width: '100%', height: 640, minHeight: 400 }}
      >
        {/* Loading overlay */}
        {loading && nodes.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-b-3xl">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-violet-500/30 bg-violet-500/15 px-5 py-3 text-sm text-violet-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your AI roadmap…
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setFlowInstance}
          onNodeClick={(_, node) => {
            setSelectedNode(node as SkillNode);
            const nextCareer = node.data.recommendedCareer || form.role;
            if (nextCareer) onSelectCareer(nextCareer);
            setInterviewTopic(String(node.data.label || 'System Design'));
          }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.24 }}
          minZoom={0.35}
          maxZoom={2}
          panOnScroll
          zoomOnPinch
          proOptions={{ hideAttribution: true }}
          /* CRITICAL fix: explicit dimensions passed directly to ReactFlow */
          style={{ width: '100%', height: '100%', background: 'transparent' }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            animated: true,
          }}
        >
          <Background color="rgba(139,92,246,0.12)" gap={28} size={1.1} />
          <MiniMap
            pannable
            zoomable
            nodeStrokeColor={() => '#8b5cf6'}
            nodeColor={() => 'rgba(10,10,10,0.9)'}
            maskColor="rgba(0,0,0,0.5)"
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}
          />
          <Controls
            style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}
          />
        </ReactFlow>

        {/* ── Node detail panel ───────────────────── */}
        <AnimatePresence>
          {selectedNode && (
            <motion.aside
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
              className="absolute right-4 top-4 z-30 w-[300px] rounded-2xl border border-[var(--border)]
                bg-[var(--surface-card)]/95 backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(139,92,246,0.12)]"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Node Details</div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{selectedNode.data.label}</h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
                {selectedNode.data.description || 'Roadmap milestone selected.'}
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                {[
                  { label: 'Level',  value: String(selectedNode.data.level || 'intermediate') },
                  { label: 'Hours',  value: String(Number(selectedNode.data.estimatedHours || 8)) },
                  { label: 'Status', value: String(selectedNode.data.status || 'recommended') },
                  { label: 'Career', value: String(selectedNode.data.recommendedCareer || form.role) },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-3 py-2">
                    <div className="text-[var(--text-muted)] text-[10px] mb-0.5">{label}</div>
                    <div className="font-semibold text-[var(--text-primary)] truncate">{value}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onSelectCareer(String(selectedNode.data.recommendedCareer || form.role))}
                className="w-full mb-2 inline-flex items-center justify-center gap-2 rounded-xl
                  bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white
                  hover:opacity-90 transition-opacity"
              >
                <Sparkles className="h-4 w-4" />
                Simulate This Career Path
              </button>

              <button
                onClick={() => setInterviewTopic(String(selectedNode.data.label || 'System Design'))}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl
                  border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-300
                  hover:bg-violet-500/20 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                Start AI Mock Interview
              </button>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Interview modal ──────────────────────── */}
        <AnimatePresence>
          {interviewTopic && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 210, damping: 22 }}
                className="relative flex flex-col w-full max-w-4xl overflow-hidden rounded-2xl
                  border border-[var(--border)] bg-[var(--surface-card)] shadow-[0_0_80px_rgba(139,92,246,0.15)]"
                style={{ height: '78vh' }}
              >
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">AI Mock Interview</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Topic: {interviewTopic}</p>
                  </div>
                  <button
                    onClick={() => setInterviewTopic(null)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden p-4">
                  <AIChat mode="interviewer" topic={interviewTopic} targetRole={form.role} className="h-full" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
