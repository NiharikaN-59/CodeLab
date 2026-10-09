const express = require('express');
const { authenticate } = require('../middleware/auth');
const { compileCode, LANGUAGE_IDS, getCompilerStatus, checkJudge0Reachable } = require('../services/compilerService');
const { logActivity } = require('../utils/activityLogger');
const Project = require('../models/Project');

const router = express.Router();
router.use(authenticate);

// GET /api/compiler/languages - Supported languages
router.get('/languages', (req, res) => {
  const supported = Object.keys(LANGUAGE_IDS).map((lang) => ({
    language: lang,
    id: LANGUAGE_IDS[lang],
    displayName: lang.charAt(0).toUpperCase() + lang.slice(1),
  }));
  res.json({ success: true, languages: supported });
});

// GET /api/compiler/status - Compiler service configuration + reachability
router.get('/status', async (req, res) => {
  try {
    const status = getCompilerStatus();
    const reachable = await checkJudge0Reachable();
    res.json({ success: true, ...status, reachable });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/compiler/run - Compile and run code
router.post('/run', async (req, res) => {
  try {
    const { code, language, stdin, projectId } = req.body;

    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });
    if (!language) return res.status(400).json({ success: false, message: 'Language is required' });

    // Code size limit
    if (code.length > 50000) {
      return res.status(400).json({ success: false, message: 'Code too large (max 50,000 characters)' });
    }

    const result = await compileCode(language, code, stdin || '');

    // Update project compilation status if linked
    if (projectId) {
      const project = await Project.findOne({ _id: projectId, owner: req.user._id });
      if (project) {
        project.compilationStatus = result.success ? 'success' : 'error';
        project.lastCompiled = new Date();
        await project.save();
      }
    }

    // Update user stats
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalCompilations': 1 },
    });

    await logActivity(req.user._id, req.user.name, 'compile', `Compiled ${language} code`, {
      project: projectId ? { _id: projectId } : null,
      metadata: { language, success: result.success, mock: result.mock },
    });

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
