const express = require('express');
const { authenticate } = require('../middleware/auth');
const { chatWithAI } = require('../services/openaiService');
const { logActivity } = require('../utils/activityLogger');
const Project = require('../models/Project');

const router = express.Router();
router.use(authenticate);

// POST /api/ai/chat - AI chat assistant
router.post('/chat', async (req, res) => {
  try {
    const { messages, projectId, context } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Messages array required' });
    }

    let contextStr = context || '';

    // Add project context if provided
    if (projectId) {
      const project = await Project.findOne({ _id: projectId, owner: req.user._id });
      if (project) {
        contextStr += `\nProject: ${project.name}\nLanguages: ${project.languages.map((l) => l.language).join(', ')}\nFiles: ${project.files.length}\nIssues: ${project.currentAnalysis?.totalIssues || 0}`;
      }
    }

    const result = await chatWithAI(messages, contextStr);

    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalAiRequests': 1 },
    });

    await logActivity(req.user._id, req.user.name, 'ai_request', 'Used AI assistant', {
      project: projectId,
      metadata: { model: process.env.AI_MODEL || 'openrouter' },
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ai/status - Check if AI is configured
router.get('/status', (req, res) => {
  const configured =
    !!process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('your-');
  res.json({ success: true, configured, model: process.env.AI_MODEL || 'openrouter' });
});

module.exports = router;
