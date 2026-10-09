import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Search, Play, ShieldAlert, Bug, Code2, Zap, AlertTriangle,
  CheckCircle, Clock, RefreshCw, Lightbulb, Wrench, ChevronDown,
  ChevronRight, X, FileCode, Star, Activity
} from 'lucide-react';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import SpotlightCard from '../components/ui/SpotlightCard';

const TYPE_ICONS = {
  security: <ShieldAlert size={14} />,
  bug: <Bug size={14} />,
  code_smell: <Code2 size={14} />,
  complexity: <Activity size={14} />,
  maintainability: <Star size={14} />,
  syntax: <AlertTriangle size={14} />,
  unused: <X size={14} />,
  performance: <Zap size={14} />,
};

const TYPE_COLORS = {
  security: 'var(--accent)',
  bug: 'var(--error)',
  code_smell: 'var(--warning)',
  complexity: 'var(--info)',
  maintainability: 'var(--success)',
  syntax: 'var(--error)',
  unused: 'var(--text-muted)',
  performance: 'var(--warning)',
};

const IssueCard = ({ issue, onRepair, onAccept, onReject, mode }) => {
  const [expanded, setExpanded] = useState(false);
  const [repairData, setRepairData] = useState(null);
  const [loadingRepair, setLoadingRepair] = useState(false);
  const [aiData, setAiData] = useState(null);       // cached AI enrichment
  const [loadingAi, setLoadingAi] = useState(false);
  const enrichFetched = React.useRef(false);

  // Lazy-load AI enrichment once when card is first expanded
  const handleExpand = async () => {
    const nowOpen = !expanded;
    setExpanded(nowOpen);
    if (!nowOpen || enrichFetched.current) return;
    enrichFetched.current = true;

    // If already stored on the issue from the analysis run, use it directly
    const hasAi = issue.aiExplanation && !issue.aiExplanation.includes('unavailable') && !issue.aiExplanation.includes('OPENROUTER');
    const hasHint = issue.hint && !issue.hint.includes('unavailable') && !issue.hint.includes('OPENROUTER');
    if (hasAi || hasHint) {
      setAiData({
        aiExplanation: issue.aiExplanation,
        aiSeverityReason: issue.aiSeverityReason,
        potentialImpact: issue.potentialImpact,
        suggestedFix: issue.suggestedFix,
        improvedCode: issue.improvedCode,
        repairRecommendation: issue.repairRecommendation,
        hint: issue.hint,
        possibleApproach: issue.possibleApproach,
        relevantConcepts: issue.relevantConcepts,
      });
      return;
    }

    // Fetch from backend (which caches result in DB)
    setLoadingAi(true);
    try {
      const res = await api.get(`/analysis/issues/${issue._id}/enrich?mode=${mode}`);
      if (res.data.success) setAiData(res.data);
    } catch { /* silently fail */ } finally {
      setLoadingAi(false);
    }
  };

  const merged = aiData ? { ...issue, ...aiData } : issue;

  const handleRepair = async () => {
    setLoadingRepair(true);
    try {
      const result = await onRepair(issue._id);
      if (result?.repair) setRepairData(result.repair);
    } finally {
      setLoadingRepair(false);
    }
  };

  return (
    <div className="card card-sm" style={{ marginBottom: '12px' }}>
      <div className="issue-card-header">
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: `${TYPE_COLORS[issue.type]}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TYPE_COLORS[issue.type],
            flexShrink: 0,
          }}
        >
          {TYPE_ICONS[issue.type] || <AlertTriangle size={14} />}
        </div>
        <div style={{ flex: 1 }}>
          <div className="issue-title">{issue.title}</div>
          <div className="issue-meta">
            <span className={`badge badge-${issue.priority}`}>{issue.priority}</span>
            <span className={`badge badge-${issue.type || 'neutral'}`} style={{ textTransform: 'capitalize' }}>{issue.type?.replace(/_/g, ' ')}</span>
            <span className="issue-file">
              <FileCode size={10} />
              {issue.file}{issue.line ? `:${issue.line}` : ''}
            </span>
          </div>
        </div>
        <button
          onClick={handleExpand}
          className="btn-icon btn-ghost"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      <div className={`expandable ${expanded ? 'expanded' : ''}`}>
        <div className="expandable-content">
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>{issue.description}</p>

            {issue.codeSnippet && (
              <div className="code-block" style={{ marginBottom: '12px' }}>
                {issue.codeSnippet}
              </div>
            )}

            {/* AI loading spinner */}
            {loadingAi && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', marginBottom: '10px', background: 'var(--info-light)', borderRadius: 'var(--radius-sm)' }}>
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--info)' }} aria-hidden="true" />
                <span style={{ fontSize: '0.78rem', color: 'var(--info)' }}>Fetching AI analysis...</span>
              </div>
            )}

            {merged.aiExplanation && !merged.aiExplanation.includes('unavailable') && !merged.aiExplanation.includes('OPENROUTER') && (
              <div style={{ background: 'var(--info-light)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--info)', marginBottom: '4px' }}>🤖 AI ANALYSIS</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{merged.aiExplanation}</p>
              </div>
            )}

            {merged.potentialImpact && (
              <div style={{ background: 'var(--error-light)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--error)', marginBottom: '4px' }}>⚡ POTENTIAL IMPACT</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{merged.potentialImpact}</p>
              </div>
            )}

            {merged.hint && !merged.hint.includes('unavailable') && !merged.hint.includes('OPENROUTER') && (
              <div style={{ background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '4px' }}>💡 HINT</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{merged.hint}</p>
                {merged.possibleApproach && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}><em>{merged.possibleApproach}</em></p>}
                {merged.relevantConcepts?.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {merged.relevantConcepts.map((c, i) => (
                      <span key={i} className="badge badge-neutral">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {merged.suggestedFix && !repairData && (
              <div style={{ background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', padding: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>✅ SUGGESTED FIX</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{merged.suggestedFix}</p>
              </div>
            )}

            {merged.improvedCode && !repairData && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>IMPROVED CODE</div>
                <div className="code-block">{merged.improvedCode}</div>
              </div>
            )}

            {/* Repair Panel */}
            {repairData && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', fontSize: '0.78rem', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>
                  🔧 Proposed Repair <span className={`badge badge-${repairData.confidence === 'high' ? 'success' : repairData.confidence === 'medium' ? 'medium' : 'neutral'}`}>{repairData.confidence} confidence</span>
                </div>
                <div className="diff-container" style={{ padding: '10px' }}>
                  <div className="diff-panel">
                    <div className="diff-panel-header old">❌ Original</div>
                    <div className="diff-code">{repairData.originalCode}</div>
                  </div>
                  <div className="diff-panel">
                    <div className="diff-panel-header new">✅ Repaired</div>
                    <div className="diff-code">{repairData.repairedCode}</div>
                  </div>
                </div>
                {repairData.explanation && (
                  <div style={{ padding: '10px 14px', background: 'var(--info-light)', fontSize: '0.78rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border)' }}>
                    ℹ️ {repairData.explanation}
                  </div>
                )}
                <div style={{ padding: '10px 14px', display: 'flex', gap: '8px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-success btn-sm" onClick={() => onAccept(issue._id, repairData)}>
                    <CheckCircle size={13} aria-hidden="true" /> Accept Repair
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setRepairData(null); onReject(issue._id); }}>
                    <X size={13} aria-hidden="true" /> Reject
                  </button>
                </div>
              </div>
            )}

            {issue.status === 'open' && !repairData && mode !== 'hint' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleRepair}
                  disabled={loadingRepair}
                >
                  {loadingRepair ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Generating...</> : <><Wrench size={12} aria-hidden="true" /> Auto Repair</>}
                </button>
              </div>
            )}

            {issue.status !== 'open' && (
              <span className={`badge ${issue.status === 'accepted' ? 'badge-success' : 'badge-neutral'}`}>
                {issue.status === 'accepted' ? '✓ Repair accepted' : `Status: ${issue.status}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Analysis = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentProject, projects, openProject, updateCurrentProject } = useProject();
  const projectId = searchParams.get('project') || currentProject?._id;

  const [issues, setIssues] = useState([]);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState('full');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    if (projectId && (!currentProject || currentProject._id !== projectId)) {
      openProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadIssues();
  }, [projectId, filterPriority, filterType]);

  const loadIssues = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPriority) params.append('priority', filterPriority);
      if (filterType) params.append('type', filterType);
      const res = await api.get(`/analysis/${projectId}/issues?${params}`);
      setIssues(res.data.issues);
    } catch { } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!projectId) {
      toast.error('Please select a project first');
      return;
    }
    setRunning(true);
    const toastId = toast.loading('Running analysis pipeline...');
    try {
      const res = await api.post(`/analysis/${projectId}/run`, { mode });
      setAnalysisResult(res.data.analysis);
      setIssues(res.data.analysis.issues || []);
      updateCurrentProject({ currentAnalysis: res.data.analysis.project?.currentAnalysis, lastAnalyzed: new Date() });
      toast.success(`Analysis complete! Found ${res.data.analysis.summary?.total || 0} issues.`, { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed', { id: toastId });
    } finally {
      setRunning(false);
    }
  };

  const handleRepair = async (issueId) => {
    try {
      const res = await api.post(`/analysis/issues/${issueId}/repair`);
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Repair generation failed');
      return null;
    }
  };

  const handleAcceptRepair = async (issueId, repairData) => {
    try {
      await api.post(`/analysis/issues/${issueId}/accept-repair`, repairData);
      toast.success('Repair applied successfully!');
      setIssues((prev) => prev.map((i) => i._id === issueId ? { ...i, status: 'accepted' } : i));
      if (currentProject?._id) {
        await openProject(currentProject._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply repair');
    }
  };

  const handleRejectRepair = async (issueId) => {
    try {
      await api.post(`/analysis/issues/${issueId}/reject-repair`);
      setIssues((prev) => prev.map((i) => i._id === issueId ? { ...i, status: 'rejected' } : i));
    } catch { }
  };

  const summary = analysisResult?.summary || currentProject?.currentAnalysis;

  const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];
  const groupedIssues = PRIORITY_ORDER.reduce((acc, p) => {
    const group = issues.filter((i) => i.priority === p);
    if (group.length > 0) acc[p] = group;
    return acc;
  }, {});

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Code Analysis</h1>
            <p className="page-subtitle">
              {currentProject ? `Project: ${currentProject.name}` : 'Select a project to analyze'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!currentProject && projects.length > 0 && (
            <select
              className="form-input"
              onChange={(e) => navigate(`/analysis?project=${e.target.value}`)}
              style={{ maxWidth: '200px' }}
            >
              <option value="">Select project...</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          )}
          <select
            className="form-input"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={{ maxWidth: '180px' }}
          >
            <option value="full">Mode: Full Analysis</option>
            <option value="hint">Mode: Hint Only</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={runAnalysis}
            disabled={running || !projectId}
          >
            {running ? (
              <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Analyzing...</>
            ) : (
              <><Play size={14} aria-hidden="true" /> Run Analysis</>
            )}
          </button>
        </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid-4 stagger-1" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Issues', value: summary.totalIssues || summary.total || 0, color: 'var(--text-primary)', bg: 'var(--bg-hover)' },
            { label: 'Critical', value: summary.critical || 0, color: 'var(--critical)', bg: 'var(--critical-light)' },
            { label: 'High', value: summary.high || 0, color: 'var(--high)', bg: 'var(--high-light)' },
            { label: 'Security', value: summary.securityIssues || summary.security || 0, color: 'var(--accent)', bg: 'var(--accent-light)' },
          ].map((item, idx) => (
            <SpotlightCard key={item.label} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: '12px', animation: 'fadeUp 0.3s var(--ease) both', animationDelay: `${idx * 50}ms` }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: item.color }}>
                  <AnimatedNumber value={item.value} />
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{item.label}</span>
            </SpotlightCard>
          ))}
        </div>
      )}

      {/* Filters */}
      {issues.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <select className="form-input" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ maxWidth: '160px' }}>
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className="form-input" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ maxWidth: '180px' }}>
            <option value="">All Types</option>
            <option value="security">Security</option>
            <option value="bug">Bug</option>
            <option value="code_smell">Code Smell</option>
            <option value="complexity">Complexity</option>
            <option value="maintainability">Maintainability</option>
            <option value="performance">Performance</option>
            <option value="syntax">Syntax</option>
            <option value="unused">Unused</option>
            <option value="duplicate">Duplicate</option>
          </select>
        </div>
      )}

      {/* Issues List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : issues.length === 0 ? (
        <div className="empty-state" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Subtle Mesh Gradient */}
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 20% 30%, rgba(99, 102, 241, 0.05), transparent 60%), radial-gradient(circle at 80% 70%, rgba(124, 58, 237, 0.04), transparent 60%)',
              zIndex: 0, pointerEvents: 'none'
            }}
            aria-hidden="true"
          />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {projectId ? (
            <>
              <div className="empty-icon"><Search size={32} /></div>
              <h3 className="empty-title">No issues found</h3>
              <p className="empty-desc">Run analysis to detect issues in your project's code</p>
              <button className="btn btn-primary" onClick={runAnalysis} disabled={running}>
                <Play size={14} /> Run Analysis
              </button>
            </>
          ) : (
            <>
              <div className="empty-icon"><Search size={32} /></div>
              <h3 className="empty-title">No project selected</h3>
              <p className="empty-desc">Select a project from the Projects page to analyze it</p>
              <button className="btn btn-primary" onClick={() => navigate('/projects')}>Browse Projects</button>
            </>
          )}
          </div>
        </div>
      ) : (
        <div className="stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groupedIssues).map(([priority, group]) => (
            <div key={priority}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span className={`badge badge-${priority}`} style={{ fontSize: '0.75rem' }}>
                  {priority.toUpperCase()} ({group.length})
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.map((issue) => (
                  <IssueCard
                    key={issue._id}
                    issue={issue}
                    onRepair={handleRepair}
                    onAccept={handleAcceptRepair}
                    onReject={handleRejectRepair}
                    mode={mode}
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

export default Analysis;
