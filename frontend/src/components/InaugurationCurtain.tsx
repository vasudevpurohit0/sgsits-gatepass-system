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
  const [isOpen, setIsOpen] = useState<boolean>(false);
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
    if (isOpen || activeScene < 5) return;
    setIsOpen(true);
    sessionStorage.setItem('sgsits_inauguration_done', 'true');

    // Trigger celebratory canvas burst
    const canvas = canvasRef.current;
    if (canvas) {
      particlesRef.current = []; // Clear old particles
      createExplosion(canvas.width / 2, canvas.height / 2);
    }

    // Smooth transition delay to match curtain opening duration
    setTimeout(() => {
      setIsRendered(false);
      onComplete();
    }, 2800);
  };

  // Keyboard trigger (Enter key or Space) to launch once ready
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeScene === 5 && !isOpen && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleLaunch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScene, isOpen]);

  // Ceremonial sequence timers
  useEffect(() => {
    // Scene 2: 1.0s (Light expands, particles emerge, logo fades in)
    const timer2 = setTimeout(() => setActiveScene(2), 1000);

    // Scene 3: 2.5s (SGSITS Indore text, main title, subtitle, gold line draw)
    const timer3 = setTimeout(() => setActiveScene(3), 2500);

    // Scene 4: 4.2s (Official Dedication staggered text)
    const timer4 = setTimeout(() => setActiveScene(4), 4200);

    // Scene 5: 6.0s (Launch Button reveals and pulses)
    const timer5 = setTimeout(() => setActiveScene(5), 6000);

    return () => {
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);

  // Particle explosion logic for celebration
  const createExplosion = (x: number, y: number) => {
    const particles = particlesRef.current;
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 3;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 1.5 + 0.8,
        alpha: 1,
        wobble: Math.random() * Math.PI,
        wobbleSpeed: Math.random() * 0.02 + 0.01
      });
    }
  };

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

    // Initialize small set of drifting golden particles (optimized for mobile)
    const particles = particlesRef.current;
    if (particles.length === 0) {
      const initialCount = window.innerWidth < 640 ? 15 : 30;
      for (let i = 0; i < initialCount; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: Math.random() * 0.3 - 0.15,
          vy: Math.random() * -0.4 - 0.15,
          size: Math.random() * 1.2 + 0.4,
          alpha: Math.random() * 0.4 + 0.1,
          wobble: Math.random() * Math.PI,
          wobbleSpeed: Math.random() * 0.02 + 0.01
        });
      }
    }

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Move & draw subtle golden spotlight target coordinates
      const spot = spotlightRef.current;
      if (Math.abs(spot.x - spot.tx) < 1 && Math.abs(spot.y - spot.ty) < 1) {
        spot.tx = 35 + Math.random() * 30; // 35% to 65%
        spot.ty = 30 + Math.random() * 20; // 30% to 50%
      }
      spot.x += (spot.tx - spot.x) * 0.006;
      spot.y += (spot.ty - spot.y) * 0.006;

      document.documentElement.style.setProperty('--spotlight-x', `${spot.x}%`);
      document.documentElement.style.setProperty('--spotlight-y', `${spot.y}%`);

      // 2. Render drifting gold particles
      if (activeScene >= 2) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.wobble += p.wobbleSpeed;
          p.x += p.vx + Math.sin(p.wobble) * 0.1;
          p.y += p.vy;

          if (isOpen) {
            // Apply decay to burst particles
            p.alpha -= 0.015;
            if (p.alpha <= 0) {
              particles.splice(i, 1);
              continue;
            }
          } else {
            // Standard drift wrapping
            if (p.y < -10) {
              p.y = canvas.height + 10;
              p.x = Math.random() * canvas.width;
            }
          }

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
  }, [activeScene, isOpen]);

  if (!isRendered) return null;

  return (
    <div className={`inaugural-overlay scene-${activeScene} ${isOpen ? 'open' : ''}`}>
      <style>{`
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
          background-color: #0c0202; /* Warm dark backdrop */
          color: #ffffff;
          font-family: 'Outfit', 'Inter', sans-serif;
          overflow: hidden;
          user-select: none;
        }

        /* Red Velvet Stage Curtains */
        .curtain-half {
          position: absolute;
          top: 0;
          width: 50.5%; /* Slight overlap to prevent center gap */
          height: 100%;
          background: 
            radial-gradient(ellipse at 50% 30%, rgba(239, 68, 68, 0.25) 0%, transparent 70%),
            linear-gradient(to right, 
              #420000 0%, #6e0000 6%, #9c0000 12%, #540000 18%, 
              #9c0000 24%, #c90000 32%, #850000 40%, #9c0000 48%, 
              #e62e2e 54%, #850000 60%, #9c0000 66%, #c90000 74%, 
              #540000 82%, #9c0000 88%, #6e0000 94%, #420000 100%);
          background-size: 100% 100%;
          box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.95), 0 0 40px rgba(0,0,0,0.6);
          transition: transform 2.6s cubic-bezier(0.77, 0, 0.175, 1);
          will-change: transform;
          z-index: 10;
        }

        .curtain-left {
          left: 0;
          transform-origin: left center;
          border-right: 3px solid #D4AF37;
        }

        .curtain-right {
          right: 0;
          transform-origin: right center;
          border-left: 3px solid #D4AF37;
        }

        /* Folding and parting animation on launch */
        .inaugural-overlay.open .curtain-left {
          transform: translateX(-82%) scaleX(0.2);
        }

        .inaugural-overlay.open .curtain-right {
          transform: translateX(82%) scaleX(0.2);
        }

        /* Top Hanging Valance */
        .curtain-valance {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100px;
          background: linear-gradient(to bottom, 
            #520000 0%, #730000 25%, #9e0000 50%, #5c0000 75%, #330000 100%);
          border-bottom: 5px double #D4AF37;
          box-shadow: 0 12px 25px rgba(0, 0, 0, 0.85);
          z-index: 20;
          transition: transform 2.2s cubic-bezier(0.77, 0, 0.175, 1);
          will-change: transform;
        }

        .inaugural-overlay.open .curtain-valance {
          transform: translateY(-100%);
        }

        /* Faint Spotlight overlay on curtains */
        .inaugural-spotlight {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle 500px at var(--spotlight-x) var(--spotlight-y), rgba(212, 175, 55, 0.08) 0%, transparent 100%);
          pointer-events: none;
          z-index: 12;
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
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.14) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 2.5s ease, transform 2.5s ease;
          transform: scale(0.7);
          pointer-events: none;
          z-index: 11;
        }
        .scene-1 .center-glow {
          opacity: 0.4;
        }
        .scene-2 .center-glow,
        .scene-3 .center-glow,
        .scene-4 .center-glow,
        .scene-5 .center-glow {
          opacity: 1;
          transform: scale(1.3);
        }

        /* Canvas particles layer */
        .particles-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 13;
        }

        /* Ceremonial Plaque Container (Marble & Gold frame) */
        .ceremonial-plaque {
          position: relative;
          z-index: 15;
          width: 90%;
          max-width: 740px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2.5rem 3.5rem;
          margin-bottom: 2rem;
          background: linear-gradient(135deg, rgba(17, 17, 17, 0.9) 0%, rgba(30, 30, 30, 0.95) 100%);
          border: 4px double #D4AF37;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 175, 55, 0.12);
          transition: opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease;
          backdrop-filter: blur(8px);
          will-change: transform, opacity;
        }

        .inaugural-overlay.open .ceremonial-plaque {
          opacity: 0;
          transform: scale(0.9) translateY(-30px);
          filter: blur(8px);
          pointer-events: none;
        }

        /* Logo reveal states */
        .logo-container {
          opacity: 0;
          transform: translateY(12px) scale(0.98);
          transition: opacity 1.4s cubic-bezier(0.25, 1, 0.5, 1), transform 1.4s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .scene-2 .logo-container,
        .scene-3 .logo-container,
        .scene-4 .logo-container,
        .scene-5 .logo-container {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .plaque-logo {
          width: 68px;
          height: 68px;
          object-fit: contain;
          filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.12));
        }

        /* Institution Header */
        .inst-header {
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.2em;
          color: #e2e8f0;
          text-transform: uppercase;
          margin-top: 1rem;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 1.2s ease 0.15s, transform 1.2s ease 0.15s;
        }
        .scene-3 .inst-header,
        .scene-4 .inst-header,
        .scene-5 .inst-header {
          opacity: 0.7;
          transform: translateY(0);
        }

        /* Main App Title */
        .main-title {
          font-size: 2.4rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #ffffff;
          margin-top: 1rem;
          text-transform: uppercase;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 1.4s cubic-bezier(0.25, 1, 0.5, 1) 0.35s, transform 1.4s cubic-bezier(0.25, 1, 0.5, 1) 0.35s;
        }
        .scene-3 .main-title,
        .scene-4 .main-title,
        .scene-5 .main-title {
          opacity: 1;
          transform: translateY(0);
        }

        /* Subtitle */
        .tagline {
          font-size: 0.95rem;
          font-weight: 400;
          color: #a1a1aa;
          margin-top: 0.4rem;
          letter-spacing: 0.01em;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 1.4s cubic-bezier(0.25, 1, 0.5, 1) 0.55s, transform 1.4s cubic-bezier(0.25, 1, 0.5, 1) 0.55s;
        }
        .scene-3 .tagline,
        .scene-4 .tagline,
        .scene-5 .tagline {
          opacity: 0.8;
          transform: translateY(0);
        }

        /* Gold Divider Line */
        .gold-divider {
          position: relative;
          height: 1px;
          width: 200px;
          background: linear-gradient(to right, transparent, #D4AF37 50%, transparent);
          margin: 1.75rem auto;
          transform: scaleX(0);
          transition: transform 1.6s cubic-bezier(0.25, 1, 0.5, 1) 0.75s;
        }
        .scene-3 .gold-divider,
        .scene-4 .gold-divider,
        .scene-5 .gold-divider {
          transform: scaleX(1);
        }

        /* Staggered Dedication Layout */
        .dedication-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          margin-top: 0.5rem;
        }
        .ded-line {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 1.1s cubic-bezier(0.25, 1, 0.5, 1), transform 1.1s cubic-bezier(0.25, 1, 0.5, 1);
        }
        
        .scene-4 .ded-line.line-1, .scene-5 .ded-line.line-1 { opacity: 0.5; transform: translateY(0); transition-delay: 0.1s; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; }
        .scene-4 .ded-line.line-2, .scene-5 .ded-line.line-2 { 
          opacity: 1; 
          transform: translateY(0); 
          transition-delay: 0.35s; 
          font-size: 1.65rem; 
          font-weight: 700; 
          color: #D4AF37; 
          margin: 0.2rem 0;
          text-shadow: 0 0 10px rgba(212, 175, 55, 0.15);
        }
        .scene-4 .ded-line.line-3, .scene-5 .ded-line.line-3 { opacity: 0.85; transform: translateY(0); transition-delay: 0.65s; font-size: 0.95rem; font-weight: 500; color: #f4f4f5; }
        .scene-4 .ded-line.line-4, .scene-5 .ded-line.line-4 { opacity: 0.65; transform: translateY(0); transition-delay: 0.95s; font-size: 0.8rem; color: #a1a1aa; }
        .scene-4 .ded-line.line-5, .scene-5 .ded-line.line-5 { opacity: 0.4; transform: translateY(0); transition-delay: 1.2s; font-size: 0.75rem; letter-spacing: 0.08em; margin-top: 0.75rem; color: #71717a; }

        /* Launch Button */
        .btn-wrapper {
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 1.4s cubic-bezier(0.25, 1, 0.5, 1) 0.15s, transform 1.4s cubic-bezier(0.25, 1, 0.5, 1) 0.15s;
          margin-top: 2.5rem;
        }
        .scene-5 .btn-wrapper {
          opacity: 1;
          transform: translateY(0);
        }
        .btn-launch {
          position: relative;
          padding: 0.85rem 2.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #D4AF37;
          background: transparent;
          border: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 30px;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: gold-pulse 2s infinite;
          will-change: transform, box-shadow;
        }
        .btn-launch:hover:not(:disabled) {
          border-color: #D4AF37;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.25);
          color: #ffffff;
          background: rgba(212, 175, 55, 0.06);
          transform: translateY(-1px);
        }
        .btn-launch:active:not(:disabled) {
          transform: translateY(1px);
        }
        .btn-launch:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }
        
        @keyframes gold-pulse {
          0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.35); }
          70% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
          100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
        }

        /* Ceremonial Footer */
        .ceremonial-footer {
          position: absolute;
          bottom: 1.5rem;
          text-align: center;
          font-size: 0.65rem;
          color: #52525b;
          letter-spacing: 0.08em;
          line-height: 1.6;
          text-transform: uppercase;
          z-index: 15;
          opacity: 0;
          transition: opacity 1.5s ease 0.8s;
        }
        .scene-3 .ceremonial-footer,
        .scene-4 .ceremonial-footer,
        .scene-5 .ceremonial-footer {
          opacity: 0.5;
        }
        .inaugural-overlay.open .ceremonial-footer {
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        /* Mobile specific layout fixes */
        @media (max-width: 640px) {
          .ceremonial-plaque {
            padding: 1.5rem 1rem;
            max-width: 90%;
            margin-bottom: 3.5rem;
          }
          .main-title { font-size: 1.75rem; margin-top: 0.75rem; }
          .tagline { font-size: 0.8rem; }
          .ded-line.line-2 { font-size: 1.35rem; }
          .ded-line.line-3 { font-size: 0.85rem; }
          .btn-wrapper { margin-top: 2rem; }
          .btn-launch { padding: 0.75rem 2rem; font-size: 0.8rem; }
          .curtain-valance { height: 75px; }
        }
      `}</style>

      {/* Backdrop spotlight */}
      <div className="inaugural-spotlight" />

      {/* Centered glow light */}
      <div className="center-glow" />

      {/* Top Valance */}
      <div className="curtain-valance" />

      {/* Left Curtain */}
      <div className="curtain-half curtain-left" />

      {/* Right Curtain */}
      <div className="curtain-half curtain-right" />

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
        <div className="gold-divider" />

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
            disabled={activeScene < 5 || isOpen}
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
