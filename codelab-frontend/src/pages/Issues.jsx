import React, { useEffect, useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { AlertCircle, ShieldAlert, Bug, Code2, Search, X, ArrowRight, ScanSearch, Activity, Star } from 'lucide-react';

const TYPE_ICONS = {
  security:        <ShieldAlert size={12} />,
  bug:             <Bug size={12} />,
  code_smell:      <Code2 size={12} />,
  complexity:      <Activity size={12} />,
  maintainability: <Star size={12} />,
};

const PRIORITY_LABEL_COLORS = {
  critical: { bg: 'var(--critical-light)', text: 'var(--critical)', border: 'rgba(220,38,38,0.2)' },
  high:     { bg: 'var(--high-light)',     text: 'var(--high)',     border: 'rgba(234,88,12,0.2)' },
  medium:   { bg: 'var(--medium-light)',   text: 'var(--medium)',   border: 'rgba(217,119,6,0.2)' },
  low:      { bg: 'var(--low-light)',      text: 'var(--low)',      border: 'rgba(37,99,235,0.2)' },
};

const IssueRow = ({ issue, onClick }) => {
  const pc = PRIORITY_LABEL_COLORS[issue.priority] || {};
  return (
    <div
      className="card card-sm card-hover"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View issue: ${issue.title}`}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{ cursor: 'pointer', marginBottom: 6, animation: 'fadeUp 0.25s var(--ease) both' }}
    >
      <div className="issue-card-header">
        <div style={{
          width: 28, height: 28,
          borderRadius: 'var(--radius-xs)',
          background: pc.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: pc.text, flexShrink: 0,
        }} aria-hidden="true">
          {TYPE_ICONS[issue.type] || <AlertCircle size={12} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="issue-title" style={{ marginBottom: 5 }}>{issue.title}</div>
          <div className="issue-meta">
            <span className={`badge badge-${issue.priority}`}>{issue.priority}</span>
            <span className={`badge badge-${issue.type || 'neutral'}`} style={{ textTransform: 'capitalize' }}>
              {issue.type?.replace(/_/g, ' ')}
            </span>
            <span className="issue-file">
              <Code2 size={9} aria-hidden="true" />
              {issue.file}{issue.line ? `:${issue.line}` : ''}
            </span>
            {issue.status !== 'open' && (
              <span className={`badge ${issue.status === 'accepted' ? 'badge-success' : 'badge-neutral'}`}>
                {issue.status}
              </span>
            )}
          </div>
        </div>
        <ArrowRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
      </div>
      {issue.description && (
        <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.55 }}>
          {issue.description}
        </p>
      )}
    </div>
  );
};

const Issues = () => {
  const { currentProject } = useProject();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (currentProject?._id) loadIssues();
  }, [currentProject?._id, filterPriority, filterType, filterStatus]);

  const loadIssues = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPriority) params.append('priority', filterPriority);
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      const res = await api.get(`/analysis/${currentProject._id}/issues?${params}`);
      setIssues(res.data.issues);
    } catch {} finally {
      setLoading(false);
    }
  };

  const filtered = issues.filter((i) =>
    !search ||
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    i.file.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = ['critical', 'high', 'medium', 'low'].reduce((acc, p) => {
    const group = filtered.filter((i) => i.priority === p);
    if (group.length > 0) acc[p] = group;
    return acc;
  }, {});

  // Summary counts
  const analysis = currentProject?.currentAnalysis;

  if (!currentProject) {
    return (
      <div className="page-content">
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div className="empty-icon"><AlertCircle size={28} aria-hidden="true" /></div>
          <h3 className="empty-title">No project open</h3>
          <p className="empty-desc">Open a project first to view and manage its issues.</p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            Browse Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Issues</h1>
            <p className="page-subtitle">
              {currentProject.name} · {issues.length} issue{issues.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/analysis?project=${currentProject._id}`)}
            aria-label="Run new analysis"
          >
            <ScanSearch size={13} aria-hidden="true" /> Run Analysis
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4 stagger-1" style={{ marginBottom: 24 }}>
        {[
          { label: 'Critical', value: analysis?.critical || 0, cls: 'badge-critical', dotCls: 'dot-critical' },
          { label: 'High',     value: analysis?.high || 0,     cls: 'badge-high',     dotCls: 'dot-high' },
          { label: 'Medium',   value: analysis?.medium || 0,   cls: 'badge-medium',   dotCls: 'dot-medium' },
          { label: 'Low',      value: analysis?.low || 0,      cls: 'badge-low',      dotCls: 'dot-low' },
        ].map(({ label, value, cls, dotCls }) => (
          <div
            key={label}
            className="card card-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => setFilterPriority(label.toLowerCase() === filterPriority ? '' : label.toLowerCase())}
            role="button"
            aria-label={`Filter by ${label} priority`}
          >
            <div className={`priority-dot ${dotCls}`} aria-hidden="true" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="stagger-2" style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search size={14} className="search-input-icon" aria-hidden="true" />
          <input
            className="search-input"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search issues"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>

        <select
          className="form-input"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ maxWidth: 140 }}
          aria-label="Filter by status"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="accepted">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          className="form-input"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ maxWidth: 145 }}
          aria-label="Filter by priority"
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          className="form-input"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ maxWidth: 165 }}
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          <option value="security">Security</option>
          <option value="bug">Bug</option>
          <option value="code_smell">Code Smell</option>
          <option value="complexity">Complexity</option>
          <option value="maintainability">Maintainability</option>
        </select>

        {(filterPriority || filterType || filterStatus !== 'open') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFilterPriority(''); setFilterType(''); setFilterStatus('open'); setSearch(''); }}
            aria-label="Clear all filters"
          >
            <X size={13} aria-hidden="true" /> Clear filters
          </button>
        )}
      </div>

      {/* Issue List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} className="card card-sm" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 'var(--radius-xs)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '55%', height: 13, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '35%', height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true"><AlertCircle size={28} /></div>
          <h3 className="empty-title">
            {search || filterPriority || filterType ? 'No matching issues' : 'No issues found'}
          </h3>
          <p className="empty-desc">
            {search || filterPriority || filterType
              ? 'Try adjusting your filters or search term.'
              : 'Run analysis to detect issues in your code.'}
          </p>
          {!search && !filterPriority && !filterType && (
            <button className="btn btn-primary" onClick={() => navigate(`/analysis?project=${currentProject._id}`)}>
              <ScanSearch size={14} aria-hidden="true" /> Run Analysis
            </button>
          )}
        </div>
      ) : (
        <div className="stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped).map(([priority, group]) => (
            <div key={priority}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className={`badge badge-${priority}`} style={{ fontSize: '0.7rem' }}>
                  {priority.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {group.length} issue{group.length !== 1 ? 's' : ''}
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.map((issue) => (
                  <IssueRow
                    key={issue._id}
                    issue={issue}
                    onClick={() => navigate(`/analysis?project=${currentProject._id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Issues;
