import React, { useState, useEffect } from 'react';

const AnimatedNumber = ({ value, duration = 1000 }) => {
  const [current, setCurrent] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const listener = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrent(value);
      return;
    }

    let startTime;
    let animationFrame;

    const startValue = typeof current === 'string' && current.endsWith('%') ? parseInt(current) : (parseInt(current) || 0);
    const endValue = typeof value === 'string' && value.endsWith('%') ? parseInt(value) : (parseInt(value) || 0);
    const isPercentage = typeof value === 'string' && value.endsWith('%');
    
    if (isNaN(endValue)) {
      setCurrent(value);
      return;
    }

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.floor(startValue + (endValue - startValue) * easeProgress);
      
      setCurrent(isPercentage ? `${nextValue}%` : nextValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCurrent(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration, prefersReducedMotion]);

  return <span>{current}</span>;
};

export default AnimatedNumber;
