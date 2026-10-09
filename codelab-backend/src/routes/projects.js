const express = require('express');
const multer = require('multer');
const path = require('path');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');
const { detectLanguage, isSafeToUpload } = require('../utils/languageDetector');

const fs = require('fs');
const os = require('os');

const router = express.Router();

function sanitizePath(raw) {
  if (!raw) return '';
  let p = raw.replace(/\\/g, '/');
  p = path.posix.normalize(p);
  if (path.posix.isAbsolute(p) || p.startsWith('..') || p.includes('/../') || p === '..') {
    throw new Error('Invalid file path');
  }
  return p;
}

// Multer disk storage for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir()
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 50 }, // 5MB per file, max 50 files
  fileFilter: (req, file, cb) => {
    if (!isSafeToUpload(file.originalname)) {
      return cb(new Error(`Unsafe file type: ${file.originalname}`), false);
    }
    cb(null, true);
  },
});

// All project routes require authentication
router.use(authenticate);

// GET /api/projects - List user's projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id, status: 'active' })
      .select('-files.content') // Don't return file content in list
      .sort({ updatedAt: -1 });

    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Project name required' });

    const project = await Project.create({
      name,
      description: description || '',
      owner: req.user._id,
    });

    // Update user stats
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalProjects': 1 },
    });

    await logActivity(req.user._id, req.user.name, 'project_create', `Created project "${name}"`, {
      project: project._id,
      projectName: name,
    });

    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:id - Get single project with all files
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await logActivity(req.user._id, req.user.name, 'project_open', `Opened project "${project.name}"`, {
      project: project._id,
      projectName: project.name,
    });

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/projects/:id - Update project metadata
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name, description, lastSaved: new Date() },
      { new: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id - Soft delete project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { status: 'deleted' },
      { new: true }
    );
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    await Issue.deleteMany({ project: req.params.id });

    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects/:id/files - Add/update a file in the project
