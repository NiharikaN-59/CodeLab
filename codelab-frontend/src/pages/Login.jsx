import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import {
  Eye, EyeOff, ShieldCheck, BarChart3, Code2, Sparkles,
  Activity, CheckCircle2, AlertCircle, Cpu, Zap, Bug,
  AlertTriangle, Shield, Check
} from 'lucide-react';
import {
  motion, useMotionValue, useSpring, useTransform,
  useMotionTemplate, AnimatePresence
} from 'framer-motion';

// --- MAGNETIC BUTTON COMPONENT ---
const MagneticButton = ({ children, onClick, disabled, className, type = "button", style = {} }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = (e) => {
    if (disabled || !ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * 0.12);
    y.set(middleY * 0.12);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={className}
      style={{ ...style, x: springX, y: springY }}
      whileHover={!disabled ? { scale: 1.015, y: -2, boxShadow: '0 8px 24px rgba(99, 102, 241, 0.28)' } : {}}
      whileTap={!disabled ? { scale: 0.98, y: 0 } : {}}
    >
      {children}
    </motion.button>
  );
};

const MagneticWrapper = ({ children, intensity = 0.08 }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    x.set(middleX * intensity);
    y.set(middleY * intensity);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
};

// --- CODE HIGHLIGHT TOKENS WITH REALISTIC VULNERABILITY & AI REPAIR ---
const CODE_SNIPPET_BASE = [
  {
    tokens: [
      { text: 'import ', color: '#8B5CF6' },
      { text: '{ sanitizeInput } ', color: '#3B82F6' },
      { text: 'from ', color: '#8B5CF6' },
      { text: "'@codelab/guard';", color: '#10B981' }
    ]
  },
  {
    // Line 2 - Targeted for detection & AI auto-repair
    vulnerableTokens: [
      { text: '  const ', color: '#8B5CF6' },
      { text: 'query', color: 'var(--text-primary)' },
      { text: ' = ', color: '#64748B' },
      { text: 'db.raw', color: '#EF4444' },
      { text: '("SELECT * FROM users WHERE id = " + id);', color: '#EF4444' }
    ],
    repairedTokens: [
      { text: '  const ', color: '#8B5CF6' },
      { text: 'query', color: 'var(--text-primary)' },
      { text: ' = ', color: '#64748B' },
      { text: 'db', color: '#3B82F6' },
      { text: "('users')", color: '#10B981' },
      { text: '.where', color: '#8B5CF6' },
      { text: '({ id: sanitizeInput(id) })', color: '#10B981' },
      { text: '.first();', color: '#3B82F6' }
    ]
  },
  {
    tokens: [
      { text: '  const ', color: '#8B5CF6' },
      { text: 'astResult', color: 'var(--text-primary)' },
      { text: ' = ', color: '#64748B' },
      { text: 'await ', color: '#8B5CF6' },
      { text: 'aiEngine.verifyAST', color: '#3B82F6' },
      { text: '(query);', color: '#64748B' }
    ]
  },
  {
    tokens: [
      { text: '  return ', color: '#8B5CF6' },
      { text: '{ secure: true, certified: true };', color: '#10B981' }
    ]
  }
];

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // --- 3D INTERACTION PHYSICS ---
  const containerRef = useRef(null);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const sNormX = useSpring(normX, { stiffness: 45, damping: 18, mass: 0.6 });
  const sNormY = useSpring(normY, { stiffness: 45, damping: 18, mass: 0.6 });

  // Absolute mouse for ambient spotlight
  const absX = useMotionValue(0);
  const absY = useMotionValue(0);
  const sAbsX = useSpring(absX, { stiffness: 70, damping: 22 });
  const sAbsY = useSpring(absY, { stiffness: 70, damping: 22 });

  const handleMouseMove = (e) => {
    absX.set(e.clientX);
    absY.set(e.clientY);

    if (containerRef.current) {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const nx = ((e.clientX - left) / width) * 2 - 1;
      const ny = ((e.clientY - top) / height) * 2 - 1;
      normX.set(Math.max(-1, Math.min(1, nx)));
      normY.set(Math.max(-1, Math.min(1, ny)));
    }
  };

  const handleMouseLeave = () => {
    normX.set(0);
    normY.set(0);
  };

  // Coordinated 3D Perspective Transformations
  const rotateX = useTransform(sNormY, [-1, 1], [7.5, -7.5]);
  const rotateY = useTransform(sNormX, [-1, 1], [-11, 11]);
  const rotateZ = useTransform(sNormX, [-1, 1], [-1.2, 1.2]);

  // Layered Z-plane Parallax Offsets
  const bgX = useTransform(sNormX, [-1, 1], [-10, 10]);
  const bgY = useTransform(sNormY, [-1, 1], [-10, 10]);
  const editorX = useTransform(sNormX, [-1, 1], [-16, 16]);
  const editorY = useTransform(sNormY, [-1, 1], [-16, 16]);
  const satelliteX = useTransform(sNormX, [-1, 1], [-32, 32]);
  const satelliteY = useTransform(sNormY, [-1, 1], [-32, 32]);

  // Specular reflection gradient template
  const shineX = useTransform(sNormX, [-1, 1], [20, 80]);
  const shineY = useTransform(sNormY, [-1, 1], [20, 80]);
  const shineGradient = useMotionTemplate`radial-gradient(520px circle at ${shineX}% ${shineY}%, rgba(255, 255, 255, 0.22), transparent 70%)`;
  const spotlightGradient = useMotionTemplate`radial-gradient(850px circle at ${sAbsX}px ${sAbsY}px, rgba(99, 102, 241, 0.055), transparent 75%)`;

  // --- STORYTELLING LOOP STATE MACHINE ---
  // Phase 0: CODE INPUT (Typing initial code character-by-character)
  // Phase 1: ANALYSIS (Scanner beam moves through editor, inspecting AST)
  // Phase 2: ISSUE DETECTION (Line 2 turns amber/red, connection line flares, CWE-89 detected)
  // Phase 3: AI REPAIR (AI Engine node streams violet beam into Line 2, morphing into sanitized code)
  // Phase 4: SUCCESS (All nodes hit 100%/green, zero issues, certification complete, hold state)
  const [seqPhase, setSeqPhase] = useState(0);
  const [typedChars, setTypedChars] = useState(0);

  // Compute character count for initial typing (using vulnerable tokens for line 2)
  const totalTypingChars = useMemo(() => {
    let count = 0;
    count += CODE_SNIPPET_BASE[0].tokens.reduce((acc, t) => acc + t.text.length, 0);
    count += CODE_SNIPPET_BASE[1].vulnerableTokens.reduce((acc, t) => acc + t.text.length, 0);
    count += CODE_SNIPPET_BASE[2].tokens.reduce((acc, t) => acc + t.text.length, 0);
    count += CODE_SNIPPET_BASE[3].tokens.reduce((acc, t) => acc + t.text.length, 0);
    return count;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let typeInterval = null;
    let phaseTimers = [];

    const runStoryCycle = () => {
      if (!isMounted) return;
      setSeqPhase(0);
      setTypedChars(0);

      let currentChars = 0;
      typeInterval = setInterval(() => {
        if (!isMounted) {
          clearInterval(typeInterval);
          return;
        }
        currentChars += 2; // Fast, rhythmic typing
        setTypedChars(currentChars);

        if (currentChars >= totalTypingChars) {
          clearInterval(typeInterval);
          // Transition into Phase 1: ANALYSIS (Laser Scan Beam)
          phaseTimers.push(setTimeout(() => isMounted && setSeqPhase(1), 400));
          // Transition into Phase 2: ISSUE DETECTION (AST Vulnerability Flagged)
          phaseTimers.push(setTimeout(() => isMounted && setSeqPhase(2), 2200));
          // Transition into Phase 3: AI REPAIR (Neural Patching)
          phaseTimers.push(setTimeout(() => isMounted && setSeqPhase(3), 4200));
          // Transition into Phase 4: SUCCESS (Certified Secure State)
          phaseTimers.push(setTimeout(() => isMounted && setSeqPhase(4), 6200));
          // Hold success state for 4.5 seconds for complete visual payoff, then loop
          phaseTimers.push(setTimeout(() => isMounted && runStoryCycle(), 11000));
        }
      }, 26);
    };

    runStoryCycle();

    return () => {
      isMounted = false;
      if (typeInterval) clearInterval(typeInterval);
      phaseTimers.forEach(clearTimeout);
    };
  }, [totalTypingChars]);

  // --- FORM HANDLERS ---
  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 👋');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      toast.success('Welcome back! 👋');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google authentication failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => toast.error('Google login was unsuccessful.');

  const fillDemo = () => {
    setForm({ email: 'demo@codelab.dev', password: 'Demo@12345' });
    toast.success('Demo credentials loaded (Demo User)', { id: 'demo-loaded', icon: '👤', duration: 2500 });
  };

  // Running counter to accurately slice tokens during character typing
  let runningCharCounter = 0;

  return (
    <div 
      style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        background: 'radial-gradient(circle at 18% 25%, rgba(79, 70, 229, 0.08), transparent 60%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.06), transparent 60%), radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05), transparent 70%), var(--page-bg)', 
        overflow: 'hidden', 
        fontFamily: '"Inter", sans-serif',
        position: 'relative'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
        .glass-panel {
          background: var(--bg-card);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.7) inset;
          border-radius: 16px;
        }
        .dark .glass-panel {
          border-color: var(--border);
          box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06) inset;
        }
        .satellite-node {
          background: var(--bg-card);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.6) inset;
          border-radius: 12px;
          transition: border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dark .satellite-node {
          border-color: var(--border);
          box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        }
        .premium-input {
          width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border);
          background: var(--bg-card); font-size: 0.95rem; color: var(--text-primary);
          transition: border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .premium-input:focus {
          outline: none; border-color: #6366F1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12), 0 2px 8px rgba(99, 102, 241, 0.06);
          transform: translateY(-1px);
        }
        .premium-btn {
          width: 100%; padding: 12px; border-radius: 8px; border: none;
          background: linear-gradient(135deg, #6366F1, #4F46E5);
          color: white; font-weight: 500; font-size: 0.95rem; cursor: pointer;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
          transition: box-shadow 0.2s ease;
        }
        .typing-cursor {
          display: inline-block;
          width: 2px;
          height: 1.15em;
          background: #6366F1;
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: cursorBlink 0.9s step-end infinite;
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes ambientFloat {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(14px, -14px) scale(1.03); }
          100% { transform: translate(-10px, 12px) scale(0.97); }
        }
        @keyframes beamSweep {
          0% { top: 38px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 220px; opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes dashMove {
          to { stroke-dashoffset: -40; }
        }
        .animated-ray {
          stroke-dasharray: 6 4;
          animation: dashMove 1.4s linear infinite;
        }
        @media (max-width: 1024px) {
          .split-left { display: none !important; }
          .split-right { width: 100% !important; border-left: none !important; align-items: center; }
          .form-container { width: 100%; max-width: 400px; }
        }
      `}</style>

      {/* Ambient Animated Depth Orbs */}
      <div 
        aria-hidden="true"
        style={{
          position: 'fixed', top: '-10%', left: '-5%',
          width: '550px', height: '550px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'ambientFloat 22s ease-in-out infinite alternate',
          zIndex: 0
        }}
      />
      <div 
        aria-hidden="true"
        style={{
          position: 'fixed', bottom: '-12%', left: '30%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
          animation: 'ambientFloat 26s ease-in-out infinite alternate-reverse',
          zIndex: 0
        }}
      />

      {/* Interactive Spotlight following cursor */}
      <motion.div style={{ position: 'fixed', inset: 0, background: spotlightGradient, pointerEvents: 'none', zIndex: 1 }} />

      {/* Subtle Responsive Depth Grid */}
      <motion.div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundSize: '40px 40px',
        backgroundImage: 'linear-gradient(to right, rgba(15,23,42,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.02) 1px, transparent 1px)',
        x: bgX, y: bgY
      }} />

      {/* ── LEFT PANEL (SIGNATURE 3D CODE INTELLIGENCE ENGINE) ── */}
      <div className="split-left" ref={containerRef} style={{ width: '58%', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header Choreography */}
        <div style={{ padding: '52px 76px 20px 76px', position: 'relative', zIndex: 20 }}>
          <motion.div 
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}
          >
            <div style={{
              width: 34, height: 34,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: '0.88rem',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}>
              CL
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>CodeLab</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 style={{
              fontSize: '2.75rem', fontWeight: 700, color: 'var(--text-primary)',
              lineHeight: 1.2, letterSpacing: '-1px', margin: '0 0 14px 0'
            }}>
              Every issue has a story.<br/>
              Find it. Fix it.
            </h1>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.95rem', margin: 0, maxWidth: 490, lineHeight: 1.6 }}>
              Understand what's wrong, why it matters, and how to improve your code with intelligent analysis and AI assistance.
            </p>
          </motion.div>
        </div>

        {/* 3D SCENE CONTAINER (Preserve-3D Perspective Environment) */}
        <div style={{ 
          flex: 1, 
          perspective: '1300px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          position: 'relative',
          paddingBottom: '20px'
        }}>
          
          {/* Main 3D Floating Rig with multi-axis tilt and spring recovery */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              rotateX, rotateY, rotateZ,
              x: editorX, y: editorY,
              transformStyle: 'preserve-3d',
              position: 'relative',
              width: 500, height: 320
            }}
          >
            
            {/* ── 3D SVG DYNAMIC CONNECTIONS LAYER (translateZ: 25px) ── */}
            <svg 
              style={{
                position: 'absolute',
                top: -60, left: -90,
                width: 680, height: 440,
                pointerEvents: 'none',
                overflow: 'visible',
                zIndex: 10,
                transform: 'translateZ(25px)'
              }}
            >
              <defs>
                <linearGradient id="grad-security" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="grad-quality" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3" />
                </linearGradient>
                <linearGradient id="grad-issue" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor={seqPhase === 2 ? '#EF4444' : '#F59E0B'} stopOpacity="0.9" />
                  <stop offset="100%" stopColor={seqPhase === 2 ? '#EF4444' : 'rgba(99, 102, 241, 0.2)'} stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="grad-repair" x1="100%" y1="50%" x2="0%" y2="50%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#10B981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.2)" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* 1. Connection: Security Node -> Editor Header */}
              <path 
                d="M 120 70 C 130 90, 140 100, 160 105" 
                fill="none" 
                stroke={seqPhase >= 4 ? '#10B981' : 'rgba(99, 102, 241, 0.25)'}
                strokeWidth={seqPhase >= 4 ? 2 : 1.5}
                className="animated-ray"
              />

              {/* 2. Connection: Quality Node -> Editor Header */}
              <path 
                d="M 560 70 C 530 85, 510 95, 480 105" 
                fill="none" 
                stroke={seqPhase >= 4 ? '#10B981' : 'rgba(139, 92, 246, 0.25)'}
                strokeWidth={seqPhase >= 4 ? 2 : 1.5}
                className="animated-ray"
              />

              {/* 3. Connection: Issue Detector Node -> Line 2 (Vulnerability Target) */}
              <path 
                d="M 80 200 C 110 200, 120 178, 145 178" 
                fill="none" 
                stroke={seqPhase === 2 ? '#EF4444' : seqPhase >= 4 ? '#10B981' : 'rgba(239, 68, 68, 0.2)'}
                strokeWidth={seqPhase === 2 ? 2.5 : 1.5}
                strokeDasharray={seqPhase === 2 ? '4 3' : '6 4'}
                className={seqPhase === 2 ? 'animated-ray' : ''}
              />

              {/* 4. Connection: AI Auto-Remediator Node -> Line 2 (Fix Injection Target) */}
              <path 
                d="M 590 230 C 530 230, 480 178, 440 178" 
                fill="none" 
                stroke={seqPhase === 3 ? 'url(#grad-repair)' : seqPhase >= 4 ? '#10B981' : 'rgba(139, 92, 246, 0.2)'}
                strokeWidth={seqPhase === 3 ? 3 : 1.5}
                strokeDasharray={seqPhase === 3 ? '3 2' : '6 4'}
                className={seqPhase === 3 ? 'animated-ray' : ''}
              />
            </svg>

            {/* ── CENTRAL 3D CODE EDITOR PANEL (translateZ: 0px) ── */}
            <div 
              className="glass-panel"
              style={{
                width: '100%', height: '100%',
                overflow: 'hidden', display: 'flex', flexDirection: 'column',
                position: 'relative',
                transform: 'translateZ(0px)',
                borderColor: seqPhase === 2 ? 'rgba(239, 68, 68, 0.35)' : seqPhase >= 4 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(226, 232, 240, 0.85)',
                transition: 'border-color 0.4s ease, box-shadow 0.4s ease'
              }}
            >
              {/* Specular Interactive Light Sheen */}
              <motion.div
                style={{
                  position: 'absolute', inset: 0,
                  background: shineGradient,
                  pointerEvents: 'none',
                  zIndex: 20
                }}
              />

              {/* Top Window Bar */}
              <div style={{
                padding: '12px 18px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'var(--bg-secondary, #F8FAFC)'
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
                
                <div style={{ marginLeft: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Code2 size={13} color="#94A3B8" />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: '"JetBrains Mono", monospace' }}>
                    engine.ts
                  </span>
                </div>

                {/* State Tag in Window Bar */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: seqPhase >= 4 ? '#10B981' : seqPhase === 2 ? '#EF4444' : seqPhase === 3 ? '#8B5CF6' : '#6366F1',
                    animation: 'pulseGlow 1.4s infinite'
                  }} />
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600,
                    color: seqPhase >= 4 ? '#10B981' : seqPhase === 2 ? '#EF4444' : seqPhase === 3 ? '#8B5CF6' : '#64748B'
                  }}>
                    {seqPhase === 0 && 'CODE INPUT'}
                    {seqPhase === 1 && 'SCANNING AST'}
                    {seqPhase === 2 && 'ISSUE DETECTED'}
                    {seqPhase === 3 && 'AI AUTO-REPAIRING'}
                    {seqPhase >= 4 && 'CERTIFIED SECURE'}
                  </span>
                </div>
              </div>

              {/* Editor Workspace & Lines */}
              <div style={{
                padding: '18px 22px', flex: 1,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.78rem', lineHeight: 1.85,
                color: 'var(--text-primary)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Line Numbers Gutter */}
                <div style={{ color: 'var(--text-muted)', position: 'absolute', left: 16, top: 18, userSelect: 'none', textAlign: 'right', width: 14 }}>
                  1<br/>2<br/>3<br/>4
                </div>

                {/* Code Body */}
                <div style={{ paddingLeft: 24 }}>
                  {/* Line 1 */}
                  <div>
                    {CODE_SNIPPET_BASE[0].tokens.map((token, idx) => {
                      const start = runningCharCounter;
                      const end = start + token.text.length;
                      runningCharCounter = end;

                      if (typedChars < start) return null;
                      const text = token.text.slice(0, Math.max(0, typedChars - start));
                      const isTyping = typedChars >= start && typedChars < end;
                      return (
                        <span key={idx} style={{ color: token.color }}>
                          {text}
                          {isTyping && <span className="typing-cursor" aria-hidden="true" />}
                        </span>
                      );
                    })}
                  </div>

                  {/* Line 2 (Vulnerable -> Repaired Transformation) */}
                  <div style={{
                    position: 'relative',
                    borderRadius: 4,
                    padding: '0 4px',
                    margin: '0 -4px',
                    background: seqPhase === 2 
                      ? 'rgba(239, 68, 68, 0.12)' 
                      : seqPhase === 3 
                      ? 'rgba(139, 92, 246, 0.12)' 
                      : seqPhase >= 4 
                      ? 'rgba(16, 185, 129, 0.12)' 
                      : 'transparent',
                    transition: 'background 0.3s ease'
                  }}>
                    {seqPhase < 3 ? (
                      // Vulnerable version shown in phases 0, 1, 2
                      CODE_SNIPPET_BASE[1].vulnerableTokens.map((token, idx) => {
                        const start = runningCharCounter;
                        const end = start + token.text.length;
                        runningCharCounter = end;

                        if (typedChars < start) return null;
                        const text = token.text.slice(0, Math.max(0, typedChars - start));
                        const isTyping = typedChars >= start && typedChars < end;
                        return (
                          <span key={idx} style={{ color: token.color }}>
                            {text}
                            {isTyping && <span className="typing-cursor" aria-hidden="true" />}
                          </span>
                        );
                      })
                    ) : (
                      // Repaired & Sanitized version shown in phases 3, 4, 5
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35 }}
                        style={{ display: 'inline' }}
                      >
                        {CODE_SNIPPET_BASE[1].repairedTokens.map((token, idx) => (
                          <span key={idx} style={{ color: token.color }}>
                            {token.text}
                          </span>
                        ))}
                      </motion.div>
                    )}

                    {/* Inline Tag on Line 2 */}
                    {seqPhase === 2 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          fontSize: '0.62rem',
                          background: 'rgba(239, 68, 68, 0.18)',
                          color: '#EF4444',
                          padding: '1px 6px',
                          borderRadius: 3,
                          marginLeft: 8,
                          fontWeight: 700,
                          fontFamily: '"Inter", sans-serif'
                        }}
                      >
                        ⚠️ SQL_INJECTION
                      </motion.span>
                    )}

                    {seqPhase === 3 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          fontSize: '0.62rem',
                          background: 'rgba(139, 92, 246, 0.18)',
                          color: '#8B5CF6',
                          padding: '1px 6px',
                          borderRadius: 3,
                          marginLeft: 8,
                          fontWeight: 700,
                          fontFamily: '"Inter", sans-serif'
                        }}
                      >
                        ⚡ AI_REMEDIATING
                      </motion.span>
                    )}

                    {seqPhase >= 4 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                          fontSize: '0.62rem',
                          background: 'rgba(16, 185, 129, 0.18)',
                          color: '#10B981',
                          padding: '1px 6px',
                          borderRadius: 3,
                          marginLeft: 8,
                          fontWeight: 700,
                          fontFamily: '"Inter", sans-serif'
                        }}
                      >
                        ✓ SANITIZED
                      </motion.span>
                    )}
                  </div>

                  {/* Line 3 */}
                  <div>
                    {CODE_SNIPPET_BASE[2].tokens.map((token, idx) => {
                      const start = runningCharCounter;
                      const end = start + token.text.length;
                      runningCharCounter = end;

                      if (typedChars < start) return null;
                      const text = token.text.slice(0, Math.max(0, typedChars - start));
                      const isTyping = typedChars >= start && typedChars < end;
                      return (
                        <span key={idx} style={{ color: token.color }}>
                          {text}
                          {isTyping && <span className="typing-cursor" aria-hidden="true" />}
                        </span>
                      );
                    })}
                  </div>

                  {/* Line 4 */}
                  <div>
                    {CODE_SNIPPET_BASE[3].tokens.map((token, idx) => {
                      const start = runningCharCounter;
                      const end = start + token.text.length;
                      runningCharCounter = end;

                      if (typedChars < start) return null;
                      const text = token.text.slice(0, Math.max(0, typedChars - start));
                      const isTyping = typedChars >= start && typedChars < end;
                      return (
                        <span key={idx} style={{ color: token.color }}>
                          {text}
                          {isTyping && <span className="typing-cursor" aria-hidden="true" />}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* ── PHASE 1: SCANNING LIGHT LASER BEAM ── */}
                {seqPhase === 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 38, right: 18,
                      height: 2,
                      background: 'linear-gradient(90deg, transparent, #6366F1, #8B5CF6, transparent)',
                      boxShadow: '0 0 12px #6366F1, 0 0 24px rgba(99, 102, 241, 0.6)',
                      pointerEvents: 'none',
                      animation: 'beamSweep 1.6s ease-in-out infinite',
                      zIndex: 15
                    }}
                  />
                )}

                {/* ── FLOATING 3D INSPECTOR POPOVER (translateZ: 60px) ── */}
                <AnimatePresence>
                  {seqPhase === 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      style={{
                        position: 'absolute', top: 92, left: 60, zIndex: 30,
                        background: 'rgba(254, 242, 242, 0.96)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        boxShadow: '0 10px 24px -4px rgba(239, 68, 68, 0.28)',
                        borderRadius: 8, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: '0.7rem', color: '#DC2626', fontWeight: 600,
                        transform: 'translateZ(60px)'
                      }}
                    >
                      <AlertTriangle size={13} color="#EF4444" />
                      <span>CWE-89: Unsanitized SQL string concatenation detected</span>
                    </motion.div>
                  )}
                  {seqPhase === 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      style={{
                        position: 'absolute', top: 92, left: 60, zIndex: 30,
                        background: 'rgba(238, 242, 255, 0.96)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        boxShadow: '0 10px 24px -4px rgba(99, 102, 241, 0.28)',
                        borderRadius: 8, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: '0.7rem', color: '#4F46E5', fontWeight: 600,
                        transform: 'translateZ(60px)'
                      }}
                    >
                      <Sparkles size={13} color="#6366F1" />
                      <span>AI Patch: Converting to parameterized query with sanitizeInput()</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Footer */}
              <div style={{
                padding: '11px 18px',
                background: 'var(--bg-secondary, #F8FAFC)',
                borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontSize: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {seqPhase >= 4 ? (
                    <motion.div 
                      initial={{ scale: 0.85, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Remediation Complete • Certified Secure</span>
                    </motion.div>
                  ) : seqPhase >= 1 ? (
                    <div style={{ color: '#6366F1', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <Activity size={15} />
                      <span>
                        {seqPhase === 1 && 'Analyzing AST Nodes...'}
                        {seqPhase === 2 && 'Vulnerability Flagged (CWE-89)'}
                        {seqPhase === 3 && 'Synthesizing Neural Patch...'}
                      </span>
                    </div>
                  ) : (
                    <div style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1' }} />
                      <span style={{ color: 'var(--text-secondary)' }}>Parsing source tokens...</span>
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: '0.72rem',
                  color: seqPhase >= 4 ? '#10B981' : seqPhase === 2 ? '#EF4444' : '#6366F1',
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace'
                }}>
                  {seqPhase >= 4 && '12ms • 0 issues'}
                  {seqPhase === 2 && '1 Critical'}
                  {seqPhase === 3 && 'repairing...'}
                  {seqPhase <= 1 && 'evaluating...'}
                </div>
              </div>
            </div>

            {/* ── CONNECTED 3D SATELLITE NODES (translateZ: 50px - 70px) ── */}
            <motion.div 
              style={{ 
                x: satelliteX, y: satelliteY, 
                position: 'absolute', inset: 0, 
                pointerEvents: 'none',
                transformStyle: 'preserve-3d'
              }}
            >
              
              {/* Satellite 1: Security Shield Node (Top-Left, translateZ: 55px) */}
              <motion.div
                className="satellite-node"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ 
                  opacity: 1, scale: 1,
                  y: [0, -6, 0]
                }}
                transition={{ 
                  y: { repeat: Infinity, duration: 5.6, ease: "easeInOut", delay: 0.2 },
                  duration: 0.6
                }}
                whileHover={{ scale: 1.05 }}
                style={{
                  position: 'absolute', top: -38, left: -46,
                  padding: '10px 14px', pointerEvents: 'auto',
                  transform: 'translateZ(55px)',
                  borderColor: seqPhase >= 4 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(226, 232, 240, 0.85)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <ShieldCheck size={14} color={seqPhase >= 4 ? '#10B981' : '#6366F1'} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Security Index</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: seqPhase >= 4 ? '#10B981' : seqPhase === 2 ? '#EF4444' : 'var(--text-primary)' }}>
                  {seqPhase >= 4 ? '100%' : seqPhase === 2 ? '74%' : '98%'}
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: seqPhase >= 4 ? '#10B981' : '#94A3B8' }}>
                  {seqPhase >= 4 ? '✓ Zero-Risk Certified' : seqPhase === 2 ? '⚠️ High Severity' : 'Continuous Guard'}
                </div>
              </motion.div>

              {/* Satellite 2: Quality Index Node (Top-Right, translateZ: 65px) */}
              <motion.div
                className="satellite-node"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ 
                  opacity: 1, scale: 1,
                  y: [0, -7, 0]
                }}
                transition={{ 
                  y: { repeat: Infinity, duration: 6.2, ease: "easeInOut", delay: 1.1 },
                  duration: 0.6
                }}
                whileHover={{ scale: 1.05 }}
                style={{
                  position: 'absolute', top: -32, right: -48,
                  padding: '10px 14px', pointerEvents: 'auto',
                  transform: 'translateZ(65px)',
                  borderColor: seqPhase >= 4 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(226, 232, 240, 0.85)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <BarChart3 size={14} color={seqPhase >= 4 ? '#10B981' : '#8B5CF6'} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AST Quality</span>
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: seqPhase >= 4 ? '#10B981' : 'var(--text-primary)' }}>
                  {seqPhase >= 4 ? '98 / 100' : '84 / 100'}
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: seqPhase >= 4 ? '#10B981' : '#94A3B8' }}>
                  {seqPhase >= 4 ? 'Grade A+ Optimal' : 'Evaluating...'}
                </div>
              </motion.div>

              {/* Satellite 3: AST Issue Detector Node (Mid-Left, translateZ: 70px) */}
              <motion.div
                className="satellite-node"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ 
                  opacity: 1, scale: 1,
                  y: [0, -8, 0]
                }}
                transition={{ 
                  y: { repeat: Infinity, duration: 5.8, ease: "easeInOut", delay: 0.6 },
                  duration: 0.6
                }}
                whileHover={{ scale: 1.05 }}
                style={{
                  position: 'absolute', top: 120, left: -68,
                  padding: '10px 14px', pointerEvents: 'auto',
                  transform: 'translateZ(70px)',
                  borderColor: seqPhase === 2 ? 'rgba(239, 68, 68, 0.6)' : seqPhase >= 4 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(226, 232, 240, 0.85)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Bug size={14} color={seqPhase === 2 ? '#EF4444' : seqPhase >= 4 ? '#10B981' : '#F59E0B'} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Issue Detection</span>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: seqPhase === 2 ? '#EF4444' : seqPhase >= 4 ? '#10B981' : '#F59E0B' }}>
                  {seqPhase === 2 ? '1 Critical Found' : seqPhase >= 4 ? '0 Issues Left' : 'Scanning...'}
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: seqPhase === 2 ? '#EF4444' : seqPhase >= 4 ? '#10B981' : '#94A3B8' }}>
                  {seqPhase === 2 ? 'CWE-89 SQL Injection' : seqPhase >= 4 ? 'All Clean' : 'AST Pattern Matcher'}
                </div>
              </motion.div>

              {/* Satellite 4: AI Auto-Remediator Node (Mid-Right, translateZ: 60px) */}
              <motion.div
                className="satellite-node"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ 
                  opacity: 1, scale: 1,
                  y: [0, -6, 0]
                }}
                transition={{ 
                  y: { repeat: Infinity, duration: 5.4, ease: "easeInOut", delay: 1.5 },
                  duration: 0.6
                }}
                whileHover={{ scale: 1.05 }}
                style={{
                  position: 'absolute', top: 135, right: -72,
                  padding: '10px 14px', pointerEvents: 'auto',
                  transform: 'translateZ(60px)',
                  borderColor: seqPhase === 3 ? 'rgba(139, 92, 246, 0.7)' : seqPhase >= 4 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(226, 232, 240, 0.85)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Cpu size={14} color={seqPhase === 3 ? '#8B5CF6' : seqPhase >= 4 ? '#10B981' : '#6366F1'} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AI Auto-Repair</span>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: seqPhase === 3 ? '#8B5CF6' : seqPhase >= 4 ? '#10B981' : 'var(--text-primary)' }}>
                  {seqPhase === 3 ? 'Remediating...' : seqPhase >= 4 ? '✓ Auto-Patched' : 'Ready'}
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: seqPhase >= 4 ? '#10B981' : '#94A3B8' }}>
                  {seqPhase >= 4 ? 'Latency: 12ms' : 'Multi-Tier Neural Engine'}
                </div>
              </motion.div>

            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT PANEL (LOGIN FORM) ── */}
      <div 
        className="split-right" 
        style={{ 
          width: '42%', 
          background: 'var(--bg-card)', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '60px', 
          borderLeft: '1px solid var(--border)', 
          zIndex: 10, 
          position: 'relative' 
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 18 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="form-container" 
          style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}
        >
          
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: '0 0 6px 0' }}>Welcome back</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Sign in to continue to CodeLab</p>
          </div>

          {/* Magnetic Google Button Wrapper */}
          <MagneticWrapper intensity={0.06}>
            <div style={{ opacity: googleLoading ? 0.6 : 1, pointerEvents: googleLoading ? 'none' : 'auto', transition: 'opacity 0.2s', marginBottom: 24 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                width="100%"
                text="continue_with"
                shape="rectangular"
                logo_alignment="left"
              />
            </div>
          </MagneticWrapper>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Or with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Email address</label>
              <input
                id="login-email"
                className="premium-input"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  className="premium-input"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 42 }}
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </motion.button>
              </div>
            </div>

            {/* Premium Magnetic Button */}
            <MagneticButton type="submit" className="premium-btn" disabled={loading || !form.email || !form.password}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Signing in...
                </div>
              ) : 'Sign In'}
            </MagneticButton>
          </form>

          <motion.button
            type="button"
            onClick={fillDemo}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', marginTop: 14, padding: 10, background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
              transition: 'color 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            ⚡ Use demo credentials
          </motion.button>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
