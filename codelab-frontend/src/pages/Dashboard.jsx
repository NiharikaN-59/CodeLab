import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import api from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import {
  FolderOpen, AlertCircle, ShieldAlert, Bug, Zap,
  Activity, Code2, Plus, ArrowRight, CheckCircle,
  Clock, TrendingUp, BarChart2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import SpotlightCard from '../components/ui/SpotlightCard';

const PRIORITY_COLORS = {
  critical: '#D92D20',
  high:     '#F04438',
  medium:   '#F79009',
  low:      '#2E90FA',
};


const QualityRing = ({ score }) => {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : score >= 40 ? '#EA580C' : '#DC2626';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  const data = [
    { name: 'Score', value: score, fill: color },
    { name: 'Rest', value: 100 - score, fill: '#F1F5F9' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <RadialBarChart
          width={120} height={120}
          cx={60} cy={60}
          innerRadius={40} outerRadius={55}
          barSize={12}
          data={data}
          startAngle={90} endAngle={-270}
        >
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#F1F5F9' }} />
        </RadialBarChart>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 800, color, letterSpacing: '-1px' }}>{score}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
        </div>
      </div>
      <span style={{
        fontSize: '0.78rem', fontWeight: 600, color,
        background: color + '15',
        padding: '2px 10px',
        borderRadius: 'var(--radius-full)',
      }}>
        {label}
      </span>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, bgColor, delay = 0 }) => (
  <SpotlightCard className="stat-card" style={{ animationDelay: `${delay}ms` }}>
    <div className="stat-card-header">
      <div className="stat-icon" style={{ background: bgColor }}>
        <span style={{ color }}>{icon}</span>
      </div>
    </div>
    <div>
      <div className="stat-value">
        <AnimatedNumber value={value} />
      </div>
      <div className="stat-label">{label}</div>
    </div>
  </SpotlightCard>
);

