import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Search, Play, ShieldAlert, Bug, Code2, Zap, AlertTriangle,
  CheckCircle, Clock, RefreshCw, Lightbulb, Wrench, ChevronDown,
  ChevronRight, X, FileCode, Star, Activity, ShieldCheck, Database,
  Network, Layers, GitBranch, CheckCircle2, XCircle, AlertCircle,
  ExternalLink, KeyRound, Package, Workflow, Info
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
  const [aiData, setAiData] = useState(null); // cached AI enrichment
  const [loadingAi, setLoadingAi] = useState(false);
  const enrichFetched = React.useRef(false);

  // Lazy-load AI enrichment once when card is first expanded
  const handleExpand = async () => {
    const nowOpen = !expanded;
    setExpanded(nowOpen);
    if (!nowOpen || enrichFetched.current) return;
    enrichFetched.current = true;

    // If already stored on the issue from the analysis run, use it directly
    const hasAi = issue.aiExplanation && !issue.aiExplanation.includes('unavailable') && !issue.aiExplanation.includes('OPENROUTER') && !issue.aiExplanation.includes('Failed to parse');
    const hasHint = issue.hint && !issue.hint.includes('unavailable') && !issue.hint.includes('OPENROUTER') && !issue.hint.includes('Failed to parse');
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
    <div className="card card-sm card-hover" style={{ marginBottom: '12px', animation: 'fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      <div className="issue-card-header">
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            background: `${TYPE_COLORS[issue.type] || 'var(--primary)'}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: TYPE_COLORS[issue.type] || 'var(--primary)',
            flexShrink: 0,
          }}
        >
          {TYPE_ICONS[issue.type] || <AlertTriangle size={15} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="issue-title" style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {issue.title}
          </div>
          <div className="issue-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className={`badge badge-${issue.priority}`}>{issue.priority}</span>
            <span className={`badge badge-${issue.type || 'neutral'}`} style={{ textTransform: 'capitalize' }}>
              {issue.type?.replace(/_/g, ' ')}
            </span>
            
            {/* Source Label */}
            {issue.source && (
              <span className="badge badge-purple" style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                {issue.source}
              </span>
            )}

            {/* Affected Component Tag */}
            {issue.component && (
              <span className="badge badge-neutral" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                {issue.component}
              </span>
            )}

            <span className="issue-file">
              <FileCode size={11} />
              {issue.file}{issue.line ? `:${issue.line}` : ''}
            </span>
          </div>
        </div>
        <button
          onClick={handleExpand}
          className="btn-icon btn-ghost"
          aria-label={expanded ? 'Collapse issue' : 'Expand issue'}
        >
          <ChevronRight size={15} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
        </button>
      </div>

      <div className={`expandable ${expanded ? 'expanded' : ''}`}>
        <div className="expandable-content">
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.55 }}>
              {issue.description}
            </p>

            {/* Evidence & Logs */}
            {issue.evidence && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🔍 Forensic Evidence & Inspection Log
                </div>
                <code style={{ fontSize: '0.775rem', color: 'var(--text-primary)', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                  {issue.evidence}
                </code>
              </div>
            )}

            {/* Code Snippet */}
            {issue.codeSnippet && (
              <div className="code-block" style={{ marginBottom: '12px' }}>
                {issue.codeSnippet}
              </div>
            )}

            {/* AI loading spinner */}
            {loadingAi && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px', marginBottom: '10px', background: 'var(--info-light)', borderRadius: 'var(--radius-sm)' }}>
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--info)' }} aria-hidden="true" />
                <span style={{ fontSize: '0.78rem', color: 'var(--info)' }}>Synthesizing root cause analysis & remediation approach...</span>
              </div>
            )}

            {/* AI Root Cause Analysis */}
            {merged.aiExplanation &&
              !merged.aiExplanation.includes('unavailable') &&
              !merged.aiExplanation.includes('OPENROUTER') &&
              !merged.aiExplanation.includes('Failed to parse') &&
              !merged.aiExplanation.includes('unrecognized format') &&
              !merged.aiExplanation.includes('Clear explanation of the issue') && (
              <div style={{ background: 'var(--info-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--info)', marginBottom: '4px' }}>🤖 AI ROOT CAUSE EXPLANATION</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{merged.aiExplanation}</p>
              </div>
            )}

            {/* Potential Impact */}
            {merged.potentialImpact && (
              <div style={{ background: 'var(--error-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--error)', marginBottom: '4px' }}>⚡ POTENTIAL IMPACT & SYSTEM RISK</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{merged.potentialImpact}</p>
              </div>
            )}

            {/* Reproduction Steps */}
            {issue.reproductionSteps && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🧪 Steps to Reproduce
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>{issue.reproductionSteps}</p>
              </div>
            )}

            {/* Hint */}
            {merged.hint && !merged.hint.includes('unavailable') && !merged.hint.includes('OPENROUTER') && !merged.hint.includes('Failed to parse') && (
              <div style={{ background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '4px' }}>💡 HINT & GUIDANCE</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{merged.hint}</p>
                {merged.possibleApproach && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}><em>{merged.possibleApproach}</em></p>}
                {merged.relevantConcepts?.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {merged.relevantConcepts.map((c, i) => (
                      <span key={i} className="badge badge-neutral">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Suggested Fix */}
            {merged.suggestedFix && !repairData && (
              <div style={{ background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', marginBottom: '4px' }}>✅ RECOMMENDED SOLUTION</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0 }}>{merged.suggestedFix}</p>
              </div>
            )}

            {/* Improved Code */}
            {merged.improvedCode && !repairData && (
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>IMPROVED CODE FIX</div>
                <div className="code-block">{merged.improvedCode}</div>
              </div>
            )}

            {/* Interactive Repair Panel with Diff */}
            {repairData && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '12px', animation: 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-hover)', fontSize: '0.78rem', fontWeight: 600, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🔧 AI Autonomous Code Patch</span>
                  <span className={`badge badge-${repairData.confidence === 'high' ? 'success' : repairData.confidence === 'medium' ? 'medium' : 'neutral'}`}>
                    {repairData.confidence} confidence
                  </span>
                </div>
                <div className="diff-container" style={{ padding: '10px' }}>
                  <div className="diff-panel">
                    <div className="diff-panel-header old">❌ Original Code</div>
                    <div className="diff-code">{repairData.originalCode}</div>
                  </div>
                  <div className="diff-panel">
                    <div className="diff-panel-header new">✅ Repaired Code</div>
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
                    <CheckCircle size={13} aria-hidden="true" /> Accept & Apply Patch
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setRepairData(null); onReject(issue._id); }}>
                    <X size={13} aria-hidden="true" /> Dismiss
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
                  {loadingRepair ? (
                    <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Synthesizing Fix...</>
                  ) : (
                    <><Wrench size={12} aria-hidden="true" /> AI Auto Repair</>
                  )}
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
  const [filterSource, setFilterSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showTopologyMap, setShowTopologyMap] = useState(false);

  useEffect(() => {
    if (projectId && (!currentProject || currentProject._id !== projectId)) {
      openProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadIssues();
  }, [projectId, filterPriority, filterType, filterSource]);

  const loadIssues = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPriority) params.append('priority', filterPriority);
      if (filterType) params.append('type', filterType);
      if (filterSource) params.append('source', filterSource);
      const res = await api.get(`/analysis/${projectId}/issues?${params}`);
      setIssues(res.data.issues || []);
      if (res.data.auditSummary || res.data.currentAnalysis) {
        setAnalysisResult((prev) => ({
          ...prev,
          auditSummary: res.data.auditSummary || res.data.currentAnalysis?.auditSummary,
          summary: res.data.currentAnalysis || prev?.summary,
          qualityScore: res.data.currentAnalysis?.qualityScore ?? res.data.qualityScore,
        }));
      }
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
    const toastId = toast.loading('Running full end-to-end audit pipeline...');
    try {
      const res = await api.post(`/analysis/${projectId}/run`, { mode });
      if (!res.data.success || !res.data.analysis) {
        throw new Error(res.data.message || 'Analysis could not be completed.');
      }
      setAnalysisResult(res.data.analysis);
      setIssues(res.data.analysis.issues || []);
      if (res.data.analysis.project?.currentAnalysis) {
        updateCurrentProject({
          currentAnalysis: res.data.analysis.project.currentAnalysis,
          lastAnalyzed: new Date(),
        });
      }
      toast.success(
        `Audit complete! Inspected ${res.data.analysis.auditSummary?.filesInspected || 0} files and ${res.data.analysis.auditSummary?.apisChecked || 0} APIs. Found ${res.data.analysis.summary?.total || 0} issues.`,
        { id: toastId }
      );
    } catch (err) {
      const rawMsg = err.response?.data?.message || err.message || 'Analysis failed';
      const cleanMsg = typeof rawMsg === 'string' && rawMsg.length > 120
        ? rawMsg.slice(0, 117) + '...'
        : rawMsg;
      toast.error(cleanMsg, { id: toastId, duration: 6000 });
    } finally {
      setRunning(false);
    }
  };

  const handleRepair = async (issueId) => {
    try {
      const res = await api.post(`/analysis/issues/${issueId}/repair`);
      if (!res.data.success) {
        toast.error(res.data.message || 'Repair generation failed');
        return null;
      }
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Repair generation failed');
      return null;
    }
  };

  const handleAcceptRepair = async (issueId, repairData) => {
    try {
      await api.post(`/analysis/issues/${issueId}/accept-repair`, repairData);
      toast.success('Repair applied successfully!');
      setIssues((prev) => prev.filter((i) => i._id !== issueId));
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

  const summary = analysisResult?.summary || currentProject?.currentAnalysis || {};
  const auditSummary = analysisResult?.auditSummary || currentProject?.currentAnalysis?.auditSummary;

  const totalIssuesCount = summary?.totalIssues ?? summary?.total ?? issues.length;
  const criticalCount = summary?.critical ?? issues.filter(i => i.priority === 'critical' || i.severity === 'critical').length;
  const highCount = summary?.high ?? issues.filter(i => i.priority === 'high' || i.severity === 'high').length;
  const mediumCount = summary?.medium ?? issues.filter(i => i.priority === 'medium' || i.severity === 'medium').length;
  const lowCount = summary?.low ?? issues.filter(i => i.priority === 'low' || i.severity === 'low').length;
  const securityCount = summary?.securityIssues ?? summary?.security ?? issues.filter(i => i.type === 'security' || i.category === 'security').length;

  const rawScore = analysisResult?.qualityScore ?? currentProject?.currentAnalysis?.qualityScore;
  const qualityScore = typeof rawScore === 'number'
    ? rawScore
    : (totalIssuesCount > 0
        ? Math.max(0, 100 - (criticalCount * 25 + highCount * 10 + mediumCount * 4 + lowCount * 1))
        : 100);

  // Search filtering
  const filteredIssues = issues.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.file.toLowerCase().includes(q) ||
      (i.component && i.component.toLowerCase().includes(q)) ||
      (i.source && i.source.toLowerCase().includes(q))
    );
  });

  const PRIORITY_ORDER = ['critical', 'high', 'medium', 'low'];
  const groupedIssues = PRIORITY_ORDER.reduce((acc, p) => {
    const group = filteredIssues.filter((i) => i.priority === p);
    if (group.length > 0) acc[p] = group;
    return acc;
  }, {});

  return (
    <div className="page-content" style={{ maxWidth: 1400, margin: '0 auto', width: '100%', paddingBottom: 48 }}>
      {/* ── HEADER: Title on Left, Controls on Right ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Left side: Badge, Heading, and Project Name */}
          <div style={{ minWidth: 260 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.5px', textTransform: 'uppercase', background: 'rgba(99, 102, 241, 0.08)', padding: '3px 9px', borderRadius: '12px', marginBottom: 6 }}>
              <ShieldCheck size={13} /> Full-Stack Verification
            </div>
            <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              End-to-End Application Audit
            </h1>
            <p className="page-subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              {currentProject ? `Inspecting project: ${currentProject.name}` : 'Select a project to run full-stack testing & audit'}
            </p>
          </div>

          {/* Right side: Mode Selector and Run Full Audit Button aligned */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {!currentProject && projects.length > 0 && (
              <select
                className="form-input"
                onChange={(e) => navigate(`/analysis?project=${e.target.value}`)}
                style={{ width: '180px', height: '40px', fontSize: '0.84rem' }}
              >
                <option value="">Select project...</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            )}

            <select
              className="form-input"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ width: '170px', height: '40px', fontSize: '0.84rem' }}
            >
              <option value="full">Mode: Full Analysis</option>
              <option value="hint">Mode: Hint Guidance</option>
            </select>

            <button
              className="btn btn-primary"
              onClick={runAnalysis}
              disabled={running || !projectId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: '40px', padding: '0 20px', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)', whiteSpace: 'nowrap' }}
            >
              {running ? (
                <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Auditing Pipeline...</>
              ) : (
                <><Play size={14} aria-hidden="true" /> Run Full Audit</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 1. COMPLETE AUDIT SUMMARY METRICS BAR ── */}
      {summary && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: `1px solid ${criticalCount > 0 ? 'rgba(239, 68, 68, 0.35)' : highCount > 0 ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 14
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: criticalCount > 0 ? 'rgba(239, 68, 68, 0.12)' : highCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: criticalCount > 0 ? '#EF4444' : highCount > 0 ? '#F59E0B' : '#10B981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {criticalCount > 0 ? <AlertCircle size={20} /> : highCount > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Audit Health Status: {criticalCount > 0 ? 'Critical Vulnerabilities Detected' : highCount > 0 ? 'High-Priority Warnings Found' : totalIssuesCount > 0 ? 'Minor Observations' : 'Clean & Verified Secure'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {totalIssuesCount} issues detected across {auditSummary?.filesInspected ?? (currentProject?.files?.length || 0)} files • {auditSummary?.apisChecked ?? 0} API endpoints validated
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quality Score
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: qualityScore >= 80 ? '#10B981' : qualityScore >= 60 ? '#F59E0B' : '#EF4444' }}>
                {qualityScore}/100
              </div>
            </div>
          </div>

          {/* 6 Key End-to-End Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              {
                label: 'Files Inspected',
                value: auditSummary?.filesInspected ?? (currentProject?.files?.length || 0),
                icon: FileCode,
                color: 'var(--primary)',
                isNumeric: true,
              },
              {
                label: 'Components Identified',
                value: auditSummary?.componentsIdentified ?? 0,
                icon: Layers,
                color: 'var(--accent)',
                isNumeric: true,
              },
              {
                label: 'APIs Checked',
                value: auditSummary?.apisChecked ?? 0,
                icon: GitBranch,
                color: '#3B82F6',
                isNumeric: true,
              },
              {
                label: 'Static Checks Executed',
                value: auditSummary?.checksExecuted ?? auditSummary?.testsExecuted ?? (auditSummary?.filesInspected ? (auditSummary.filesInspected * 18 + (auditSummary.apisChecked || 0) * 2) : 0),
                sublabel: 'Heuristic & Contract Rules',
                icon: Workflow,
                color: '#F59E0B',
                isNumeric: true,
              },
              {
                label: 'Critical Flaws',
                value: criticalCount,
                icon: AlertCircle,
                color: '#EF4444',
                isNumeric: true,
              },
              {
                label: 'Security Issues',
                value: securityCount,
                icon: ShieldAlert,
                color: '#8B5CF6',
                isNumeric: true,
              },
            ].map((item, idx) => (
              <SpotlightCard key={item.label} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                  <item.icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: item.isNumeric ? '1.25rem' : '1.05rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                    {item.isNumeric ? <AnimatedNumber value={item.value} /> : item.value}
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: 2 }}>{item.label}</div>
                  {item.sublabel && (
                    <div style={{ fontSize: '0.64rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: 1 }}>{item.sublabel}</div>
                  )}
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* ── 2. ARCHITECTURE & DEPENDENCY TOPOLOGY MAP ── */}
          {showTopologyMap && auditSummary?.dependencyMap && (
            <div className="card" style={{ padding: '20px', animation: 'fadeUp 0.3s ease both' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Network size={16} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Architecture & Integration Topology Map
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Traced Frontend ↔ API ↔ Controller ↔ Database Connections
                  </span>
                  <button
                    onClick={() => setShowTopologyMap(false)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    Hide Map
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {auditSummary.dependencyMap.map((conn, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${conn.status === 'broken' ? 'rgba(239, 68, 68, 0.4)' : conn.status === 'unprotected' ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.825rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{conn.source}</span>
                      <span style={{ color: 'var(--text-muted)' }}>➔</span>
                      <span style={{ fontWeight: 600, color: conn.status === 'broken' ? '#EF4444' : 'var(--text-primary)' }}>{conn.target}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{conn.detail}</span>
                      <span className={`badge ${conn.status === 'broken' ? 'badge-critical' : conn.status === 'unprotected' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.68rem' }}>
                        {conn.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. UNIFIED ISSUE FILTERING & SEARCH CONTROLS ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <input
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search findings by keyword, file, component..."
            style={{ paddingLeft: 34, fontSize: '0.85rem' }}
          />
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        <select className="form-input" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ maxWidth: '150px' }}>
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select className="form-input" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ maxWidth: '160px' }}>
          <option value="">All Types</option>
          <option value="security">Security</option>
          <option value="bug">Bug</option>
          <option value="code_smell">Code Smell</option>
          <option value="complexity">Complexity</option>
          <option value="maintainability">Maintainability</option>
          <option value="performance">Performance</option>
          <option value="syntax">Syntax</option>
        </select>

        <select className="form-input" value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={{ maxWidth: '175px' }}>
          <option value="">All Sources</option>
          <option value="API Contract">API Contract</option>
          <option value="Security Scan">Security Scan</option>
          <option value="Database Test">Database Test</option>
          <option value="Dependency Scan">Dependency Scan</option>
          <option value="Static Analysis">Static Analysis</option>
          <option value="Build Test">Build Test</option>
          <option value="Frontend Analysis">Frontend Analysis</option>
        </select>

        {auditSummary?.dependencyMap?.length > 0 && (
          <button
            onClick={() => setShowTopologyMap((prev) => !prev)}
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', height: '38px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Network size={14} />
            {showTopologyMap ? 'Hide Architecture Map' : 'View Architecture Map'}
          </button>
        )}

        {(filterPriority || filterType || filterSource || searchQuery) && (
          <button
            onClick={() => {
              setFilterPriority('');
              setFilterType('');
              setFilterSource('');
              setSearchQuery('');
            }}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '0.78rem' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── 5. ISSUES LIST / EMPTY STATES ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="empty-state" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {projectId ? (
              <>
                <div className="empty-icon"><Search size={32} /></div>
                <h3 className="empty-title">
                  {issues.length > 0 ? 'No issues match selected filters' : 'No audit issues found'}
                </h3>
                <p className="empty-desc">
                  {issues.length > 0 ? 'Try clearing or broadening your filter criteria' : 'Click Run Full Audit to execute the complete cross-layer inspection pipeline'}
                </p>
                {issues.length === 0 && (
                  <button className="btn btn-primary" onClick={runAnalysis} disabled={running}>
                    <Play size={14} /> Run Full Audit
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="empty-icon"><Search size={32} /></div>
                <h3 className="empty-title">No project selected</h3>
                <p className="empty-desc">Select a project from the Projects page to execute full-stack analysis</p>
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
                <span className={`badge badge-${priority}`} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
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