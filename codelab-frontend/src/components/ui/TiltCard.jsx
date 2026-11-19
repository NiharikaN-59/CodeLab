import React, { useRef, useState, useEffect } from 'react';

const TiltCard = ({ children, className = '', style = {}, onClick, maxTilt = 2.5 }) => {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
  });
  const [glareStyle, setGlareStyle] = useState({ opacity: 0, x: 50, y: 50 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current || prefersReducedMotion || isTouch) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = (e.clientX - rect.left) - width / 2;
    const mouseY = (e.clientY - rect.top) - height / 2;
    
    const rotateY = (mouseX / (width / 2)) * maxTilt;
    const rotateX = -(mouseY / (height / 2)) * maxTilt;

    const glareX = ((e.clientX - rect.left) / width) * 100;
    const glareY = ((e.clientY - rect.top) / height) * 100;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.012, 1.012, 1.012)`,
      transition: 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)'
    });
    setGlareStyle({ opacity: 1, x: glareX, y: glareY });
  };

  const handleMouseLeave = () => {
    if (prefersReducedMotion || isTouch) return;
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    });
    setGlareStyle(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        ...style,
        ...tiltStyle,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Specular lighting glare */}
      <div 
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(350px circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255, 255, 255, 0.08), transparent 70%)`,
          opacity: glareStyle.opacity,
          transition: 'opacity 0.3s ease',
          zIndex: 10
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export default TiltCard;
