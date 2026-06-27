import { useEffect, useRef, useCallback } from 'react';

/* ── Types ─────────────────────────────────────────── */
interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  phase: 'fadein' | 'travel' | 'fadeout' | 'done';
  phaseProgress: number;
  width: number;
  traveled: number;
  totalTravel: number;
}

/* ── Constants ─────────────────────────────────────── */
const STAR_COUNT        = 110;
const MAX_SHOOTING      = 3;
const SHOOT_INTERVAL_MS = [3000, 6000] as const;
const SHOOT_DURATION_MS = [1000, 1500] as const;

/* ── Helpers ───────────────────────────────────────── */
function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function buildStars(w: number, h: number): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x:            rand(0, w),
    y:            rand(0, h),
    r:            rand(0.4, 1.3),
    opacity:      0,
    baseOpacity:  rand(0.18, 0.38),
    twinkleSpeed: rand(0.0004, 0.0012),
    twinkleOffset:rand(0, Math.PI * 2),
  }));
}

function buildShootingStar(w: number, h: number): ShootingStar {
  const duration = rand(...SHOOT_DURATION_MS);
  const speed    = rand(520, 860);
  const angle    = rand(30, 50) * (Math.PI / 180);
  const vx       = Math.cos(angle) * speed;
  const vy       = Math.sin(angle) * speed;
  const totalTravel = (duration / 1000) * Math.hypot(vx, vy);

  return {
    x:           rand(0, w * 0.6),
    y:           rand(0, h * 0.45),
    vx,
    vy,
    length:      rand(90, 180),
    opacity:     0,
    phase:       'fadein',
    phaseProgress: 0,
    width:       rand(1.1, 1.9),
    traveled:    0,
    totalTravel,
  };
}

/* ── Component ─────────────────────────────────────── */
export default function SpaceBackground() {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const starsRef      = useRef<Star[]>([]);
  const shootingRef   = useRef<ShootingStar[]>([]);
  const mouseRef      = useRef({ x: 0, y: 0 });
  const rafRef        = useRef<number>(0);
  const lastTimeRef   = useRef<number>(0);
  const nextShootRef  = useRef<number>(rand(...SHOOT_INTERVAL_MS));
  const shootTimerRef = useRef<number>(0);
  const cssSizeRef    = useRef({ w: 0, h: 0 });

  /* Build star field */
  const initStars = useCallback((w: number, h: number) => {
    starsRef.current = buildStars(w, h);
  }, []);

  /* Main draw loop */
  const draw = useCallback((ts: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dt  = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = ts;

    const w = cssSizeRef.current.w;
    const h = cssSizeRef.current.h;

    /* Parallax offset — very subtle */
    const px = (mouseRef.current.x / window.innerWidth  - 0.5) * 14;
    const py = (mouseRef.current.y / window.innerHeight - 0.5) * 10;

    ctx.clearRect(0, 0, w, h);

    /* ── Draw stars ──────────────────── */
    starsRef.current.forEach((s) => {
      s.opacity = s.baseOpacity + Math.sin(ts * s.twinkleSpeed + s.twinkleOffset) * 0.07;
      ctx.beginPath();
      ctx.arc(s.x + px * 0.15, s.y + py * 0.15, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,210,255,${Math.max(0, s.opacity)})`;
      ctx.fill();
    });

    /* ── Spawn shooting stars ────────── */
    shootTimerRef.current += dt * 1000;
    if (
      shootTimerRef.current >= nextShootRef.current &&
      shootingRef.current.length < MAX_SHOOTING
    ) {
      shootingRef.current.push(buildShootingStar(w, h));
      shootTimerRef.current = 0;
      nextShootRef.current  = rand(...SHOOT_INTERVAL_MS);
    }

    /* ── Draw & update shooting stars ── */
    shootingRef.current = shootingRef.current.filter((s) => {
      if (s.phase === 'done') return false;

      /* Phase state machine */
      if (s.phase === 'fadein') {
        s.opacity       = Math.min(1, s.opacity + dt * 4.5);
        s.phaseProgress += dt;
        if (s.phaseProgress >= 0.18) { s.phase = 'travel'; s.phaseProgress = 0; }
      } else if (s.phase === 'travel') {
        s.traveled += Math.hypot(s.vx, s.vy) * dt;
        if (s.traveled >= s.totalTravel * 0.72) s.phase = 'fadeout';
      } else if (s.phase === 'fadeout') {
        s.opacity = Math.max(0, s.opacity - dt * 3.8);
        if (s.opacity <= 0) { s.phase = 'done'; return false; }
      }

      /* Move */
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      /* Tail end */
      const tx = s.x - Math.cos(Math.atan2(s.vy, s.vx)) * s.length;
      const ty = s.y - Math.sin(Math.atan2(s.vy, s.vx)) * s.length;

      /* Gradient: head → tail */
      const grad = ctx.createLinearGradient(tx, ty, s.x, s.y);
      grad.addColorStop(0,   `rgba(100,140,255,0)`);
      grad.addColorStop(0.35,`rgba(130,160,255,${s.opacity * 0.28})`);
      grad.addColorStop(0.72,`rgba(160,130,255,${s.opacity * 0.70})`);
      grad.addColorStop(1,   `rgba(210,200,255,${s.opacity})`);

      /* Glow pass */
      ctx.save();
      ctx.filter = 'blur(2.2px)';
      ctx.strokeStyle = grad;
      ctx.lineWidth   = s.width * 2.4;
      ctx.lineCap     = 'round';
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(s.x + px * 0.35, s.y + py * 0.35);
      ctx.stroke();
      ctx.restore();

      /* Sharp core */
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth   = s.width;
      ctx.lineCap     = 'round';
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(s.x + px * 0.35, s.y + py * 0.35);
      ctx.stroke();
      ctx.restore();

      return true;
    });

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  /* Resize handler */
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w   = parent.offsetWidth;
    const h   = parent.offsetHeight;

    cssSizeRef.current = { w, h };

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    initStars(w, h);
  }, [initStars]);

  useEffect(() => {
    handleResize();

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [draw, handleResize]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ display: 'block' }}
    />
  );
}
