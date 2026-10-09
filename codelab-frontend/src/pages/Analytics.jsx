import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { BarChart2, Code2, ShieldAlert, FolderOpen, Sparkles } from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import SpotlightCard from '../components/ui/SpotlightCard';
import ScrollReveal from '../components/ui/ScrollReveal';

const TYPE_COLORS = {
  security:        '#7F56D9',
  bug:             '#D92D20',
  code_smell:      '#F79009',
  complexity:      '#2E90FA',
  maintainability: '#12B76A',
  syntax:          '#F04438',
  unused:          '#98A2B3',
  performance:     '#2E90FA',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
      boxShadow: 'var(--shadow-md)', fontSize: '0.8rem',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || 'var(--text-secondary)' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const Analytics = () => {
  const { projects, fetchProjects, currentProject } = useProject();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (currentProject) {
      setLoading(true);
      api.get(`/analysis/${currentProject._id}/issues`)
        .then((r) => setIssues(r.data.issues))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [currentProject?._id]);

  // Derived data
  const langMap = {};
  for (const p of projects) {
    for (const l of p.languages || []) {
      langMap[l.language] = (langMap[l.language] || 0) + l.count;
    }
  }
  const langData = Object.entries(langMap)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);

  const typeMap = {};
  for (const i of issues) typeMap[i.type] = (typeMap[i.type] || 0) + 1;
  const typeData = Object.entries(typeMap)
    .map(([name, value]) => ({ name, value, color: TYPE_COLORS[name] || '#94A3B8' }))
    .sort((a, b) => b.value - a.value);

  const historyData = (currentProject?.analysisHistory || []).map((h, idx) => ({
    run: `#${idx + 1}`,
    score: h.score,
    issues: h.totalIssues,
    critical: h.critical,
    high: h.high,
  }));

  const priorityData = [
    { name: 'Critical', value: issues.filter((i) => i.priority === 'critical').length, color: '#D92D20' },
    { name: 'High',     value: issues.filter((i) => i.priority === 'high').length,     color: '#F04438' },
    { name: 'Medium',   value: issues.filter((i) => i.priority === 'medium').length,   color: '#F79009' },
    { name: 'Low',      value: issues.filter((i) => i.priority === 'low').length,      color: '#2E90FA' },
  ].filter((d) => d.value > 0);

  const fileMap = {};
  for (const i of issues) fileMap[i.file] = (fileMap[i.file] || 0) + 1;
  const fileData = Object.entries(fileMap)
    .map(([file, count]) => ({ file: file.split('/').pop(), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalIssues = projects.reduce((s, p) => s + (p.currentAnalysis?.totalIssues || 0), 0);
  const avgScore = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.currentAnalysis?.qualityScore || 100), 0) / projects.length)
    : 100;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">
          {currentProject ? `Insights for ${currentProject.name}` : 'Visual insights into your code quality'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Projects', value: projects.length, icon: <FolderOpen size={18} />, color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: 'Total Issues',   value: totalIssues,     icon: <ShieldAlert size={18} />, color: 'var(--error)',   bg: 'var(--error-light)' },
          { label: 'Avg Quality',    value: `${avgScore}%`,  icon: <BarChart2 size={18} />, color: 'var(--success)', bg: 'var(--success-light)' },
          { label: 'AI Requests',    value: user?.stats?.totalAiRequests || 0, icon: <Sparkles size={18} />, color: 'var(--accent)', bg: 'var(--accent-light)' },
        ].map((s, i) => (
          <SpotlightCard key={s.label} className="stat-card" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="stat-card-header">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div>
              <div className="stat-value">
                <AnimatedNumber value={s.value} />
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <ScrollReveal className="grid-2" delay={100} style={{ marginBottom: 20 }}>
        {/* Files by Language */}
        <div className="chart-container">
          <h3 className="chart-title">Files by Language</h3>
          {langData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={langData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="language" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} width={85} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} name="Files" animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <Code2 size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No language data available yet</p>
            </div>
          )}
        </div>

        {/* Issues by Type */}
        <div className="chart-container">
          <h3 className="chart-title">Issues by Type</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%" cy="50%"
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  animationDuration={800}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip />}
                  formatter={(v, n) => [v, n.replace(/_/g, ' ')]}
                />
                <Legend
                  formatter={(v) => (
                    <span style={{ fontSize: '0.72rem', textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                      {v.replace(/_/g, ' ')}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Run analysis to see issue types</p>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Issues by Priority */}
      {priorityData.length > 0 && (
        <ScrollReveal delay={200} className="chart-container" style={{ marginBottom: 20 }}>
          <h3 className="chart-title">Issues by Priority</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData} margin={{ top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Issues" radius={[4, 4, 0, 0]} animationDuration={800}>
                {priorityData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ScrollReveal>
      )}

      {/* Files with Most Issues */}
      {fileData.length > 0 && (
        <ScrollReveal delay={250} className="chart-container" style={{ marginBottom: 20 }}>
          <h3 className="chart-title">Files with Most Issues</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fileData} margin={{ top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="file" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="var(--error)" radius={[4, 4, 0, 0]} name="Issues" animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </ScrollReveal>
      )}

      {/* Project Health History */}
      {historyData.length > 0 && (
        <ScrollReveal delay={300} className="chart-container" style={{ marginBottom: 20 }}>
          <h3 className="chart-title">Project Health Over Time</h3>
          <p className="chart-subtitle">Analysis run history for {currentProject?.name}</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--success)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="issueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--error)" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="var(--error)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="run" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend formatter={(v) => <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{v}</span>} />
              <Area yAxisId="left" type="monotone" dataKey="issues" stroke="var(--error)" fill="url(#issueGrad)" strokeWidth={2} name="Total Issues" dot={{ r: 3 }} animationDuration={800} />
              <Area yAxisId="right" type="monotone" dataKey="score" stroke="var(--success)" fill="url(#scoreGrad)" strokeWidth={2} name="Quality Score" dot={{ r: 3 }} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </ScrollReveal>
      )}

      {!currentProject && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon"><BarChart2 size={28} /></div>
          <h3 className="empty-title">Open a project to see analytics</h3>
          <p className="empty-desc">Run analysis on a project to populate charts and detailed insights.</p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            Browse Projects
          </button>
        </div>
      )}
    </div>
  );
};

export default Analytics;
