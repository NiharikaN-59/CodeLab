const express = require('express');
const { authenticate } = require('../middleware/auth');
const { chatWithAI, isAnyAiConfigured } = require('../services/openaiService');
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

    const result = await chatWithAI(messages, contextStr, req.user._id);

    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalAiRequests': 1 },
    });

    await logActivity(req.user._id, req.user.name, 'ai_request', 'Used AI assistant', {
      project: projectId,
      metadata: {
        model: result.model || process.env.AI_MODEL || 'unknown',
        provider: result.provider || 'unknown',
      },
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/ai/status - Check if AI is configured and view 3-tier status
router.get('/status', (req, res) => {
  const openrouterConfigured =
    !!process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('your-');
  const remoteGpuConfigured =
    !!process.env.REMOTE_GPU_BASE_URL && !process.env.REMOTE_GPU_BASE_URL.includes('your-tunnel');
  const localCpuConfigured = !!process.env.LOCAL_CPU_BASE_URL;

  const configured = isAnyAiConfigured();
  const useOpenRouterOnly = process.env.USE_OPENROUTER_ONLY === 'true';

  res.json({
    success: true,
    configured,
    useOpenRouterOnly,
    primaryMode: useOpenRouterOnly ? 'openrouter_first' : 'kaggle_ollama_first',
    tiers: {
      tier1_remoteGpu: {
        configured: remoteGpuConfigured,
        model: process.env.REMOTE_GPU_MODEL || 'qwen2.5-coder:7b',
        endpoint: remoteGpuConfigured ? process.env.REMOTE_GPU_BASE_URL : 'not_connected',
      },
      tier2_localCpu: {
        configured: localCpuConfigured,
        model: process.env.LOCAL_CPU_MODEL || 'qwen2.5-coder:7b',
        endpoint: process.env.LOCAL_CPU_BASE_URL || 'http://localhost:11434/v1',
      },
      tier3_openRouter: {
        configured: openrouterConfigured,
        model: process.env.AI_MODEL || 'nvidia/nemotron-3.5-lightning:free',
      },
    },
    activeModel: useOpenRouterOnly
      ? (process.env.AI_MODEL || 'nvidia/nemotron-3.5-lightning:free')
      : (process.env.REMOTE_GPU_MODEL || process.env.LOCAL_CPU_MODEL || 'qwen2.5-coder:7b'),
  });
});

module.exports = router;
