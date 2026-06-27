import { useEffect, useMemo, useState } from 'react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

type NodeSeed = {
  id: string;
  nx: number;
  ny: number;
  depth: number;
  speed: number;
  phase: number;
};

type Point = {
  id: string;
  x: number;
  y: number;
  depth: number;
};

const NODE_COUNT = 24;

export default function PlexusBackground() {
  const seeds = useMemo<NodeSeed[]>(
    () =>
      Array.from({ length: NODE_COUNT }).map((_, index) => ({
        id: `n-${index}`,
        nx: Math.random(),
        ny: Math.random(),
        depth: 0.4 + Math.random() * 0.9,
        speed: 0.25 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      })),
    []
  );

  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });
  const [clock, setClock] = useState(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 45, damping: 22, mass: 0.3 });
  const springY = useSpring(mouseY, { stiffness: 45, damping: 22, mass: 0.3 });

  const glowX = useTransform(springX, [-1, 1], [-220, 220]);
  const glowY = useTransform(springY, [-1, 1], [-180, 180]);

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    const onMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
      const y = (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [mouseX, mouseY]);

  useAnimationFrame((time) => {
    setClock(time / 1000);
  });

  const points = useMemo<Point[]>(() => {
    return seeds.map((seed) => {
      const driftX = Math.sin(clock * seed.speed + seed.phase) * 46 * seed.depth;
      const driftY = Math.cos(clock * seed.speed * 0.85 + seed.phase * 0.7) * 34 * seed.depth;

      const parallaxX = springX.get() * 28 * seed.depth;
      const parallaxY = springY.get() * 18 * seed.depth;

      return {
        id: seed.id,
        x: seed.nx * viewport.width + driftX + parallaxX,
        y: seed.ny * viewport.height + driftY + parallaxY,
        depth: seed.depth,
      };
    });
  }, [clock, seeds, springX, springY, viewport.height, viewport.width]);

  const lines = useMemo(() => {
    const connections: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; opacity: number }> = [];

    for (let i = 0; i < points.length; i += 1) {
      const p1 = points[i];
      for (let j = i + 1; j < points.length; j += 1) {
        const p2 = points[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 240) {
          connections.push({
            id: `${p1.id}-${p2.id}`,
            x1: p1.x,
            y1: p1.y,
            x2: p2.x,
            y2: p2.y,
            opacity: 1 - distance / 240,
          });
        }
      }
    }

    return connections;
  }, [points]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[var(--bg)]">
      <motion.div
        className="absolute inset-0 opacity-90"
        animate={{
          background: [
            'radial-gradient(1200px 700px at 15% 20%, rgba(99,102,241,0.14), transparent 60%), radial-gradient(900px 500px at 80% 70%, rgba(168,85,247,0.13), transparent 62%), linear-gradient(180deg, #020617 0%, #020617 100%)',
            'radial-gradient(1200px 700px at 30% 30%, rgba(59,130,246,0.16), transparent 63%), radial-gradient(900px 500px at 75% 75%, rgba(217,70,239,0.14), transparent 64%), linear-gradient(180deg, #020617 0%, #020617 100%)',
            'radial-gradient(1200px 700px at 15% 20%, rgba(99,102,241,0.14), transparent 60%), radial-gradient(900px 500px at 80% 70%, rgba(168,85,247,0.13), transparent 62%), linear-gradient(180deg, #020617 0%, #020617 100%)',
          ],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        style={{ x: glowX, y: glowY }}
        className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-blue-500/20 blur-3xl"
      />

      <svg className="absolute inset-0 h-full w-full" width={viewport.width} height={viewport.height}>
        {lines.map((line) => (
          <line
            key={line.id}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="rgba(148,163,184,0.28)"
            strokeWidth={0.8 + line.opacity * 0.6}
            opacity={line.opacity * 0.8}
          />
        ))}
        {points.map((point) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r={1.5 + point.depth * 1.7}
            fill="rgba(226,232,240,0.92)"
            opacity={0.65 + point.depth * 0.2}
          />
        ))}
      </svg>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:56px_56px]" />
    </div>
  );
}
