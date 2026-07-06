import React, { useEffect, useState, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  gravity: number;
  type: 'confetti' | 'firework';
}

export const InaugurationCurtain: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Trigger curtain opening sequence
  const handleInaugurate = () => {
    if (isOpen) return;
    setIsOpen(true);
    sessionStorage.setItem('sgsits_inauguration_done', 'true');

    // Trigger initial firework bursts in the center
    const canvas = canvasRef.current;
    if (canvas) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      createExplosion(centerX, centerY);
      createExplosion(centerX - 150, centerY - 100);
      createExplosion(centerX + 150, centerY - 100);
    }

    // Set timers to trigger more fireworks as the curtains part
    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas && particlesRef.current.length < 300) {
        createExplosion(
          Math.random() * canvas.width,
          Math.random() * (canvas.height * 0.7)
        );
      }
    }, 400);

    // End animation and unmount after curtains slide fully open
    setTimeout(() => {
      clearInterval(interval);
      setIsRendered(false);
      onComplete();
    }, 3000);
  };

  // Listen to keyboard press (Enter or any key)
  useEffect(() => {
    const handleKeyDown = () => {
      if (!isOpen) {
        handleInaugurate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Particle explosion logic
  const createExplosion = (x: number, y: number) => {
    const colors = ['#ffd700', '#ff4d4d', '#ff9900', '#33cc33', '#3399ff', '#ff33cc', '#ffffff'];
    const particles = particlesRef.current;

    // Firework burst particles (shoot outward in circle)
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01,
        size: Math.random() * 3 + 2,
        gravity: 0.15,
        type: 'firework',
      });
    }

    // Confetti falling particles
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: x + (Math.random() * 60 - 30),
        y: y + (Math.random() * 40 - 20),
        vx: Math.random() * 4 - 2,
        vy: Math.random() * -3 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.01 + 0.005,
        size: Math.random() * 6 + 4,
        gravity: 0.08,
        type: 'confetti',
      });
    }
  };

  // Canvas loop
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

    const updateAndDraw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.type === 'confetti') {
          // Draw spinning rectangles for confetti
          ctx.translate(p.x, p.y);
          ctx.rotate(p.x * 0.05);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        } else {
          // Draw standard circles for firework sparks
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Keep generating confetti falling from the top once curtains start opening
      if (isOpen && Math.random() < 0.25) {
        particles.push({
          x: Math.random() * canvas.width,
          y: -10,
          vx: Math.random() * 2 - 1,
          vy: Math.random() * 2 + 1,
          color: ['#ffd700', '#ff4d4d', '#ff9900', '#33cc33', '#3399ff'][Math.floor(Math.random() * 5)],
          alpha: 1,
          decay: 0.008,
          size: Math.random() * 6 + 4,
          gravity: 0.05,
          type: 'confetti',
        });
      }

      animationFrameRef.current = requestAnimationFrame(updateAndDraw);
    };

    updateAndDraw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div className={`curtain-overlay ${isOpen ? 'open' : ''}`}>
      {/* Self-contained Inauguration styles */}
      <style>{`
        .curtain-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          background-color: #0d0101;
          font-family: 'Outfit', 'Inter', sans-serif;
          user-select: none;
        }

        /* Red Velvet Stage Curtains */
        .curtain-half {
          position: absolute;
          top: 0;
          width: 50.5%; /* Slight overlap to prevent seam gap */
          height: 100%;
          background: 
            radial-gradient(ellipse at 50% 30%, rgba(239, 68, 68, 0.3) 0%, transparent 70%),
            linear-gradient(to right, 
              #4d0000 0%, #800000 6%, #b30000 12%, #660000 18%, 
              #b30000 24%, #e60000 32%, #990000 40%, #b30000 48%, 
              #ff3333 54%, #990000 60%, #b30000 66%, #e60000 74%, 
              #660000 82%, #b30000 88%, #800000 94%, #4d0000 100%);
          background-size: 100% 100%;
          box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.95), 0 0 40px rgba(0,0,0,0.6);
          transition: transform 2.8s cubic-bezier(0.77, 0, 0.175, 1);
          will-change: transform;
          z-index: 10;
        }

        .curtain-left {
          left: 0;
          transform-origin: left center;
          border-right: 4px solid #ffd700;
        }

        .curtain-right {
          right: 0;
          transform-origin: right center;
          border-left: 4px solid #ffd700;
        }

        /* Folding and gathering animation */
        .curtain-overlay.open .curtain-left {
          transform: translateX(-80%) scaleX(0.2);
        }

        .curtain-overlay.open .curtain-right {
          transform: translateX(80%) scaleX(0.2);
        }

        /* Top Hanging Valance/Drape */
        .curtain-valance {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 110px;
          background: linear-gradient(to bottom, 
            #5a0000 0%, #800000 25%, #b30000 50%, #660000 75%, #3d0000 100%);
          border-bottom: 6px double #ffd700;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.8);
          z-index: 20;
          transition: transform 2.4s cubic-bezier(0.77, 0, 0.175, 1);
        }

        .curtain-overlay.open .curtain-valance {
          transform: translateY(-100%);
        }

        /* Plaque Container (Brass & Granite effect) */
        .inauguration-plaque {
          position: relative;
          z-index: 150;
          text-align: center;
          background: linear-gradient(135deg, #111111 0%, #242424 100%);
          border: 4px double #ffd700;
          border-radius: 16px;
          padding: 3rem 4rem;
          max-width: 780px;
          width: 90%;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 215, 0, 0.15);
          color: #ffffff;
          transition: opacity 0.8s ease, transform 0.8s ease;
          backdrop-filter: blur(12px);
        }

        .curtain-overlay.open .inauguration-plaque {
          opacity: 0;
          transform: scale(0.85) translateY(-50px);
          pointer-events: none;
        }

        .institute-header {
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #e2e8f0;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
        }

        .portal-title {
          font-size: 2.1rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          line-height: 1.25;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          background: linear-gradient(135deg, #ffffff 30%, #a1a1aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .plaque-divider {
          height: 2px;
          width: 60%;
          margin: 1.5rem auto;
          background: linear-gradient(to right, transparent, #ffd700, transparent);
        }

        .inaugurated-by-label {
          font-size: 0.95rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #a1a1aa;
          margin-bottom: 0.5rem;
        }

        .minister-name {
          font-size: 2.35rem;
          font-weight: 800;
          background: linear-gradient(135deg, #ffe066 0%, #f5af19 50%, #e65c00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 20px rgba(245, 175, 25, 0.4);
          margin-bottom: 0.5rem;
        }

        .minister-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 0.15rem;
        }

        .govt-label {
          font-size: 0.85rem;
          color: #a1a1aa;
          letter-spacing: 0.05em;
        }

        .date-label {
          font-size: 0.8rem;
          color: #71717a;
          margin-top: 2rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* Glowing Inaugurate Button */
        .inaugurate-button {
          margin-top: 2rem;
          padding: 0.9rem 2.25rem;
          font-size: 0.95rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #0d0101;
          background: linear-gradient(135deg, #ffd700 0%, #f5af19 100%);
          border: none;
          border-radius: 30px;
          cursor: pointer;
          transition: transform 0.2s, filter 0.2s;
          animation: pulse-gold 2s infinite;
        }

        .inaugurate-button:hover {
          transform: scale(1.05);
          filter: brightness(1.1);
        }

        .inaugurate-button:active {
          transform: scale(0.98);
        }

        /* Fireworks Canvas */
        .fireworks-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 110;
        }

        @keyframes pulse-gold {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.6);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(255, 215, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 215, 0, 0);
          }
        }

        @media (max-width: 640px) {
          .inauguration-plaque {
            padding: 2rem 1.5rem;
          }
          .portal-title {
            font-size: 1.5rem;
          }
          .minister-name {
            font-size: 1.75rem;
          }
        }
      `}</style>

      {/* Top Valance */}
      <div className="curtain-valance" />

      {/* Left Curtain */}
      <div className="curtain-half curtain-left" />

      {/* Right Curtain */}
      <div className="curtain-half curtain-right" />

      {/* Plaque text details */}
      <div className="inauguration-plaque">
        <div className="institute-header">SGSITS Indore</div>
        <div className="portal-title">Gate Pass Management System</div>
        
        <div className="plaque-divider" />
        
        <div className="inaugurated-by-label">Inaugurated By</div>
        <div className="minister-name">Shri Inder Singh Parmar</div>
        <div className="minister-title">Hon'ble Education Minister</div>
        <div className="govt-label">Government of Madhya Pradesh</div>
        
        <div className="date-label">July 7, 2026</div>
        
        <button className="inaugurate-button" onClick={handleInaugurate}>
          Click or Press Any Key to Launch
        </button>
      </div>

      {/* Celebration canvas */}
      <canvas ref={canvasRef} className="fireworks-canvas" />
    </div>
  );
};

export default InaugurationCurtain;
