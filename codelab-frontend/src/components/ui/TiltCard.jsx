import React, { useRef, useState, useEffect } from 'react';

const TiltCard = ({ children, className = '', style = {}, onClick }) => {
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const handleMouseMove = (e) => {
    if (!cardRef.current || prefersReducedMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = (e.clientX - rect.left) - width / 2;
    const mouseY = (e.clientY - rect.top) - height / 2;
    
    // Very subtle 1deg rotation
    const rotateY = (mouseX / (width / 2)) * 1;
    const rotateX = -(mouseY / (height / 2)) * 1;
    
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.002, 1.002, 1.002)`,
      transition: 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  const handleMouseLeave = () => {
    if (prefersReducedMotion) return;
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ ...style, ...tiltStyle, transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {children}
    </div>
  );
};

export default TiltCard;
