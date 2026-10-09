import React, { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Plus, FolderOpen, Trash2, ArrowRight, Clock, Code2,
  AlertCircle, Search, X, LayoutGrid, List,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import TiltCard from '../components/ui/TiltCard';

const SkeletonProjectCard = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'flex', gap: 12 }}>
      <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 'var(--radius)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: '80%', height: 11 }} />
      </div>
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      <div className="skeleton" style={{ width: 55, height: 20, borderRadius: 'var(--radius-full)' }} />
      <div className="skeleton" style={{ width: 72, height: 20, borderRadius: 'var(--radius-full)' }} />
    </div>
    <div>
      <div className="skeleton" style={{ width: '100%', height: 5, borderRadius: 'var(--radius-full)' }} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div className="skeleton" style={{ width: 80, height: 11 }} />
      <div className="skeleton" style={{ width: 40, height: 11 }} />
    </div>
  </div>
);

const ProjectCard = ({ project, onOpen, onDelete, style }) => {
  const hasCritical = project.currentAnalysis?.critical > 0;
  const hasHigh = project.currentAnalysis?.high > 0;
  const score = project.currentAnalysis?.qualityScore ?? 100;
  const scoreColor = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--error)';
  const totalIssues = project.currentAnalysis?.totalIssues || 0;

  return (
    <TiltCard
      className="card card-hover"
      style={{ cursor: 'pointer', position: 'relative', height: '100%', ...style }}
      onClick={() => onOpen(project._id)}
      role="button"
      tabIndex={0}
      aria-label={`Open project ${project.name}`}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(project._id)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 42, height: 42,
          borderRadius: 'var(--radius)',
          background: 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)', flexShrink: 0,
        }}>
          <FolderOpen size={17} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            marginBottom: 3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontSize: '0.9375rem', fontWeight: 600,
          }}>
            {project.name}
          </h4>
          {project.description ? (
            <p style={{
              fontSize: '0.775rem', color: 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {project.description}
            </p>
          ) : (
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>No description</p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(project._id, project.name); }}
          className="btn-icon btn-ghost"
          style={{ color: 'var(--error)', opacity: 0.55, flexShrink: 0 }}
          aria-label={`Delete project ${project.name}`}
          title="Delete project"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="badge badge-neutral">
          <Code2 size={10} aria-hidden="true" /> {project.files?.length || 0} files
        </span>
        {project.primaryLanguage && project.primaryLanguage !== 'unknown' && (
          <span className="badge badge-primary">{project.primaryLanguage}</span>
        )}
        {hasCritical && (
          <span className="badge badge-critical">{project.currentAnalysis.critical} critical</span>
        )}
        {hasHigh && !hasCritical && (
          <span className="badge badge-high">{project.currentAnalysis.high} high</span>
        )}
        {project.compilationStatus === 'success' && (
          <span className="badge badge-success">✓ compiled</span>
        )}
        {totalIssues === 0 && project.currentAnalysis && (
          <span className="badge badge-success">✓ clean</span>
        )}
      </div>

      {/* Quality score bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: '0.69rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Quality Score
          </span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: scoreColor }}>{score}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${score}%`, background: scoreColor }}
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Quality score: ${score}%`}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={10} aria-hidden="true" />
          {project.lastSaved
            ? formatDistanceToNow(new Date(project.lastSaved), { addSuffix: true })
            : 'Never saved'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)', fontSize: '0.775rem', fontWeight: 600 }}>
          Open <ArrowRight size={12} aria-hidden="true" />
        </span>
      </div>
    </TiltCard>
  );
};

const Projects = () => {
  const { projects, fetchProjects, createProject, deleteProject, openProject, loading } = useProject();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const project = await createProject(form.name, form.description);
      toast.success('Project created!');
      setShowCreate(false);
      setForm({ name: '', description: '' });
      navigate(`/editor?project=${project._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = async (id) => {
    try {
      await openProject(id);
      navigate(`/editor?project=${id}`);
    } catch {
      toast.error('Failed to open project');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(id);
      toast.success('Project deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">
              {loading
                ? 'Loading projects...'
                : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreate(true)}
            aria-label="Create new project"
          >
            <Plus size={15} aria-hidden="true" /> New Project
          </button>
        </div>
      </div>

      {/* Search */}
      {projects.length > 0 && (
        <div style={{ marginBottom: 24, maxWidth: 380 }}>
          <div className="search-input-wrapper">
            <Search size={14} className="search-input-icon" aria-hidden="true" />
            <input
              className="search-input"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search projects"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute', right: '10px', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 2, display: 'flex', alignItems: 'center',
                }}
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Skeleton loading */}
      {loading && projects.length === 0 ? (
        <div className="grid-3">
          {[1,2,3].map((i) => <SkeletonProjectCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
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
          <div className="empty-icon" aria-hidden="true" style={{ position: 'relative', zIndex: 1 }}>
            <FolderOpen size={28} />
          </div>
          <h3 className="empty-title">
            {search ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="empty-desc">
            {search
              ? 'Try a different search term or clear the filter.'
              : 'Create your first project to start analyzing and improving your code with AI.'}
          </p>
          {!search && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} aria-hidden="true" /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((project, i) => (
            <ProjectCard
              key={project._id}
              project={project}
              onOpen={handleOpen}
              onDelete={handleDelete}
              style={{ animationDelay: `${i * 50}ms`, animation: 'fadeUp 0.35s var(--ease) both' }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
        >
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title" id="create-project-title">Create New Project</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-icon btn-ghost"
                aria-label="Close dialog"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label" htmlFor="project-name">Project Name *</label>
                <input
                  id="project-name"
                  className="form-input"
                  placeholder="e.g. My Web Application"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                  aria-label="Project name"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="project-description">Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  id="project-description"
                  className="form-input"
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  aria-label="Project description"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !form.name.trim()}
                  aria-label={creating ? 'Creating project...' : 'Create project'}
                >
                  {creating
                    ? <><span className="loading-spinner" aria-hidden="true" /> Creating...</>
                    : <><Plus size={14} aria-hidden="true" /> Create Project</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