router.post('/:id/files', async (req, res) => {
  try {
    const { name, path: filePath, content, language, isDirectory, parent } = req.body;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const detectedLang = language || detectLanguage(name);
    let normalizedPath;
    try {
      normalizedPath = sanitizePath(filePath || name);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    let computedParent = parent;
    if (computedParent === undefined) {
      const parts = normalizedPath.split('/');
      parts.pop();
      computedParent = parts.length > 0 ? parts.join('/') : null;
    }

    // Auto-create intermediate directories
    const parts = normalizedPath.split('/');
    if (parts.length > 1) {
      parts.pop(); // remove the filename/last segment itself
      let currPath = '';
      for (const dirName of parts) {
        const dirParent = currPath ? currPath : null;
        currPath = currPath ? `${currPath}/${dirName}` : dirName;
        const exists = project.files.some(f => f.path === currPath && f.isDirectory);
        if (!exists) {
          project.files.push({
            name: dirName,
            path: currPath,
            isDirectory: true,
            parent: dirParent
          });
        }
      }
    }

    // Check if file already exists
    const existingIdx = project.files.findIndex((f) => f.path === normalizedPath && f.isDirectory === !!isDirectory);

    if (existingIdx >= 0) {
      project.files[existingIdx].content = content || '';
      project.files[existingIdx].language = detectedLang;
      project.files[existingIdx].size = (content || '').length;
      if (computedParent !== undefined) project.files[existingIdx].parent = computedParent;
    } else {
      project.files.push({
        name: normalizedPath.split('/').pop(),
        path: normalizedPath,
        content: content || '',
        language: detectedLang,
        isDirectory: isDirectory || false,
        parent: computedParent,
        size: (content || '').length,
      });
    }

    // Update language stats
    updateProjectLanguages(project);
    project.lastSaved = new Date();
    await project.save();

    await logActivity(req.user._id, req.user.name, 'file_create', `Updated file ${name}`, {
      project: project._id,
      projectName: project.name,
    });

    res.json({ success: true, file: project.files.find((f) => f.path === normalizedPath) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/projects/:id/files/:filePath - Update file content (for auto-save)
router.put('/:id/files/*filepath', async (req, res) => {
  try {
    const filePath = req.params.filepath;
    const { content } = req.body;

    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const fileIdx = project.files.findIndex((f) => f.path === filePath);
    if (fileIdx < 0) return res.status(404).json({ success: false, message: 'File not found' });

    project.files[fileIdx].content = content;
    project.files[fileIdx].size = content.length;
    project.lastSaved = new Date();
    await project.save();

    res.json({ success: true, lastSaved: project.lastSaved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id/files/delete?path=filepath - Delete a file (query param approach)
router.delete('/:id/files/delete', async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ success: false, message: 'File path required' });

    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.files = project.files.filter((f) => f.path !== filePath && !f.path.startsWith(filePath + '/'));
    await project.save();

    await logActivity(req.user._id, req.user.name, 'file_delete', `Deleted file ${filePath}`, {
      project: project._id,
      projectName: project.name,
    });

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id/files/*filepath - Delete a file (path approach)
router.delete('/:id/files/*filepath', async (req, res) => {
  try {
    const filePath = req.params.filepath;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.files = project.files.filter((f) => f.path !== filePath && !f.path.startsWith(filePath + '/'));
    await project.save();

    await logActivity(req.user._id, req.user.name, 'file_delete', `Deleted file ${filePath}`, {
      project: project._id,
      projectName: project.name,
    });

    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects/:id/upload - Upload files
router.post('/:id/upload', upload.array('files', 500), async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const uploadedFiles = [];
    const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
    
    // Ensure paths is always an array matching req.files
    let paths = req.body.paths;
    if (paths && !Array.isArray(paths)) paths = [paths];
    
    // Check if it's a folder upload by checking if all paths share the same root folder
    let stripRoot = false;
    let rootName = '';
    if (paths && paths.length > 0 && paths.length === req.files.length) {
      if (paths[0].includes('/')) {
        rootName = paths[0].split('/')[0] + '/';
        stripRoot = paths.every(p => p.startsWith(rootName));
      }
    }

    const createdFolders = new Set();
    // Pre-populate createdFolders with existing directories
    project.files.forEach(f => {
      if (f.isDirectory) createdFolders.add(f.path);
    });

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      let rawPath = (paths && paths[i]) ? paths[i] : file.originalname;
      
      // Strip root folder if it was a directory upload
      if (stripRoot && rawPath.startsWith(rootName)) {
        rawPath = rawPath.substring(rootName.length);
      }
      
      // Normalize and sanitize path
      let filePath;
      try {
        filePath = sanitizePath(rawPath);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid file path' });
      }

      // Check against ignore list
      const parts = filePath.split('/');
      if (parts.some(p => ignoreDirs.includes(p))) {
        continue;
      }
      
      const fileName = parts.pop();
      const parentPath = parts.length > 0 ? parts.join('/') : null;

      // Auto-create parent directories if they don't exist
      if (parts.length > 0) {
        let currPath = '';
        for (let j = 0; j < parts.length; j++) {
          const dirName = parts[j];
          const dirParent = currPath ? currPath : null;
          currPath = currPath ? `${currPath}/${dirName}` : dirName;
          
          if (!createdFolders.has(currPath)) {
            createdFolders.add(currPath);
            project.files.push({
              name: dirName,
              path: currPath,
              isDirectory: true,
              parent: dirParent
            });
          }
        }
      }

      // Check file size (max 5MB per file for safety)
      if (file.size > 5 * 1024 * 1024) continue;

      const content = await fs.promises.readFile(file.path, 'utf-8');
      const lang = detectLanguage(fileName);

      const existingIdx = project.files.findIndex((f) => f.path === filePath && !f.isDirectory);
      if (existingIdx >= 0) {
        project.files[existingIdx].content = content;
        project.files[existingIdx].language = lang;
        project.files[existingIdx].size = content.length;
        project.files[existingIdx].parent = parentPath;
      } else {
        project.files.push({
          name: fileName,
          path: filePath,
          content,
          language: lang,
          isDirectory: false,
          parent: parentPath,
          size: content.length,
        });
      }
      uploadedFiles.push(filePath);
    }

    updateProjectLanguages(project);
    project.lastSaved = new Date();
    await project.save();

    await logActivity(req.user._id, req.user.name, 'file_upload', `Uploaded ${uploadedFiles.length} files`, {
      project: project._id,
      projectName: project.name,
      metadata: { files: uploadedFiles },
    });

    res.json({ success: true, uploaded: uploadedFiles, totalFiles: project.files.length });
  } catch (err) {
    if (err.message === 'Invalid file path') {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (req.files) {
      for (const file of req.files) {
        fs.unlink(file.path, () => {});
      }
    }
  }
});

// POST /api/projects/:id/save - Manual save (same as update but logs it)
router.post('/:id/save', async (req, res) => {
  try {
    const { files } = req.body;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (files && Array.isArray(files)) {
      for (const f of files) {
        const idx = project.files.findIndex((pf) => pf.path === f.path);
        if (idx >= 0) {
          project.files[idx].content = f.content;
          project.files[idx].size = f.content.length;
        }
      }
    }

    project.lastSaved = new Date();
    await project.save();

    await logActivity(req.user._id, req.user.name, 'project_save', `Saved project "${project.name}"`, {
      project: project._id,
      projectName: project.name,
    });

    res.json({ success: true, lastSaved: project.lastSaved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: update language distribution
function updateProjectLanguages(project) {
  const langCount = {};
  for (const file of project.files) {
    if (!file.isDirectory && file.language && file.language !== 'plaintext') {
      langCount[file.language] = (langCount[file.language] || 0) + 1;
    }
  }
  project.languages = Object.entries(langCount)
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
  project.primaryLanguage = project.languages[0]?.language || 'unknown';
}

module.exports = router;
