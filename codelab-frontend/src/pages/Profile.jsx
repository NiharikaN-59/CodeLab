import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';
import {
  User, Mail, Shield, Activity, Code2, Bot, Terminal, Save, CheckCircle2,
  Clock, ShieldCheck, KeyRound, ExternalLink, ArrowRight, Compass,
  FolderCode, FolderOpen, Cpu, BarChart2, Check, AlertCircle, Copy, LogOut, Lock,
  Sparkles, Layers, RefreshCw, Calendar, CheckCircle, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import SpotlightCard from '../components/ui/SpotlightCard';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [projects, setProjects] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Keep form synchronized when user context updates
  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '' });
    }
  }, [user]);

  // Fetch real user projects, activities, and token usage from existing APIs
  useEffect(() => {
    let isMounted = true;
    const fetchSupportingData = async () => {
      try {
        // Fetch real active projects belonging to the logged-in user
        const projectRes = await api.get('/projects').catch(() => ({ data: { projects: [] } }));
        if (isMounted && projectRes.data?.projects) {
          setProjects(projectRes.data.projects);
        }

        // Fetch user token usage stats
        const usageRes = await api.get('/usage/my-stats').catch(() => null);
        if (isMounted && usageRes?.data?.stats) {
          setUsageStats(usageRes.data.stats);
        }

        // Fetch real activities if user has admin privileges
        if (user?.role === 'admin') {
          const actRes = await api.get('/admin/activity?limit=30').catch(() => null);
          if (isMounted && actRes?.data?.activities) {
            const userActs = actRes.data.activities.filter(
              (a) => a.user?._id === user._id || a.user === user._id || a.userName === user.name
            );
            setRecentActivities(userActs.slice(0, 5));
          }
        }
      } catch (err) {
        console.error('Error fetching supporting profile data:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    fetchSupportingData();
    return () => { isMounted = false; };
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Name and email are required');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return toast.error('Please enter a valid email address');
    
    setSavingProfile(true);
    setSaveSuccess(false);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data.user);
      toast.success('Profile updated successfully');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Signed out successfully');
    } catch (err) {
      toast.error('Failed to sign out');
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const safeDistance = (d) => {
    if (!d) return 'N/A';
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true });
    } catch {
      return 'N/A';
    }
  };

  const safeFormat = (d, fmt = 'MMM d, yyyy') => {
    if (!d) return 'N/A';
    try {
      return format(new Date(d), fmt);
    } catch {
      return 'N/A';
    }
  };

  const getLanguageColor = (lang) => {
    const l = (lang || '').toLowerCase();
    if (l.includes('javascript') || l === 'js') return '#F59E0B';
    if (l.includes('typescript') || l === 'ts') return '#3B82F6';
    if (l.includes('python') || l === 'py') return '#10B981';
    if (l.includes('html')) return '#EF4444';
    if (l.includes('css')) return '#8B5CF6';
    if (l.includes('java')) return '#EA580C';
    return 'var(--primary)';
  };

  const getProjectLanguage = (p) => {
    if (p.primaryLanguage && p.primaryLanguage !== 'unknown') return p.primaryLanguage;
    if (p.languages && p.languages.length > 0 && p.languages[0].language) return p.languages[0].language;
    return 'plaintext';
  };

  // Compile real activity timeline with actual database records
  const timelineItems = useMemo(() => {
    const items = [];

    // 1. From real backend Activity collection if available
    if (recentActivities.length > 0) {
      recentActivities.forEach((act) => {
        items.push({
          id: act._id,
          title: act.action || act.type,
          desc: act.projectName ? `Project: ${act.projectName}` : act.type,
          date: act.createdAt,
          icon: act.type?.includes('project') ? FolderCode : act.type === 'compile' ? Terminal : act.type === 'analyze' ? Activity : act.type === 'login' ? KeyRound : Activity,
          color: 'var(--primary)'
        });
      });
    } else {
      // 2. Synthesize from real projects and user session events
      if (projects.length > 0) {
        projects.slice(0, 3).forEach((p) => {
          items.push({
            id: p._id,
            title: `Modified project "${p.name}"`,
            desc: p.description ? (p.description.slice(0, 50) + (p.description.length > 50 ? '...' : '')) : `${p.files?.length || 0} files in repository`,
            date: p.updatedAt || p.createdAt,
            icon: FolderCode,
            color: 'var(--primary)'
          });
        });
      }

      // Add real session login event
      if (user?.lastLogin) {
        items.push({
          id: 'last-login',
          title: 'Account Authentication',
          desc: user.authProvider === 'google' ? 'Logged in via Google Single Sign-On' : 'Authenticated with email & password',
          date: user.lastLogin,
          icon: KeyRound,
          color: 'var(--success)'
        });
      }

      // Add real account creation event
      if (user?.createdAt) {
        items.push({
          id: 'account-created',
          title: 'Account Registered',
          desc: `Joined CodeLab as a registered ${user.role || 'developer'}`,
          date: user.createdAt,
          icon: User,
          color: 'var(--accent)'
        });
      }
    }

    // Sort descending by date
    return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  }, [recentActivities, projects, user]);

  // Extract real languages used across active projects
  const workspaceLanguages = useMemo(() => {
    const langSet = new Set();
    projects.forEach((p) => {
      p.languages?.forEach((l) => langSet.add(l.language));
    });
    return Array.from(langSet).slice(0, 6);
  }, [projects]);

  const stats = [
    {
      label: 'Total Projects',
      value: user?.stats?.totalProjects ?? projects.length,
      icon: Code2,
      color: '#4F46E5',
      bg: 'rgba(79, 70, 229, 0.08)',
      detail: 'Active workspaces'
    },
    {
      label: 'Total Analyses',
      value: user?.stats?.totalAnalyses ?? 0,
      icon: Activity,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.08)',
      detail: 'Audits & AST inspections'
    },
    {
      label: 'AI Requests',
      value: user?.stats?.totalAiRequests ?? 0,
      icon: Bot,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.08)',
      detail: 'Neural code repairs'
    },
    {
      label: 'Compilations',
      value: user?.stats?.totalCompilations ?? 0,
      icon: Terminal,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.08)',
      detail: 'Executions & runs'
    },
  ];

  return (
    <div className="page-content" style={{ maxWidth: 1400, margin: '0 auto', width: '100%', paddingBottom: 48 }}>
      <style>{`
        .profile-grid-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
          gap: 24px;
        }
        .profile-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        .profile-header-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px 28px;
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }
        .profile-section-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .profile-section-card:hover {
          border-color: rgba(99, 102, 241, 0.3);
        }
        .timeline-item {
          position: relative;
          padding-left: 28px;
          padding-bottom: 20px;
        }
        .timeline-item:last-child {
          padding-bottom: 4px;
        }
        .timeline-line {
          position: absolute;
          left: 9px;
          top: 18px;
          bottom: 0;
          width: 2px;
          background: var(--border);
        }
        .timeline-item:last-child .timeline-line {
          display: none;
        }
        .timeline-dot {
          position: absolute;
          left: 0;
          top: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-card);
          border: 2px solid var(--primary);
          z-index: 2;
        }
        .quick-nav-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          background: var(--bg-secondary);
          color: var(--text-primary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          border: 1px solid transparent;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .quick-nav-item:hover {
          background: var(--bg-hover, rgba(99, 102, 241, 0.08));
          border-color: rgba(99, 102, 241, 0.25);
          transform: translateX(3px);
          color: var(--primary);
        }
        .meta-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border);
        }
        @media (max-width: 1024px) {
          .profile-grid-layout {
            grid-template-columns: 1fr;
          }
          .profile-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .profile-stats-grid {
            grid-template-columns: 1fr;
          }
          .profile-header-card {
            padding: 20px 16px;
          }
        }
      `}</style>

      {/* ─── Page Breadcrumbs & Header ─── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>
              <User size={13} /> Account Settings
            </div>
            <h1 className="page-title" style={{ fontSize: '1.75rem', margin: 0 }}>
              Profile & Account
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
              Manage your personal credentials, workspace security, and account preferences
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleSignOut}
              className="btn btn-outline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                fontSize: '0.825rem', padding: '8px 14px', borderRadius: 'var(--radius)',
                color: 'var(--danger, #EF4444)', borderColor: 'rgba(239, 68, 68, 0.25)'
              }}
              aria-label="Sign out"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ─── 1. TOP SECTION: FULL-WIDTH PROFILE OVERVIEW ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="profile-header-card" 
        style={{ marginBottom: 24 }}
      >
        {/* Subtle decorative background glow */}
        <div 
          aria-hidden="true"
          style={{
            position: 'absolute', right: -40, top: -40, width: 220, height: 220,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} 
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          {/* Avatar & Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 260 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  boxShadow: '0 8px 24px rgba(79, 70, 229, 0.28)',
                  letterSpacing: '-0.5px',
                  border: '3px solid var(--bg-card)'
                }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <span 
                title="Account is active and verified"
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#10B981',
                  border: '2px solid var(--bg-card)',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                }} 
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                  {user?.name || 'CodeLab User'}
                </h2>
                <span className={`badge ${user?.role === 'admin' ? 'badge-purple' : 'badge-primary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px' }}>
                  {user?.role === 'admin' ? <><Shield size={11} aria-hidden="true" /> Admin</> : <><Code2 size={11} aria-hidden="true" /> Developer</>}
                </span>
                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px' }}>
                  <CheckCircle2 size={11} /> Active
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} color="var(--text-muted)" />
                  {user?.email}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(user?.email, 'Email address')}
                  title="Copy email to clipboard"
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: 2, display: 'inline-flex', alignItems: 'center'
                  }}
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Membership & Session Info Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div className="meta-pill" title="Registration date">
              <Calendar size={13} color="var(--primary)" />
              <span>Joined {safeFormat(user?.createdAt, 'MMMM yyyy')}</span>
            </div>

            <div className="meta-pill" title="Last recorded login">
              <Clock size={13} color="#10B981" />
              <span>Active {safeDistance(user?.lastLogin)}</span>
            </div>

            <div className="meta-pill" title="Primary authentication provider">
              <KeyRound size={13} color="#8B5CF6" />
              <span>{user?.authProvider === 'google' ? 'Google OAuth' : 'Local Auth'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. STATISTICS SECTION: 4 EVENLY SIZED CARDS ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="profile-stats-grid" 
        style={{ marginBottom: 24 }}
      >
        {stats.map(({ label, value, icon: Icon, color, bg, detail }) => (
          <SpotlightCard 
            key={label}
            className="card card-hover"
            style={{
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div 
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius)',
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: color,
                flexShrink: 0
              }}
            >
              <Icon size={20} aria-hidden="true" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
                <AnimatedNumber value={value} duration={900} />
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                {label}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                {detail}
              </div>
            </div>
          </SpotlightCard>
        ))}
      </motion.div>

      {/* ─── 3. MAIN CONTENT: BALANCED TWO-COLUMN DASHBOARD ─── */}
      <div className="profile-grid-layout">
        
        {/* ── LEFT COLUMN (64% width): DETAILS, ACCOUNT INFO, RECENT PROJECTS & USAGE ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Card 1: Account Details Form */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="profile-section-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Account Details
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Update your personal profile information and email address
                  </p>
                </div>
              </div>

              <AnimatePresence>
                {saveSuccess && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: '0.78rem', color: '#10B981', fontWeight: 600,
                      background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    <CheckCircle2 size={13} aria-hidden="true" /> Changes Saved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <form onSubmit={handleSaveProfile} noValidate>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 18 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="profile-name" style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="profile-name"
                      className="form-input"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Your full name"
                      aria-label="Full name"
                      required
                      style={{ paddingLeft: 36 }}
                    />
                    <User size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="profile-email" style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: 6 }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="profile-email"
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="your@email.com"
                      aria-label="Email address"
                      required
                      style={{ paddingLeft: 36 }}
                    />
                    <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 22 }}>
                <label className="form-label" htmlFor="profile-role" style={{ fontWeight: 600, fontSize: '0.825rem', marginBottom: 6 }}>
                  Platform Role
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="profile-role"
                    className="form-input"
                    value={user?.role === 'admin' ? 'Administrator (Full Platform Access)' : 'Developer (Standard Workspace Access)'}
                    disabled
                    aria-label="Role (read-only)"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      cursor: 'not-allowed',
                      paddingLeft: 36,
                      fontWeight: 500
                    }}
                  />
                  <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
                <p className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Role permissions are assigned by system administrators and cannot be altered directly.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Last profile modification: {safeFormat(user?.updatedAt || user?.createdAt, 'MMM d, yyyy • h:mm a')}
                </span>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProfile}
                  aria-label={savingProfile ? 'Saving...' : 'Save Changes'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px', fontWeight: 600, fontSize: '0.875rem'
                  }}
                >
                  {savingProfile ? (
                    <>
                      <span className="loading-spinner" aria-hidden="true" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save size={14} aria-hidden="true" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Card 2: Account Information */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="profile-section-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Account Information
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  System identifier, registration date, and current session parameters
                </p>
              </div>
            </div>

            <div className="divide-y" style={{ borderTop: '1px solid var(--border)' }}>
              {[
                { 
                  label: 'Account Status', 
                  value: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#10B981', fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Active & Verified
                    </span>
                  ),
                  hint: 'Normal standing with no restrictions'
                },
                { 
                  label: 'Member Since', 
                  value: safeFormat(user?.createdAt, 'PPP'),
                  hint: safeDistance(user?.createdAt)
                },
                { 
                  label: 'Last Session Login', 
                  value: safeFormat(user?.lastLogin, 'PPpp'),
                  hint: safeDistance(user?.lastLogin)
                },
                { 
                  label: 'Authentication Method', 
                  value: user?.authProvider === 'google' ? 'Google OAuth 2.0 Single Sign-On' : 'Local Email & Password (Encrypted)',
                  hint: user?.googleId ? `Linked Google ID: ${user.googleId.slice(0, 10)}...` : 'Direct database authentication'
                },
                {
                  label: 'System User ID',
                  value: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>
                        {user?._id || 'N/A'}
                      </code>
                      {user?._id && (
                        <button
                          type="button"
                          onClick={() => handleCopy(user._id, 'User ID')}
                          title="Copy User ID"
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                  ),
                  hint: 'Unique persistent database identifier'
                }
              ].map(({ label, value, hint }) => (
                <div 
                  key={label} 
                  style={{ 
                    padding: '13px 0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {label}
                    </span>
                    {hint && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {hint}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Card 3: Recent Projects (Requested Improvement for Lower-Left Area) ── */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="profile-section-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderCode size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Recent Projects
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Workspaces and repositories owned by your account
                  </p>
                </div>
              </div>

              <Link
                to="/projects"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)',
                  textDecoration: 'none'
                }}
              >
                View All ({projects.length}) <ArrowRight size={13} />
              </Link>
            </div>

            {loadingData ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <RefreshCw size={16} className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                Loading your workspaces...
              </div>
            ) : projects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projects.slice(0, 3).map((project) => {
                  const lang = getProjectLanguage(project);
                  const langColor = getLanguageColor(lang);

                  return (
                    <div
                      key={project._id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                        transition: 'border-color 0.2s ease, background 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flex: 1 }}>
                        <div
                          style={{
                            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary)', flexShrink: 0
                          }}
                        >
                          <Code2 size={18} />
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {project.name}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem', fontWeight: 600,
                                padding: '1px 6px', borderRadius: 4,
                                background: 'var(--bg-card)',
                                color: langColor,
                                border: '1px solid var(--border)'
                              }}
                            >
                              {lang}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span>Updated {safeDistance(project.updatedAt || project.createdAt)}</span>
                            <span>•</span>
                            <span>{project.files?.length || 0} files</span>
                          </div>
                        </div>
                      </div>

                      <Link
                        to={`/editor?project=${project._id}`}
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        Open Project <ArrowRight size={12} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '28px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border)'
                }}
              >
                <FolderOpen size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  No projects created yet
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto 14px' }}>
                  Start analyzing code and detecting vulnerabilities by creating your first project workspace.
                </p>
                <Link
                  to="/projects"
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} /> Create Project
                </Link>
              </div>
            )}
          </motion.div>

          {/* ── Card 4: Usage Overview (Compact Operational Summary) ── */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="profile-section-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cpu size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Usage Overview
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Workload metrics, code analyses, and AI generation activity
                  </p>
                </div>
              </div>

              <Link
                to="/token-usage"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: '0.78rem', fontWeight: 600, color: 'var(--primary)',
                  textDecoration: 'none'
                }}
              >
                Token Details <ArrowRight size={13} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  AST Analyses
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                  {user?.stats?.totalAnalyses || 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Automated security scans
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  AI Inferences
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>
                  {user?.stats?.totalAiRequests || 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Autonomous code repairs
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  Compilations
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--warning)' }}>
                  {user?.stats?.totalCompilations || 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Runtime build executions
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                  Token Consumption
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {usageStats?.totalTokens ? usageStats.totalTokens.toLocaleString() : '0'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  LLM prompt & response tokens
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* ── RIGHT COLUMN (36% width): SECURITY, ACTIVITY & QUICK NAV ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Card 1: Account Security */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="profile-section-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Account Security
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Protection protocols and credentials
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Authentication Provider
                  </span>
                  <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
                    {user?.authProvider === 'google' ? 'Google SSO' : 'Encrypted Password'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {user?.authProvider === 'google'
                    ? 'Authenticated through Google Identity Services. Password protection and multi-factor authentication are enforced by Google.'
                    : 'Account secured with cryptographic one-way salted password hashing (Bcrypt). Access is authorized with signed JWT tokens.'}
                </p>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Session Token
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>
                    Active (7-day validity)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  Stateless JSON Web Token stored securely in browser local storage. Sessions expire after 7 days of inactivity.
                </p>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Authorization Scope
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                    {user?.role === 'admin' ? 'Superadmin Level' : 'Standard Developer'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  {user?.role === 'admin'
                    ? 'Has full access to user management, system activity audit logs, and global platform analytics.'
                    : 'Has access to project creation, AST code analysis, AI assistant tools, and compiler services.'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Recent Account Activity Timeline */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="profile-section-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Recent Activity
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Audit trail of your account operations
                  </p>
                </div>
              </div>

              {user?.role === 'admin' && (
                <Link 
                  to="/admin/activity" 
                  style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  All Logs <ArrowRight size={12} />
                </Link>
              )}
            </div>

            {loadingData ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <RefreshCw size={16} className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                Loading recent activity...
              </div>
            ) : timelineItems.length > 0 ? (
              <div style={{ marginTop: 8 }}>
                {timelineItems.map((item) => {
                  const Icon = item.icon || Activity;
                  return (
                    <div key={item.id} className="timeline-item">
                      <div className="timeline-line" />
                      <div className="timeline-dot">
                        <Icon size={11} color={item.color || 'var(--primary)'} />
                      </div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 3 }}>
                        {item.desc}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {safeDistance(item.date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No recent activity recorded yet.
              </div>
            )}
          </motion.div>

          {/* Card 3: Quick Navigation */}
          <motion.div 
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="profile-section-card"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Compass size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Quick Navigation
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Jump directly to platform features
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/projects" className="quick-nav-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Code2 size={16} color="var(--primary)" />
                  My Projects
                </span>
                <ArrowRight size={14} color="var(--text-muted)" />
              </Link>

              <Link to="/editor" className="quick-nav-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Terminal size={16} color="var(--warning)" />
                  Code Editor & IDE
                </span>
                <ArrowRight size={14} color="var(--text-muted)" />
              </Link>

              <Link to="/token-usage" className="quick-nav-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Cpu size={16} color="var(--accent)" />
                  AI Token Usage
                </span>
                <ArrowRight size={14} color="var(--text-muted)" />
              </Link>

              <Link to="/analytics" className="quick-nav-item">
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BarChart2 size={16} color="var(--success)" />
                  Project Analytics
                </span>
                <ArrowRight size={14} color="var(--text-muted)" />
              </Link>

              {user?.role === 'admin' && (
                <Link to="/admin" className="quick-nav-item" style={{ borderLeft: '3px solid var(--accent)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={16} color="var(--accent)" />
                    Admin Dashboard
                  </span>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </Link>
              )}
            </div>
          </motion.div>

          {/* Card 4: Workspace Languages */}
          {workspaceLanguages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="profile-section-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Workspace Languages
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Languages detected across your active codebases
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {workspaceLanguages.map((lang) => (
                  <span
                    key={lang}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Profile;