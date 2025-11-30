import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  angle: number;
  distance: number;
  isInner: boolean;
  flashRate: number;
  flashTimer: number;
  visible: boolean;
}

interface ParticleGalaxyProps {
  className?: string;
  particleCount?: number;
  rotationSpeed?: number;
}

export function ParticleGalaxy({
  className = '',
  particleCount = 150,
  rotationSpeed = 0.001
}: ParticleGalaxyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const rotationRef = useRef<number>(0);

  // Initialize particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles
    particlesRef.current = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxDistance = Math.min(centerX, centerY) * 0.8;

    for (let i = 0; i < particleCount; i++) {
      const isInner = Math.random() > 0.6; // 40% inner particles
      const distance = isInner 
        ? Math.random() * maxDistance * 0.5
        : maxDistance * 0.5 + Math.random() * maxDistance * 0.5;
      
      const angle = Math.random() * Math.PI * 2;
      const size = isInner 
        ? 1 + Math.random() * 1.5
        : 0.5 + Math.random() * 2;
      
      const speed = isInner 
        ? 0.01 + Math.random() * 0.02
        : 0.02 + Math.random() * 0.03;
      
      // Outer particles: blue and white
      // Inner particles: white (for flashing effect)
      const color = isInner 
        ? '#ffffff'
        : Math.random() > 0.3 
          ? '#ffffff' 
          : `hsl(200, ${70 + Math.random() * 30}%, ${40 + Math.random() * 60}%)`;

      particlesRef.current.push({
        x: centerX,
        y: centerY,
        size,
        speed,
        color,
        angle,
        distance,
        isInner,
        flashRate: isInner ? 0.005 + Math.random() * 0.01 : 0,
        flashTimer: 0,
        visible: true
      });
    }

    // Animation loop
    const animate = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      // Clear canvas with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw inner dark circle with gradient
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const innerRadius = maxDistance * 0.5;
      
      const innerGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, innerRadius
      );
      innerGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      innerGradient.addColorStop(1, 'rgba(0, 10, 30, 0.3)');
      ctx.fillStyle = innerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Update rotation
      rotationRef.current += rotationSpeed;

      // Update and draw particles
      particlesRef.current.forEach(particle => {
        // Update particle position with rotation
        particle.angle += particle.speed;
        const rotatedAngle = particle.angle + rotationRef.current;
        
        particle.x = centerX + Math.cos(rotatedAngle) * particle.distance;
        particle.y = centerY + Math.sin(rotatedAngle) * particle.distance;

        // Handle inner particle flashing effect
        if (particle.isInner) {
          particle.flashTimer += particle.flashRate;
          if (particle.flashTimer >= 1) {
            particle.flashTimer = 0;
            particle.visible = Math.random() > 0.7; // 30% chance to flash
          }
        }

        // Draw particle
        if (particle.visible) {
          ctx.fillStyle = particle.color;
          ctx.globalAlpha = particle.isInner ? 0.7 + Math.random() * 0.3 : 0.4 + Math.random() * 0.6;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Add glow effect for outer particles
          if (!particle.isInner) {
            ctx.shadowBlur = particle.size * 3;
            ctx.shadowColor = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleCount, rotationSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full h-full pointer-events-none z-0 ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1
      }}
    />
  );
}

export default ParticleGalaxy;