const SkeletonCard = () => (
  <div className="stat-card">
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius)' }} />
    </div>
    <div>
      <div className="skeleton" style={{ width: 60, height: 28, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 90, height: 12 }} />
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, fetchProjects, currentProject } = useProject();
  const navigate = useNavigate();
  const [aiStatus, setAiStatus] = useState(null);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoadingProjects(true);
      await fetchProjects();
      setLoadingProjects(false);
    };
    load();
    api.get('/ai/status').then((r) => setAiStatus(r.data)).catch(() => {});
  }, [fetchProjects]);

  useEffect(() => {
    setRecentProjects(projects.slice(0, 5));
  }, [projects]);

  const totalIssues    = projects.reduce((s, p) => s + (p.currentAnalysis?.totalIssues || 0), 0);
  const criticalIssues = projects.reduce((s, p) => s + (p.currentAnalysis?.critical || 0), 0);
  const highIssues     = projects.reduce((s, p) => s + (p.currentAnalysis?.high || 0), 0);
  const securityIssues = projects.reduce((s, p) => s + (p.currentAnalysis?.securityIssues || 0), 0);
  const avgScore = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.currentAnalysis?.qualityScore || 100), 0) / projects.length)
    : 100;

  const priorityData = [
    { name: 'Critical', value: criticalIssues, color: PRIORITY_COLORS.critical },
    { name: 'High',     value: highIssues, color: PRIORITY_COLORS.high },
    { name: 'Medium',   value: projects.reduce((s, p) => s + (p.currentAnalysis?.medium || 0), 0), color: PRIORITY_COLORS.medium },
    { name: 'Low',      value: projects.reduce((s, p) => s + (p.currentAnalysis?.low || 0), 0), color: PRIORITY_COLORS.low },
  ].filter((d) => d.value > 0);

  const langMap = {};
  for (const p of projects) {
    for (const l of p.languages || []) {
      langMap[l.language] = (langMap[l.language] || 0) + l.count;
    }
  }
  const langData = Object.entries(langMap)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const activeProject = currentProject || projects[0];
  const historyData = activeProject?.analysisHistory?.slice(-10).map((h, i) => ({
    name: `Run ${i + 1}`,
    issues: h.totalIssues,
    score: h.score,
    critical: h.critical,
  })) || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="page-content" style={{ position: 'relative' }}>
      
      {/* Ambient background is handled globally in index.css */}

      {/* ─── Header ─── */}
      <div className="page-header" style={{ position: 'relative', zIndex: 1 }}>
        <div className="page-header-top">
          <div>
            <h1 className="page-title">
              {greeting}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="page-subtitle">
              {loadingProjects
                ? 'Loading your workspace...'
                : projects.length === 0
                ? 'Create your first project to get started.'
                : `${projects.length} project${projects.length !== 1 ? 's' : ''} · ${totalIssues} issue${totalIssues !== 1 ? 's' : ''} detected`}
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/projects')}
            aria-label="Create new project"
          >
            <Plus size={14} aria-hidden="true" />
            New Project
          </button>
        </div>
      </div>

      {/* AI Status Banner */}
      {aiStatus && !aiStatus.configured && (
        <div className="alert alert-warning" role="alert">
          <Zap size={15} style={{ flexShrink: 0, color: 'var(--warning)', marginTop: 1 }} aria-hidden="true" />
          <span>
            <strong>AI not configured</strong> — Add your OpenRouter API key to{' '}
            <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace', fontSize: '0.8em' }}>
              codelab-backend/.env
            </code>
            {' '}to enable AI analysis and auto-repair.
          </span>
        </div>
      )}

      {/* ─── Stats Row 1 ─── */}
      {loadingProjects ? (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {[0,1,2,3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <StatCard icon={<FolderOpen size={19} />} label="Total Projects"   value={projects.length}     color="var(--primary)"  bgColor="var(--primary-light)" delay={0} />
          <StatCard icon={<AlertCircle size={19} />} label="Total Issues"    value={totalIssues}          color="var(--error)"    bgColor="var(--error-light)"   delay={80} />
          <StatCard icon={<ShieldAlert size={19} />} label="Critical Issues" value={criticalIssues}       color="var(--critical)" bgColor="var(--critical-light)" delay={160} />
          <StatCard icon={<Activity size={19} />}    label="Security Issues" value={securityIssues}       color="var(--accent)"   bgColor="var(--accent-light)"  delay={240} />
        </div>
      )}

      {/* ─── Stats Row 2 ─── */}
      {!loadingProjects && (
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <StatCard icon={<Bug size={19} />}         label="High Priority"   value={highIssues}           color="var(--high)"     bgColor="var(--high-light)"    delay={320} />
          <StatCard icon={<Code2 size={19} />}       label="Avg Quality"     value={`${avgScore}%`}       color="var(--success)"  bgColor="var(--success-light)" delay={400} />
          <StatCard icon={<CheckCircle size={19} />} label="Analyses Run"    value={user?.stats?.totalAnalyses || 0}    color="var(--info)"     bgColor="var(--info-light)"    delay={480} />
          <StatCard icon={<Clock size={19} />}       label="Compilations"    value={user?.stats?.totalCompilations || 0} color="var(--accent)"   bgColor="var(--accent-light)"  delay={560} />
        </div>
      )}

      {/* ─── Charts Row ─── */}
      <div className="grid-3 stagger-2" style={{ marginBottom: 24 }}>
        {/* Issues by Priority */}
        <div className="chart-container">
          <h3 className="chart-title">Issues by Priority</h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem' }}
                  formatter={(v, n) => [v, n]}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <CheckCircle size={28} style={{ color: 'var(--success)', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>No issues detected yet</p>
            </div>
          )}
        </div>

        {/* Files by Language */}
        <div className="chart-container">
          <h3 className="chart-title">Files by Language</h3>
          {langData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={langData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="language" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={75} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem' }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <Code2 size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>Upload files to see distribution</p>
            </div>
          )}
        </div>

        {/* Quality Score */}
        <div className="chart-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 className="chart-title" style={{ textAlign: 'center' }}>Code Quality Score</h3>
          <QualityRing score={avgScore} />
          <div style={{ marginTop: 20, width: '100%' }}>
            {[
              { label: 'Critical', value: criticalIssues, color: 'var(--critical)' },
              { label: 'High',     value: highIssues, color: 'var(--high)' },
              { label: 'Security', value: securityIssues, color: 'var(--accent)' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Project Health History ─── */}
      {historyData.length > 0 && (
        <div className="chart-container stagger-3" style={{ marginBottom: 24 }}>
          <h3 className="chart-title">Project Health Over Time</h3>
          <p className="chart-subtitle">Analysis history for {activeProject?.name}</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={historyData} margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.8rem' }} />
              <Legend formatter={(v) => <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{v}</span>} />
              <Line yAxisId="left"  type="monotone" dataKey="issues"   stroke="var(--error)"   strokeWidth={2} dot={{ r: 3 }} name="Total Issues"   animationDuration={800} />
              <Line yAxisId="right" type="monotone" dataKey="score"    stroke="var(--success)" strokeWidth={2} dot={{ r: 3 }} name="Quality Score"  animationDuration={800} />
              <Line yAxisId="left"  type="monotone" dataKey="critical" stroke="var(--critical)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Critical" animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Recent Projects ─── */}
      <div className="card stagger-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Projects</h3>
            {recentProjects.length > 0 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {recentProjects.length} of {projects.length} projects
              </p>
            )}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/projects')}
            aria-label="View all projects"
          >
            View all <ArrowRight size={13} aria-hidden="true" />
          </button>
        </div>

        {loadingProjects ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0' }}>
                <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '45%', height: 13, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: '65%', height: 11 }} />
                </div>
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-icon">
              <FolderOpen size={28} aria-hidden="true" />
            </div>
            <h4 className="empty-title">No projects yet</h4>
            <p className="empty-desc">Create your first project to start analyzing code with AI</p>
            <button className="btn btn-primary" onClick={() => navigate('/projects')}>
              <Plus size={14} aria-hidden="true" /> Create Project
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {recentProjects.map((project) => (
              <div
                key={project._id}
                onClick={() => navigate(`/editor?project=${project._id}`)}
                role="button"
                tabIndex={0}
                aria-label={`Open project ${project.name}`}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/editor?project=${project._id}`)}
                className="pointer"
                style={{
                  padding: '13px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'var(--transition)',
                  borderRadius: 'var(--radius-sm)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.paddingLeft = '6px';
                  e.currentTarget.style.paddingRight = '6px';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.paddingLeft = '0';
                  e.currentTarget.style.paddingRight = '0';
                }}
              >
                <div style={{
                  width: 36, height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0,
                }}>
                  <FolderOpen size={15} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.name}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                    {project.files?.length || 0} files
                    {project.primaryLanguage && project.primaryLanguage !== 'unknown' && ` · ${project.primaryLanguage}`}
                    {project.lastSaved && ` · Saved ${formatDistanceToNow(new Date(project.lastSaved), { addSuffix: true })}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
                  {project.currentAnalysis?.critical > 0 && (
                    <span className="badge badge-critical">{project.currentAnalysis.critical} critical</span>
                  )}
                  {project.currentAnalysis?.high > 0 && !project.currentAnalysis?.critical && (
                    <span className="badge badge-high">{project.currentAnalysis.high} high</span>
                  )}
                  <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
