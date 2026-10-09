import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Save, FolderOpen, Plus, Trash2, Upload, FileCode,
  FolderPlus, RefreshCw, Check, Clock, ChevronRight,
  ChevronDown, File, Folder, X, AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const LANGUAGE_MODE_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  ruby: 'ruby',
  php: 'php',
  rust: 'rust',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  markdown: 'markdown',
  bash: 'shell',
  sql: 'sql',
  plaintext: 'plaintext',
};

const PRIORITY_COLORS = {
  critical: 'var(--critical)',
  high: 'var(--high)',
  medium: 'var(--medium)',
  low: 'var(--low)',
  none: 'transparent',
};

const FileTreeItem = ({ file, depth = 0, onSelect, selectedPath, onDelete, expanded, onToggle }) => {
  const isSelected = selectedPath === file.path;
  const priorityColor = PRIORITY_COLORS[file.priority] || 'transparent';

  return (
    <div>
      <div
        className={`file-item ${isSelected ? 'active' : ''}`}
        style={{
          paddingLeft: `${8 + depth * 14}px`,
          borderLeft: file.priority && file.priority !== 'none'
            ? `2px solid ${priorityColor}`
            : '2px solid transparent',
        }}
        onClick={() => file.isDirectory ? onToggle(file.path) : onSelect(file)}
      >
        {file.isDirectory ? (
          <>
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Folder size={13} style={{ color: '#F59E0B' }} />
          </>
        ) : (
          <>
            <span style={{ width: 12 }} />
            <FileCode size={13} style={{ color: 'var(--primary)' }} />
          </>
        )}
        <span className="truncate" style={{ flex: 1, fontSize: '0.78rem' }}>{file.name}</span>
        {file.issueCount > 0 && (
          <span className="file-issue-count">{file.issueCount}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(file.path); }}
          style={{ opacity: 0, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
          className="delete-btn"
          title={`Delete ${file.isDirectory ? 'folder' : 'file'}`}
        >
          <X size={11} />
        </button>
      </div>
      {file.isDirectory && expanded && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeItem
              key={child.path}
              file={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
              onDelete={onDelete}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SaveStatus = ({ status, lastSaved }) => {
  if (status === 'saving') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
    </span>
  );
  if (status === 'saved') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--success)' }}>
      <Check size={12} /> Saved {lastSaved ? formatDistanceToNow(new Date(lastSaved), { addSuffix: true }) : ''}
    </span>
  );
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      <Clock size={12} /> Unsaved changes
    </span>
  );
};

const CodeEditor = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('project');
  const { currentProject, currentFile, setCurrentFile, openProject, saveFile, createFile, deleteFile, uploadFiles } = useProject();
  const { user } = useAuth();

  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const autoSaveTimer = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Load project
  useEffect(() => {
    if (projectId && (!currentProject || currentProject._id !== projectId)) {
      openProject(projectId).catch(() => navigate('/projects'));
    }
  }, [projectId, openProject, navigate]);

  // Load file content into editor
  useEffect(() => {
    if (currentFile) {
      setEditorContent(currentFile.content || '');
      setSaveStatus('saved');
    }
  }, [currentFile?.path]);

  // Auto-save after 2 seconds of inactivity
  const handleEditorChange = useCallback((value) => {
    setEditorContent(value || '');
    setSaveStatus('unsaved');

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (currentProject && currentFile) {
        setSaveStatus('saving');
        try {
          await saveFile(currentProject._id, currentFile.path, value || '');
          setSaveStatus('saved');
        } catch {
          setSaveStatus('unsaved');
        }
      }
    }, 2000);
  }, [currentProject, currentFile, saveFile]);

  const handleManualSave = async () => {
    if (!currentProject || !currentFile) return;
    setSaveStatus('saving');
    try {
      await saveFile(currentProject._id, currentFile.path, editorContent);
      setSaveStatus('saved');
      toast.success('File saved!');
    } catch {
      toast.error('Save failed');
      setSaveStatus('unsaved');
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim() || !currentProject) return;
    try {
      const file = await createFile(currentProject._id, {
        name: newFileName,
        path: newFileName,
        content: '',
        isDirectory: false,
      });
      setCurrentFile(file);
      setNewFileName('');
      setShowNewFile(false);
      toast.success('File created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create file');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentProject) return;
    try {
      await createFile(currentProject._id, {
        name: newFolderName,
        path: newFolderName,
        content: '',
        isDirectory: true,
      });
      setNewFolderName('');
      setShowNewFolder(false);
      toast.success('Folder created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleDeleteFile = async (path) => {
    if (!confirm(`Delete ${path}?`)) return;
    try {
      await deleteFile(currentProject._id, path);
      toast.success('File deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !currentProject) return;
    try {
      await uploadFiles(currentProject._id, files);
      toast.success(`${files.length} file(s) uploaded!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
    e.target.value = '';
  };

  const toggleFolder = (path) => {
    setExpandedFolders((p) => ({ ...p, [path]: !p[path] }));
  };

  // Build tree from flat files list with recursive structure
  const buildTree = (files) => {
    const roots = [];
    const byPath = {};
    
    // Convert to tree nodes
    for (const f of files) {
      byPath[f.path] = { ...f, children: [] };
    }

    for (const f of files) {
      const node = byPath[f.path];
      if (node.parent && byPath[node.parent]) {
        byPath[node.parent].children.push(node);
      } else {
        roots.push(node);
      }
    }
    
    const sortTree = (nodes) => {
      nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          sortTree(node.children);
        }
      }
      return nodes;
    };
    
    return sortTree(roots);
  };

  const treeFiles = currentProject ? buildTree(currentProject.files) : [];
  const monacoLanguage = currentFile ? (LANGUAGE_MODE_MAP[currentFile.language] || 'plaintext') : 'plaintext';

  if (!projectId) {
    return (
      <div className="page-content">
        <div className="empty-state" style={{ marginTop: '60px' }}>
          <div className="empty-icon"><FolderOpen size={32} /></div>
          <h3 className="empty-title">No project open</h3>
          <p className="empty-desc">Open an existing project or create a new one to start coding</p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            <FolderOpen size={14} /> Browse Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* File Explorer */}
      <div className="file-explorer stagger-1">
        <div className="file-explorer-header">
          <span>{currentProject?.name || 'Explorer'}</span>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowAddMenu(!showAddMenu)} className="btn-icon btn-ghost" title="Add">
              <Plus size={13} />
            </button>
            
            {showAddMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid var(--border)', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, width: '140px', py: '4px' }}>
                <button className="dropdown-item" onClick={() => { setShowNewFile(true); setShowAddMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <File size={12} /> New File
                </button>
                <button className="dropdown-item" onClick={() => { setShowNewFolder(true); setShowNewFile(false); setShowAddMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Folder size={12} /> New Folder
                </button>
                <button className="dropdown-item" onClick={() => { fileInputRef.current?.click(); setShowAddMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={12} /> Upload Files
                </button>
                <button className="dropdown-item" onClick={() => { folderInputRef.current?.click(); setShowAddMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderPlus size={12} /> Upload Folder
                </button>
              </div>
            )}
          </div>
        </div>

        {showNewFile && (
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                className="form-input"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                placeholder="filename.js"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFile(); if (e.key === 'Escape') setShowNewFile(false); }}
                autoFocus
              />
              <button onClick={handleCreateFile} className="btn btn-primary btn-sm">
                <Check size={12} />
              </button>
              <button onClick={() => setShowNewFile(false)} className="btn btn-ghost btn-sm">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {showNewFolder && (
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                className="form-input"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                placeholder="folderName"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                autoFocus
              />
              <button onClick={handleCreateFolder} className="btn btn-primary btn-sm">
                <Check size={12} />
              </button>
              <button onClick={() => setShowNewFolder(false)} className="btn btn-ghost btn-sm">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="file-tree">
          {treeFiles.length === 0 ? (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              No files yet.<br />
              <button onClick={() => setShowNewFile(true)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                Create a file
              </button>
              {' or '}
              <button onClick={() => fileInputRef.current?.click()} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                upload files
              </button>
            </div>
          ) : (
            treeFiles.map((file) => (
              <FileTreeItem
                key={file.path}
                file={file}
                onSelect={setCurrentFile}
                selectedPath={currentFile?.path}
                onDelete={handleDeleteFile}
                expanded={expandedFolders[file.path]}
                onToggle={toggleFolder}
              />
            ))
          )}
        </div>

        {/* File priority legend */}
        {currentProject?.currentAnalysis?.totalIssues > 0 && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: '0.7rem' }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>FILE PRIORITY</div>
            {['critical', 'high', 'medium'].map((p) => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '1px', background: PRIORITY_COLORS[p] }} />
                <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileUpload} />
        <input ref={folderInputRef} type="file" multiple webkitdirectory="true" directory="true" style={{ display: 'none' }} onChange={handleFileUpload} />
      </div>

      {/* Editor Area */}
      <div className="stagger-2" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Editor Toolbar */}
        <div
          style={{
            height: '44px',
            background: 'white',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '12px',
          }}
        >
          {currentFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCode size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentFile.name}</span>
              <span className="badge badge-neutral" style={{ textTransform: 'none', fontSize: '0.7rem' }}>{currentFile.language}</span>
              {currentFile.priority && currentFile.priority !== 'none' && (
                <span className={`badge badge-${currentFile.priority}`}>{currentFile.priority} priority</span>
              )}
            </div>
          )}
          <div style={{ flex: 1 }} />
          <SaveStatus status={saveStatus} lastSaved={currentProject?.lastSaved} />
          <button
            className="btn btn-primary btn-sm"
            onClick={handleManualSave}
            disabled={!currentFile || saveStatus === 'saved'}
            style={{ gap: '5px' }}
          >
            <Save size={13} /> Save
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/analysis?project=${currentProject?._id}`)}
          >
            Analyze
          </button>
        </div>

        {/* Monaco Editor */}
        {currentFile ? (
          <Editor
            height="100%"
            language={monacoLanguage}
            value={editorContent}
            onChange={handleEditorChange}
            theme="vs"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              glyphMargin: true,
              folding: true,
              wordWrap: 'on',
              tabSize: 2,
              insertSpaces: true,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              suggest: { showKeywords: true },
            }}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FAFBFC',
              color: 'var(--text-muted)',
            }}
          >
            <FileCode size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ fontSize: '0.875rem' }}>Select a file from the explorer to edit</p>
            <p style={{ fontSize: '0.75rem', marginTop: '6px' }}>or create a new file using the + button</p>
          </div>
        )}
      </div>

      <style>{`
        .file-item:hover .delete-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
};

export default CodeEditor;
