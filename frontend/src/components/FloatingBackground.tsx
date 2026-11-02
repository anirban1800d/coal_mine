import { useEffect, useRef } from 'react';

export default function FloatingBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;

    if (prefersReducedMotion || isTouch) return;

    let rafId: number;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized offset from center: -1 to 1
      const { innerWidth, innerHeight } = window;
      targetX = ((e.clientX / innerWidth) - 0.5) * 20; // max +/- 10px
      targetY = ((e.clientY / innerHeight) - 0.5) * 20;
    };

    const updateParallax = () => {
      // Smooth lerp
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      if (parallaxRef.current) {
        parallaxRef.current.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
      }

      rafId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* ── 1. Soft Ambient Glowing Orbs (Deep Atmosphere) ─────────────── */}
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[120px] animate-orb-drift-1" />
      <div className="absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[140px] animate-orb-drift-2" />
      <div className="absolute -bottom-40 left-1/4 h-[450px] w-[450px] rounded-full bg-cyan-600/8 blur-[130px] animate-orb-drift-3" />

      {/* ── 2. Parallax-responsive Floating Elements Container ─────────── */}
      <div ref={parallaxRef} className="absolute inset-0 will-change-transform">
        
        {/* ── Technical Constellation / RAG Knowledge Graph ───────────── */}
        <svg
          className="absolute top-16 right-[12%] h-72 w-80 opacity-25 animate-float-slow"
          viewBox="0 0 320 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle dotted network connections */}
          <line x1="60" y1="50" x2="160" y2="80" stroke="var(--color-cpcb)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <line x1="160" y1="80" x2="260" y2="40" stroke="var(--color-cpcb)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <line x1="160" y1="80" x2="200" y2="180" stroke="var(--color-dgms)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <line x1="60" y1="50" x2="90" y2="170" stroke="var(--color-cpcb)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <line x1="90" y1="170" x2="200" y2="180" stroke="var(--color-dgms)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
          <line x1="200" y1="180" x2="280" y2="220" stroke="var(--color-dgms)" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />

          {/* AI Knowledge Nodes */}
          <circle cx="60" cy="50" r="3.5" fill="var(--color-cpcb)" opacity="0.8" />
          <circle cx="60" cy="50" r="7" stroke="var(--color-cpcb)" strokeWidth="1" opacity="0.3" />
          
          <circle cx="160" cy="80" r="4.5" fill="var(--color-cpcb)" opacity="0.9" />
          <circle cx="160" cy="80" r="9" stroke="var(--color-cpcb)" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />

          <circle cx="260" cy="40" r="3" fill="var(--color-cpcb)" opacity="0.7" />
          <circle cx="90" cy="170" r="3" fill="var(--color-cpcb)" opacity="0.6" />
          
          <circle cx="200" cy="180" r="4" fill="var(--color-dgms)" opacity="0.8" />
          <circle cx="200" cy="180" r="8" stroke="var(--color-dgms)" strokeWidth="1" opacity="0.3" />

          <circle cx="280" cy="220" r="3" fill="var(--color-dgms)" opacity="0.7" />
        </svg>

        {/* ── Left Side Technical Hexagon & Concentric Rings ──────────── */}
        <svg
          className="absolute top-1/4 left-[6%] h-48 w-48 opacity-20 animate-float-reverse"
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wireframe mineral/geological lattice hexagon */}
          <polygon
            points="80,15 140,50 140,110 80,145 20,110 20,50"
            stroke="var(--color-cpcb)"
            strokeWidth="1"
            opacity="0.6"
          />
          <polygon
            points="80,35 120,60 120,100 80,125 40,100 40,60"
            stroke="var(--color-cpcb)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.4"
          />
          <circle cx="80" cy="80" r="3" fill="var(--color-cpcb)" opacity="0.8" />
        </svg>

        {/* ── Radar Crosshair Scanner Accents ─────────────────────────── */}
        <svg
          className="absolute bottom-28 left-[15%] h-36 w-36 opacity-15 animate-rotate-slow"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="60" cy="60" r="50" stroke="var(--color-cpcb)" strokeWidth="1" strokeDasharray="6 6" />
          <circle cx="60" cy="60" r="30" stroke="var(--color-cpcb)" strokeWidth="1" opacity="0.5" />
          <line x1="60" y1="0" x2="60" y2="120" stroke="var(--color-cpcb)" strokeWidth="0.8" opacity="0.4" />
          <line x1="0" y1="60" x2="120" y2="60" stroke="var(--color-cpcb)" strokeWidth="0.8" opacity="0.4" />
        </svg>

        {/* ── Technical GIS Survey Crosses (+) ─────────────────────────── */}
        <div className="absolute top-[18%] left-[28%] font-mono text-[11px] text-cyan-400/20 select-none animate-pulse-soft">
          + 23°47'N 86°25'E
        </div>
        <div className="absolute top-[45%] right-[22%] font-mono text-[11px] text-blue-400/20 select-none animate-pulse-soft" style={{ animationDelay: '3s' }}>
          + CPCB.AIR.04
        </div>
        <div className="absolute bottom-[20%] right-[10%] font-mono text-[11px] text-cyan-400/20 select-none animate-pulse-soft" style={{ animationDelay: '6s' }}>
          + DGMS.MMR.124
        </div>

        {/* ── Floating Micro-Particles ─────────────────────────────────── */}
        {/* Layer A - Cyan / High elevation */}
        <span className="particle particle-1" style={{ top: '12%', left: '18%', animationDuration: '9s', animationDelay: '0s' }} />
        <span className="particle particle-2" style={{ top: '22%', left: '75%', animationDuration: '14s', animationDelay: '1.5s' }} />
        <span className="particle particle-3" style={{ top: '35%', left: '42%', animationDuration: '11s', animationDelay: '3s' }} />
        <span className="particle particle-1" style={{ top: '48%', left: '88%', animationDuration: '16s', animationDelay: '2s' }} />
        <span className="particle particle-2" style={{ top: '62%', left: '14%', animationDuration: '12s', animationDelay: '4.5s' }} />
        <span className="particle particle-3" style={{ top: '78%', left: '60%', animationDuration: '15s', animationDelay: '1s' }} />
        <span className="particle particle-1" style={{ top: '85%', left: '30%', animationDuration: '10s', animationDelay: '5s' }} />

        {/* Layer B - Blue / Medium elevation */}
        <span className="particle particle-blue particle-2" style={{ top: '15%', left: '62%', animationDuration: '13s', animationDelay: '2.5s' }} />
        <span className="particle particle-blue particle-1" style={{ top: '28%', left: '10%', animationDuration: '17s', animationDelay: '0.8s' }} />
        <span className="particle particle-blue particle-3" style={{ top: '42%', left: '82%', animationDuration: '12s', animationDelay: '3.7s' }} />
        <span className="particle particle-blue particle-2" style={{ top: '56%', left: '34%', animationDuration: '15s', animationDelay: '4.2s' }} />
        <span className="particle particle-blue particle-1" style={{ top: '70%', left: '72%', animationDuration: '11s', animationDelay: '2.1s' }} />
        <span className="particle particle-blue particle-3" style={{ top: '90%', left: '80%', animationDuration: '18s', animationDelay: '1.2s' }} />

        {/* Layer C - Very subtle faint drifting sparks */}
        <span className="particle particle-faint particle-1" style={{ top: '8%', left: '45%', animationDuration: '16s', animationDelay: '6s' }} />
        <span className="particle particle-faint particle-2" style={{ top: '32%', left: '92%', animationDuration: '20s', animationDelay: '3.2s' }} />
        <span className="particle particle-faint particle-1" style={{ top: '68%', left: '5%', animationDuration: '14s', animationDelay: '7s' }} />
        <span className="particle particle-faint particle-3" style={{ top: '82%', left: '48%', animationDuration: '19s', animationDelay: '4s' }} />

      </div>
    </div>
  );
}

