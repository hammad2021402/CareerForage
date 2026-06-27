import { useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface OrbProps {
  progress: number;
  level: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function OrbOfProgress({ progress = 0, level = 1, className = '' }: OrbProps & { className?: string }) {
  const normalizedProgress = clamp(progress, 0, 100);
  const normalizedLevel = clamp(level, 1, 99);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 180, damping: 18, mass: 0.7 });
  const springRotateY = useSpring(rotateY, { stiffness: 180, damping: 18, mass: 0.7 });

  const glowStrength = useMemo(() => 0.35 + normalizedProgress / 170, [normalizedProgress]);
  const orbitCount = useMemo(() => Math.max(10, Math.min(28, Math.round(10 + normalizedLevel * 0.8))), [normalizedLevel]);

  const lightX = useTransform(springRotateY, [-18, 18], ['38%', '62%']);
  const lightY = useTransform(springRotateX, [-18, 18], ['36%', '64%']);

  const particles = useMemo(
    () =>
      Array.from({ length: orbitCount }).map((_, index) => ({
        id: `particle-${index}`,
        angle: (index / orbitCount) * Math.PI * 2,
        distance: 110 + (index % 5) * 6,
        delay: index * 0.04,
        duration: 8 + (index % 6),
      })),
    [orbitCount]
  );

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width;
    const py = (event.clientY - bounds.top) / bounds.height;

    rotateY.set((px - 0.5) * 26);
    rotateX.set((0.5 - py) * 26);
  };

  const onPointerLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      className={`relative isolate h-[320px] w-[320px] select-none ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <motion.div
        className="absolute inset-0 rounded-[2.25rem] border border-[var(--border)] bg-[var(--surface-card)] backdrop-blur-2xl"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
          boxShadow: `0 0 80px rgba(99,102,241,${glowStrength * 0.33}), inset 0 0 80px rgba(59,130,246,${glowStrength * 0.22})`,
        }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="absolute inset-10 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.14) 22%, rgba(129,140,248,0.32) 48%, rgba(59,130,246,0.44) 72%, rgba(2,6,23,0.82) 100%)',
            boxShadow: `0 0 60px rgba(99,102,241,${glowStrength}), inset 0 -20px 45px rgba(15,23,42,0.55)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <motion.div
            className="absolute inset-[24%] rounded-full bg-gradient-to-br from-blue-300/55 via-indigo-400/35 to-fuchsia-400/35 blur-sm"
            animate={{ scale: [1, 1.08, 1], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <motion.div
          className="absolute -inset-2 rounded-[2.5rem] border border-indigo-400/25"
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            className="absolute block h-1.5 w-1.5 rounded-full bg-blue-200/90 shadow-[0_0_14px_rgba(147,197,253,0.9)]"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) translate(${Math.cos(particle.angle) * particle.distance}px, ${Math.sin(particle.angle) * particle.distance}px)`,
            }}
            animate={{ rotate: 360, opacity: [0.25, 0.95, 0.25] }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}

        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[2.25rem]"
          style={{
            background: useTransform(
              [lightX, lightY],
              ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.24), transparent 43%)`
            ),
          }}
        />
      </motion.div>

      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          <span>Orb of Progress</span>
          <span>Level {normalizedLevel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--border-subtle)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400"
            initial={{ width: 0 }}
            animate={{ width: `${normalizedProgress}%` }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </div>
        <div className="mt-2 text-right text-xl font-semibold text-[var(--text-primary)]">{normalizedProgress}%</div>
      </div>
    </div>
  );
}
