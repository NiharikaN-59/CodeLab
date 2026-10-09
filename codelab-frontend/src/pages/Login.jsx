import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, ShieldCheck, BarChart3, Code2, Sparkles, Activity, CheckCircle2 } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

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
    x.set(middleX * 0.15); // Max ~8px movement
    y.set(middleY * 0.15);
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
      whileHover={!disabled ? { scale: 1.02, y: -2, boxShadow: '0 8px 20px rgba(99, 102, 241, 0.25)' } : {}}
      whileTap={!disabled ? { scale: 0.98, y: 0 } : {}}
    >
      {children}
    </motion.button>
  );
};

const MagneticWrapper = ({ children, intensity = 0.15 }) => {
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

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // --- INTERACTION PHYSICS ---
  const containerRef = useRef(null);
  // Normalized mouse (-1 to 1) for 3D tilts
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const sNormX = useSpring(normX, { stiffness: 50, damping: 20 });
  const sNormY = useSpring(normY, { stiffness: 50, damping: 20 });
  
  // Absolute mouse for spotlight
  const absX = useMotionValue(0);
  const absY = useMotionValue(0);
  const sAbsX = useSpring(absX, { stiffness: 100, damping: 30 });
  const sAbsY = useSpring(absY, { stiffness: 100, damping: 30 });

  const handleMouseMove = (e) => {
    absX.set(e.clientX);
    absY.set(e.clientY);

    if (containerRef.current) {
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const nx = ((e.clientX - left) / width) * 2 - 1; // -1 to 1
      const ny = ((e.clientY - top) / height) * 2 - 1; // -1 to 1
      // Limit bounds slightly to prevent extreme edge flipping
      normX.set(Math.max(-1, Math.min(1, nx)));
      normY.set(Math.max(-1, Math.min(1, ny)));
    }
  };

  const handleMouseLeave = () => {
    normX.set(0);
    normY.set(0);
  };

  // 3D Tilt transforms
  const rotateX = useTransform(sNormY, [-1, 1], [4, -4]);
  const rotateY = useTransform(sNormX, [-1, 1], [-6, 6]);

  // Depth Layers Parallax (2D)
  const bgX = useTransform(sNormX, [-1, 1], [-10, 10]);
  const bgY = useTransform(sNormY, [-1, 1], [-10, 10]);
  const panelX = useTransform(sNormX, [-1, 1], [-25, 25]);
  const panelY = useTransform(sNormY, [-1, 1], [-25, 25]);
  const floatX = useTransform(sNormX, [-1, 1], [-45, 45]);
  const floatY = useTransform(sNormY, [-1, 1], [-45, 45]);

  // Spotlight Template
  const spotlightGradient = useMotionTemplate`radial-gradient(800px circle at ${sAbsX}px ${sAbsY}px, rgba(99, 102, 241, 0.05), transparent 80%)`;

  // --- ANIMATION SEQUENCE ---
  const [seqPhase, setSeqPhase] = useState(0);
  // 0: Loading, 1: Scanning, 2: Highlight, 3: Security, 4: Quality, 5: Repair, 6: Complete, 7: Reset
  useEffect(() => {
    let timers = [];
    const runSequence = () => {
      setSeqPhase(0);
      timers.push(setTimeout(() => setSeqPhase(1), 800));   // Scanner starts
      timers.push(setTimeout(() => setSeqPhase(2), 2500));  // Highlight line
      timers.push(setTimeout(() => setSeqPhase(3), 3200));  // Security
      timers.push(setTimeout(() => setSeqPhase(4), 4000));  // Quality
      timers.push(setTimeout(() => setSeqPhase(5), 4800));  // AI Analyzing
      timers.push(setTimeout(() => setSeqPhase(6), 6500));  // Complete
      timers.push(setTimeout(runSequence, 9500));           // Loop
    };
    runSequence();
    return () => timers.forEach(clearTimeout);
  }, []);

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

  const fillDemo = () => setForm({ email: 'admin@codelab.dev', password: 'password123' });

  // --- RENDER ---
  return (
    <div 
      style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        background: 'radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.08), transparent 60%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.06), transparent 60%), radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05), transparent 70%), var(--page-bg)', 
        overflow: 'hidden', 
        fontFamily: '"Inter", sans-serif' 
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
        .glass-float {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .glass-float:hover {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow: 0 12px 40px -10px rgba(99, 102, 241, 0.2);
        }
        .premium-input {
          width: 100%; padding: 12px 16px; border-radius: 8px; border: 1px solid #E2E8F0;
          background: #FFFFFF; font-size: 0.95rem; color: #0F172A; transition: all 0.2s ease;
        }
        .premium-input:focus {
          outline: none; border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .premium-btn {
          width: 100%; padding: 12px; border-radius: 8px; border: none;
          background: #6366F1; color: white; font-weight: 500; font-size: 0.95rem; cursor: pointer;
        }
        @media (max-width: 1024px) {
          .split-left { display: none !important; }
          .split-right { width: 100% !important; border-left: none !important; align-items: center; }
          .form-container { width: 100%; max-width: 400px; }
        }
      `}</style>

      {/* Spotlight effect */}
      <motion.div style={{ position: 'fixed', inset: 0, background: spotlightGradient, pointerEvents: 'none', zIndex: 1 }} />

      {/* Subtle Grid */}
      <motion.div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundSize: '40px 40px',
        backgroundImage: 'linear-gradient(to right, rgba(15,23,42,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.02) 1px, transparent 1px)',
        x: bgX, y: bgY
      }} />

      {/* ── LEFT PANEL (INTERACTIVE 3D ENVIRONMENT) ── */}
      <div className="split-left" ref={containerRef} style={{ width: '58%', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column' }}>
        
        {/* Header Choreography */}
        <div style={{ padding: '60px 80px', position: 'relative', zIndex: 20 }}>
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}
          >
            <div style={{ width: 32, height: 32, background: '#6366F1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>CL</div>
            <span style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0F172A' }}>CodeLab</span>
          </motion.div>
          
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.8 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366F1', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>
              AI-Powered Code Intelligence
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1, letterSpacing: '-1px', margin: '0 0 16px 0' }}>
              Understand your code.<br/>
              Fix issues faster.
            </h1>
          </motion.div>
        </div>

        {/* 3D Perspective Area */}
        <div style={{ flex: 1, perspective: '1200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
            style={{ rotateX, rotateY, x: panelX, y: panelY, transformStyle: 'preserve-3d', position: 'relative' }}
          >
            {/* Main Code Panel Surface */}
            <div style={{
              width: 480, height: 320, background: '#FFFFFF', borderRadius: 16,
              border: '1px solid #E2E8F0', boxShadow: '0 20px 60px -15px rgba(0,0,0,0.05)',
              overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>
              {/* Top Bar */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 6, background: '#FAFAFA' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E2E8F0' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E2E8F0' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E2E8F0' }} />
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Code2 size={14} color="#94A3B8" />
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: '"JetBrains Mono", monospace' }}>engine.ts</span>
                </div>
              </div>

              {/* Editor Content */}
              <div style={{ padding: '24px', flex: 1, fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', lineHeight: 1.8, color: '#334155', position: 'relative' }}>
                <div style={{ color: '#CBD5E1', position: 'absolute', left: 24, top: 24, userSelect: 'none' }}>
                  1<br/>2<br/>3<br/>4<br/>5
                </div>
                <div style={{ paddingLeft: 24 }}>
                  <div><span style={{ color: '#8B5CF6' }}>export async function</span> <span style={{ color: '#3B82F6' }}>analyze</span>(ast) {'{'}</div>
                  
                  <motion.div 
                    animate={{ backgroundColor: seqPhase >= 2 && seqPhase <= 5 ? 'rgba(99,102,241,0.1)' : 'transparent' }}
                    transition={{ duration: 0.3 }}
                    style={{ paddingLeft: 16, borderRadius: 4, margin: '2px -8px 2px 8px', padding: '0 8px 0 16px' }}
                  >
                    <span style={{ color: '#0F172A' }}>const</span> vulnerabilities = detect(ast);
                  </motion.div>
                  
                  <div style={{ paddingLeft: 16 }}><span style={{ color: '#0F172A' }}>const</span> fixes = generateAI(vulnerabilities);</div>
                  <div style={{ paddingLeft: 16 }}><span style={{ color: '#8B5CF6' }}>return</span> {'{'} vulnerabilities, fixes {'}'};</div>
                  <div>{'}'}</div>
                </div>

                {/* Animated Scanner Highlight */}
                <motion.div
                  initial={{ top: 0, opacity: 0 }}
                  animate={
                    seqPhase === 1 ? { top: [20, 160], opacity: [0, 1, 0] } :
                    seqPhase > 1 ? { opacity: 0 } : { opacity: 0 }
                  }
                  transition={{ duration: 2, ease: "linear" }}
                  style={{
                    position: 'absolute', left: 48, right: 24, height: 2, background: '#6366F1',
                    boxShadow: '0 0 10px #6366F1, 0 4px 10px rgba(99,102,241,0.2)'
                  }}
                />
              </div>

              {/* Status Footer */}
              <div style={{ padding: '12px 24px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {seqPhase >= 6 ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Analysis Complete</span>
                    </motion.div>
                  ) : seqPhase >= 1 ? (
                    <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ color: '#6366F1', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={14} /> <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Scanning...</span>
                    </motion.div>
                  ) : (
                    <div style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#CBD5E1' }} /> <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Idle</span>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, fontFamily: '"JetBrains Mono", monospace' }}>
                  {seqPhase >= 6 ? '12ms' : '--'}
                </div>
              </div>
            </div>

            {/* FLOATING ELEMENTS (Layer 6 - High Depth) */}
            <motion.div style={{ x: floatX, y: floatY, position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              
              {/* Security Card */}
              <motion.div
                className="glass-float"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ 
                  opacity: seqPhase >= 3 ? 1 : 0, 
                  scale: seqPhase >= 3 ? 1 : 0.9,
                  y: [0, -6, 0] 
                }}
                transition={{ 
                  opacity: { duration: 0.4 }, scale: { duration: 0.4 },
                  y: { repeat: Infinity, duration: 6, ease: "easeInOut", delay: 0.2 } 
                }}
                whileHover={{ scale: 1.05 }}
                style={{ position: 'absolute', top: -30, left: -40, padding: '12px 16px', pointerEvents: 'auto' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <ShieldCheck size={14} color="#10B981" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Security</span>
                </div>
                <motion.div 
                  animate={seqPhase === 3 ? { scale: [1, 1.1, 1], color: ['#0F172A', '#10B981', '#0F172A'] } : {}} 
                  style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}
                >
                  98%
                </motion.div>
              </motion.div>

              {/* Quality Card */}
              <motion.div
                className="glass-float"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ 
                  opacity: seqPhase >= 4 ? 1 : 0, 
                  scale: seqPhase >= 4 ? 1 : 0.9,
                  y: [0, -5, 0] 
                }}
                transition={{ 
                  opacity: { duration: 0.4 }, scale: { duration: 0.4 },
                  y: { repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1.5 } 
                }}
                whileHover={{ scale: 1.05 }}
                style={{ position: 'absolute', top: 40, right: -50, padding: '12px 16px', pointerEvents: 'auto' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <BarChart3 size={14} color="#6366F1" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Quality</span>
                </div>
                <motion.div 
                  animate={seqPhase === 4 ? { scale: [1, 1.1, 1], color: ['#0F172A', '#6366F1', '#0F172A'] } : {}} 
                  style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}
                >
                  91%
                </motion.div>
              </motion.div>

              {/* AI Repair Card */}
              <motion.div
                className="glass-float"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ 
                  opacity: seqPhase >= 5 ? 1 : 0, 
                  scale: seqPhase >= 5 ? 1 : 0.9,
                  y: [0, -4, 0] 
                }}
                transition={{ 
                  opacity: { duration: 0.4 }, scale: { duration: 0.4 },
                  y: { repeat: Infinity, duration: 7, ease: "easeInOut", delay: 0.8 } 
                }}
                whileHover={{ scale: 1.05 }}
                style={{ position: 'absolute', bottom: -20, right: 30, padding: '12px 16px', pointerEvents: 'auto' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Sparkles size={14} color="#8B5CF6" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>AI Repair</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: seqPhase >= 6 ? '#10B981' : '#F59E0B' }}>
                  {seqPhase >= 6 ? 'Ready' : 'Analyzing...'}
                </div>
              </motion.div>

            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT PANEL (LOGIN FORM) ── */}
      <div className="split-right" style={{ width: '42%', background: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', borderLeft: '1px solid #E2E8F0', zIndex: 10, position: 'relative' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
          className="form-container" style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}
        >
          
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.5px', margin: '0 0 6px 0' }}>Welcome back</h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0 }}>Sign in to continue to CodeLab</p>
          </div>

          {/* Magnetic Google Button Wrapper */}
          <MagneticWrapper intensity={0.05}>
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
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase' }}>Or</span>
            <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#334155', marginBottom: 6 }}>Email address</label>
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
              <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#334155', marginBottom: 6 }}>Password</label>
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
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Premium Magnetic Button */}
            <MagneticButton type="submit" className="premium-btn" disabled={loading || !form.email || !form.password}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </div>
              ) : 'Sign In'}
            </MagneticButton>
          </form>

          <button
            onClick={fillDemo}
            style={{
              width: '100%', marginTop: 12, padding: 12, background: 'none', border: 'none',
              color: '#64748B', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#0F172A'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#64748B'; }}
          >
            Use demo credentials
          </button>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: '#64748B' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 500, color: '#6366F1', textDecoration: 'none' }}>
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
