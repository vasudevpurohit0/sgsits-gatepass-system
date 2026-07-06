import React, { useEffect, useState, useRef } from 'react';

interface GoldParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  wobble: number;
  wobbleSpeed: number;
}

export const InaugurationCurtain: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [activeScene, setActiveScene] = useState<number>(1);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [isRendered, setIsRendered] = useState<boolean>(true);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<GoldParticle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const spotlightRef = useRef<{ x: number; y: number; tx: number; ty: number }>({
    x: 50,
    y: 40,
    tx: 50,
    ty: 40
  });

  // Handle launch activation (Scene 6)
  const handleLaunch = () => {
    if (isLeaving || activeScene < 5) return;
    setIsLeaving(true);
    sessionStorage.setItem('sgsits_inauguration_done', 'true');

    // Smooth transition delay to match CSS fade-out
    setTimeout(() => {
      setIsRendered(false);
      onComplete();
    }, 1200);
  };

  // Keyboard trigger (Enter key or Space) to launch once ready
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeScene === 5 && !isLeaving && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleLaunch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScene, isLeaving]);

  // Ceremonial sequence timers
  useEffect(() => {
    // Scene 2: 1.0s (Light expands, particles emerge, logo fades in)
    const timer2 = setTimeout(() => setActiveScene(2), 1000);

    // Scene 3: 3.0s (SGSITS Indore text, main title, subtitle, gold line draw)
    const timer3 = setTimeout(() => setActiveScene(3), 3000);

    // Scene 4: 5.0s (Official Dedication staggered text)
    const timer4 = setTimeout(() => setActiveScene(4), 5000);

    // Scene 5: 7.2s (Launch Button reveals and pulses)
    const timer5 = setTimeout(() => setActiveScene(5), 7200);

    return () => {
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);

  // Canvas loop: gold particles & slow spotlight sweeps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize clean golden particles
    const particles = particlesRef.current;
    if (particles.length === 0) {
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: Math.random() * 0.4 - 0.2,
          vy: Math.random() * -0.5 - 0.2,
          size: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.5 + 0.1,
          wobble: Math.random() * Math.PI,
          wobbleSpeed: Math.random() * 0.02 + 0.01
        });
      }
    }

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Move & draw subtle golden spotlight target coordinates
      const spot = spotlightRef.current;
      // Change target randomly
      if (Math.abs(spot.x - spot.tx) < 1 && Math.abs(spot.y - spot.ty) < 1) {
        spot.tx = 30 + Math.random() * 40; // between 30% and 70%
        spot.ty = 25 + Math.random() * 30; // between 25% and 55%
      }
      // Ease spotlight movement
      spot.x += (spot.tx - spot.x) * 0.005;
      spot.y += (spot.ty - spot.y) * 0.005;

      // Draw custom CSS variable spotlight path (via updates to root styles)
      document.documentElement.style.setProperty('--spotlight-x', `${spot.x}%`);
      document.documentElement.style.setProperty('--spotlight-y', `${spot.y}%`);

      // 2. Render drifting gold particles (Scene 2+)
      if (activeScene >= 2) {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.wobble += p.wobbleSpeed;
          p.x += p.vx + Math.sin(p.wobble) * 0.15;
          p.y += p.vy;

          // Wrap around edges
          if (p.y < -10) {
            p.y = canvas.height + 10;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < -10 || p.x > canvas.width + 10) {
            p.x = Math.random() * canvas.width;
          }

          // Draw particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
          ctx.fill();
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [activeScene]);

  if (!isRendered) return null;

  return (
    <div className={`inaugural-overlay scene-${activeScene} ${isLeaving ? 'leaving' : ''}`}>
      <style>{`
        /* Root properties */
        :root {
          --spotlight-x: 50%;
          --spotlight-y: 40%;
        }

        /* Fullscreen Container */
        .inaugural-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background-color: #09090b; /* Matte black */
          color: #ffffff;
          font-family: 'Outfit', 'Inter', sans-serif;
          overflow: hidden;
          transition: opacity 1.2s cubic-bezier(0.25, 1, 0.5, 1), filter 1.2s ease;
          user-select: none;
        }

        /* Faint Spotlight overlay */
        .inaugural-spotlight {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle 500px at var(--spotlight-x) var(--spotlight-y), rgba(212, 175, 55, 0.05) 0%, transparent 100%);
          pointer-events: none;
          z-index: 2;
          opacity: 0;
          transition: opacity 2s ease;
        }
        .scene-2 .inaugural-spotlight,
        .scene-3 .inaugural-spotlight,
        .scene-4 .inaugural-spotlight,
        .scene-5 .inaugural-spotlight {
          opacity: 1;
        }

        /* Center Golden Light Source */
        .center-glow {
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 2.5s ease, transform 2.5s ease;
          transform: scale(0.6);
          pointer-events: none;
          z-index: 1;
        }
        .scene-1 .center-glow {
          opacity: 0.4;
        }
        .scene-2 .center-glow,
        .scene-3 .center-glow,
        .scene-4 .center-glow,
        .scene-5 .center-glow {
          opacity: 1;
          transform: scale(1.4);
        }

        /* Canvas particles layer */
        .particles-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 3;
        }

        /* Ceremony Plaque Container */
        .ceremonial-plaque {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
          margin-bottom: 4rem; /* offset for footer */
        }

        /* Logo reveal states */
        .logo-container {
          opacity: 0;
          transform: translateY(16px) scale(0.98);
          transition: opacity 1.5s cubic-bezier(0.25, 1, 0.5, 1), transform 1.5s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .scene-2 .logo-container,
        .scene-3 .logo-container,
        .scene-4 .logo-container,
        .scene-5 .logo-container {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .plaque-logo {
          width: 76px;
          height: 76px;
          object-fit: contain;
          filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.15));
        }

        /* Institution Header */
        .inst-header {
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.22em;
          color: #e2e8f0;
          text-transform: uppercase;
          margin-top: 1.25rem;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 1.2s ease 0.2s, transform 1.2s ease 0.2s;
        }
        .scene-3 .inst-header,
        .scene-4 .inst-header,
        .scene-5 .inst-header {
          opacity: 0.7;
          transform: translateY(0);
        }

        /* Main App Title */
        .main-title {
          font-size: 2.85rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: #ffffff;
          margin-top: 1.25rem;
          text-transform: uppercase;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.4s, transform 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.4s;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        .scene-3 .main-title,
        .scene-4 .main-title,
        .scene-5 .main-title {
          opacity: 1;
          transform: translateY(0);
        }

        /* Subtitle */
        .tagline {
          font-size: 1.05rem;
          font-weight: 400;
          color: #a1a1aa; /* Zinc-400 */
          margin-top: 0.5rem;
          letter-spacing: 0.01em;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.6s, transform 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.6s;
        }
        .scene-3 .tagline,
        .scene-4 .tagline,
        .scene-5 .tagline {
          opacity: 0.8;
          transform: translateY(0);
        }

        /* Gold Divider Drawing effect */
        .gold-divider {
          position: relative;
          height: 1px;
          width: 220px;
          background: linear-gradient(to right, transparent, #D4AF37 50%, transparent);
          margin: 2.25rem auto;
          transform: scaleX(0);
          transition: transform 1.8s cubic-bezier(0.25, 1, 0.5, 1) 0.8s;
          overflow: hidden;
        }
        .scene-3 .gold-divider,
        .scene-4 .gold-divider,
        .scene-5 .gold-divider {
          transform: scaleX(1);
        }

        /* Gold divider streak animation on exit */
        .gold-divider.streak::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, #ffffff, transparent);
          animation: streak-glow 0.8s ease-out forwards;
        }
        @keyframes streak-glow {
          0% { left: -50%; }
          100% { left: 150%; }
        }

        /* Staggered Dedication Layout */
        .dedication-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.75rem;
        }
        .ded-line {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 1.2s cubic-bezier(0.25, 1, 0.5, 1), transform 1.2s cubic-bezier(0.25, 1, 0.5, 1);
        }
        
        .scene-4 .ded-line.line-1, .scene-5 .ded-line.line-1 { opacity: 0.5; transform: translateY(0); transition-delay: 0.1s; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em; color: #a1a1aa; }
        .scene-4 .ded-line.line-2, .scene-5 .ded-line.line-2 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 0.4s; 
          font-size: 1.85rem; 
          font-weight: 700; 
          color: #D4AF37; 
          margin: 0.25rem 0;
          text-shadow: 0 0 15px rgba(212, 175, 55, 0.18);
        }
        .scene-4 .ded-line.line-3, .scene-5 .ded-line.line-3 { opacity: 0.85; transform: translateY(0); transition-delay: 0.7s; font-size: 1rem; font-weight: 500; color: #f4f4f5; }
        .scene-4 .ded-line.line-4, .scene-5 .ded-line.line-4 { opacity: 0.65; transform: translateY(0); transition-delay: 1.0s; font-size: 0.85rem; color: #a1a1aa; }
        .scene-4 .ded-line.line-5, .scene-5 .ded-line.line-5 { opacity: 0.4; transform: translateY(0); transition-delay: 1.3s; font-size: 0.8rem; letter-spacing: 0.08em; margin-top: 1rem; color: #71717a; }

        /* Launch Button */
        .btn-wrapper {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.2s, transform 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.2s;
          margin-top: 3.5rem;
        }
        .scene-5 .btn-wrapper {
          opacity: 1;
          transform: translateY(0);
        }
        .btn-launch {
          position: relative;
          padding: 0.95rem 2.85rem;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #D4AF37;
          background: transparent;
          border: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 30px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
          animation: gold-pulse 2s infinite;
        }
        .btn-launch:hover:not(:disabled) {
          border-color: #D4AF37;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.25);
          color: #ffffff;
          background: rgba(212, 175, 55, 0.08);
          transform: translateY(-1px);
        }
        .btn-launch:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn-launch:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        @keyframes gold-pulse {
          0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
        }

        /* Ceremonial Footer */
        .ceremonial-footer {
          position: absolute;
          bottom: 2rem;
          text-align: center;
          font-size: 0.7rem;
          color: #52525b; /* Zinc-600 */
          letter-spacing: 0.1em;
          line-height: 1.7;
          text-transform: uppercase;
          z-index: 10;
          opacity: 0;
          transition: opacity 1.8s ease 1s;
        }
        .scene-3 .ceremonial-footer,
        .scene-4 .ceremonial-footer,
        .scene-5 .ceremonial-footer {
          opacity: 0.55;
        }

        /* Leaving state transition */
        .inaugural-overlay.leaving {
          opacity: 0;
          filter: blur(10px);
          transform: scale(0.985);
        }

        @media (max-width: 640px) {
          .main-title { font-size: 2.1rem; }
          .minister-name { font-size: 1.5rem; }
          .ceremonial-plaque { padding: 1.25rem; }
        }
      `}</style>

      {/* Backdrop spotlight */}
      <div className="inaugural-spotlight" />

      {/* Centered glow light */}
      <div className="center-glow" />

      {/* Floating Gold Particles Canvas */}
      <canvas ref={canvasRef} className="particles-canvas" />

      {/* Plaque content */}
      <div className="ceremonial-plaque">
        {/* SGSITS Logo */}
        <div className="logo-container">
          <img src="/SGSITS_LOGO.png" alt="SGSITS Logo" className="plaque-logo" />
        </div>

        {/* Inst Name */}
        <div className="inst-header">SGSITS Indore</div>

        {/* Title */}
        <div className="main-title">SGSITS Smart Access</div>

        {/* Subtitle */}
        <div className="tagline">Digital Campus Access & Visitor Management Platform</div>

        {/* Gold Divider Line */}
        <div className={`gold-divider ${isLeaving ? 'streak' : ''}`} />

        {/* Dedication text (Scene 4+) */}
        <div className="dedication-box">
          <div className="ded-line line-1">Inaugurated by</div>
          <div className="ded-line line-2">Shri Inder Singh Parmar</div>
          <div className="ded-line line-3">Hon'ble Higher Education Minister</div>
          <div className="ded-line line-4">Government of Madhya Pradesh</div>
          <div className="ded-line line-5">07 July 2026</div>
        </div>

        {/* Launch Button (Scene 5+) */}
        <div className="btn-wrapper">
          <button 
            className="btn-launch" 
            onClick={handleLaunch} 
            disabled={activeScene < 5 || isLeaving}
          >
            Launch Portal
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="ceremonial-footer">
        Designed & Developed at SGSITS<br/>
        Digital Campus Initiative
      </div>
    </div>
  );
};

export default InaugurationCurtain;
