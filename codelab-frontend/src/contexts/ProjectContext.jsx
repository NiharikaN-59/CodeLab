import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../lib/api';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects);
    } finally {
      setLoading(false);
    }
  }, []);

  const openProject = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      setCurrentProject(res.data.project);
      // Open first non-directory file
      const firstFile = res.data.project.files.find((f) => !f.isDirectory);
      if (firstFile) setCurrentFile(firstFile);
      return res.data.project;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name, description) => {
    const res = await api.post('/projects', { name, description });
    const project = res.data.project;
    setProjects((prev) => [project, ...prev]);
    setCurrentProject(project);
    return project;
  }, []);

  const saveFile = useCallback(async (projectId, filePath, content) => {
    // Use the generic files update via POST to /files with path in body
    await api.post(`/projects/${projectId}/files`, { name: filePath.split('/').pop(), path: filePath, content });
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };
      updated.files = updated.files.map((f) =>
        f.path === filePath ? { ...f, content } : f
      );
      updated.lastSaved = new Date().toISOString();
      return updated;
    });
  }, []);

  const createFile = useCallback(async (projectId, fileData) => {
    const res = await api.post(`/projects/${projectId}/files`, fileData);
    const file = res.data.file;
    setCurrentProject((prev) => {
      if (!prev) return prev;
      const exists = prev.files.find((f) => f.path === file.path);
      const files = exists
        ? prev.files.map((f) => (f.path === file.path ? file : f))
        : [...prev.files, file];
      return { ...prev, files };
    });
    return file;
  }, []);

  const deleteFile = useCallback(async (projectId, filePath) => {
    // Use a DELETE request with path as query parameter to avoid URL routing issues
    await api.delete(`/projects/${projectId}/files/delete`, { params: { path: filePath } });
    setCurrentProject((prev) => {
      if (!prev) return prev;
      return { ...prev, files: prev.files.filter((f) => f.path !== filePath && !f.path.startsWith(filePath + '/')) };
    });
    if (currentFile?.path === filePath) setCurrentFile(null);
  }, [currentFile]);

  const uploadFiles = useCallback(async (projectId, files) => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
      formData.append('paths', file.webkitRelativePath || file.name);
    }
    const res = await api.post(`/projects/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Refresh project to get all files
    const projectRes = await api.get(`/projects/${projectId}`);
    setCurrentProject(projectRes.data.project);
    return res.data;
  }, []);

  const deleteProject = useCallback(async (id) => {
    await api.delete(`/projects/${id}`);
    setProjects((prev) => prev.filter((p) => p._id !== id));
    if (currentProject?._id === id) {
      setCurrentProject(null);
      setCurrentFile(null);
    }
  }, [currentProject]);

  const updateCurrentProject = useCallback((updates) => {
    setCurrentProject((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        currentFile,
        loading,
        setCurrentFile,
        setCurrentProject,
        fetchProjects,
        openProject,
        createProject,
        saveFile,
        createFile,
        deleteFile,
        uploadFiles,
        deleteProject,
        updateCurrentProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};
