const express = require('express');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const { authenticate } = require('../middleware/auth');
const { analyzeProject } = require('../services/staticAnalyzer');
const { analyzeIssuesWithAI, generateRepair } = require('../services/openaiService');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();
router.use(authenticate);

// POST /api/analysis/:projectId/run - Run full analysis pipeline
router.post('/:projectId/run', async (req, res) => {
  try {
    const { mode = 'full' } = req.body; // 'full' | 'hint'
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Step 1: Static analysis
    const { issues: staticIssues, summary, filePriorities, qualityScore } = analyzeProject(project.files);

    // Step 2: Load existing issues to reuse cached AI enrichment
    const existingIssues = await Issue.find({ project: project._id }).lean();
    const existingAiCache = {};
    for (const ei of existingIssues) {
      const isValid = ei.aiExplanation && !ei.aiExplanation.includes('unavailable') && !ei.aiExplanation.includes('Failed to parse');
      if (isValid) {
        // Only reuse cache if it matches the requested mode's fields
        if (mode === 'hint' && ei.hint) {
          existingAiCache[`${ei.file}:${ei.line}:${ei.rule}`] = ei;
        } else if (mode === 'full' && ei.suggestedFix) {
          existingAiCache[`${ei.file}:${ei.line}:${ei.rule}`] = ei;
        }
      }
    }

    // Step 3: Delete old issues for this project
    await Issue.deleteMany({ project: project._id });

    // Step 4: AI enrichment — skip files where all issues are already cached
    let enrichedIssues = staticIssues;

    const fileGroups = {};
    for (const issue of staticIssues) {
      if (!fileGroups[issue.file]) fileGroups[issue.file] = [];
      fileGroups[issue.file].push(issue);
    }

    // Only enrich top 5 files with most issues
    const topFiles = Object.entries(fileGroups)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    const aiEnrichedMap = {};

    // Reuse cached AI data first
    for (const issue of staticIssues) {
      const key = `${issue.file}:${issue.line}:${issue.rule}`;
      if (existingAiCache[key]) {
        aiEnrichedMap[key] = existingAiCache[key];
      }
    }

    // Only call AI for files with un-cached issues (Concurrent)
    const aiPromises = topFiles.map(async ([filePath, fileIssues]) => {
      const uncachedIssues = fileIssues.filter(
        (i) => !aiEnrichedMap[`${i.file}:${i.line}:${i.rule}`]
      );
      if (uncachedIssues.length === 0) return;

      const fileObj = project.files.find((f) => f.path === filePath);
      if (fileObj) {
        try {
          const enriched = await analyzeIssuesWithAI(
            uncachedIssues,
            fileObj.content,
            fileObj.name,
            fileObj.language,
            mode,
            req.user._id
          );
          for (const ei of enriched) {
            aiEnrichedMap[`${ei.file}:${ei.line}:${ei.rule}`] = ei;
          }
        } catch (e) {
          console.error('AI enrichment error:', e.message);
        }
      }
    });

    await Promise.all(aiPromises);

    // Step 4: Merge AI data into issues and save
    const issueDocs = [];
    for (const issue of staticIssues) {
      const key = `${issue.file}:${issue.line}:${issue.rule}`;
      const aiData = aiEnrichedMap[key] || {};

      const doc = {
        project: project._id,
        file: issue.file,
        type: issue.type,
        priority: issue.priority,
        title: issue.title,
        description: issue.description,
        line: issue.line,
        codeSnippet: issue.codeSnippet,
        source: aiData.aiExplanation ? 'combined' : 'static',
        rule: issue.rule,
        priorityScore: issue.priorityScore,
        ...aiData,
      };
      issueDocs.push(doc);
    }

    const savedIssues = await Issue.insertMany(issueDocs);

    // Step 5: Update project analysis stats atomically (avoids VersionError)
    const updatedFilePriorities = project.files.map((file) => ({
      ...file.toObject(),
      priority: filePriorities[file.path] || 'none',
      issueCount: (fileGroups[file.path] || []).length,
      lastAnalyzed: new Date(),
    }));

    const historyEntry = {
      timestamp: new Date(),
      totalIssues: summary.total,
      critical: summary.critical,
      high: summary.high,
      medium: summary.medium,
      low: summary.low,
      score: qualityScore,
    };

    const updatedProject = await Project.findByIdAndUpdate(
      project._id,
      {
        $set: {
          currentAnalysis: {
            totalIssues: summary.total,
            critical: summary.critical,
            high: summary.high,
            medium: summary.medium,
            low: summary.low,
            securityIssues: summary.security,
            qualityScore,
          },
          lastAnalyzed: new Date(),
          files: updatedFilePriorities,
        },
        $push: {
          analysisHistory: {
            $each: [historyEntry],
            $slice: -30,
          },
        },
      },
      { new: true }
    );

    // Update user stats
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalAnalyses': 1, 'stats.totalAiRequests': 1 },
    });

    await logActivity(req.user._id, req.user.name, 'analyze', `Ran analysis on "${project.name}"`, {
      project: project._id,
      projectName: project.name,
      metadata: { totalIssues: summary.total, qualityScore },
    });

    res.json({
      success: true,
      analysis: {
        summary,
        qualityScore,
        filePriorities,
        issues: savedIssues,
        project: {
          _id: updatedProject._id,
          name: updatedProject.name,
          currentAnalysis: updatedProject.currentAnalysis,
          lastAnalyzed: updatedProject.lastAnalyzed,
        },
      },
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analysis/issues/:issueId/enrich - Get AI enrichment (cached or fresh)
// NOTE: This MUST be defined before /:projectId/issues to avoid Express
// matching 'issues' as a projectId in the wildcard route.
router.get('/issues/:issueId/enrich', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId).populate('project');
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (issue.project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Return cached AI data if already enriched
    const alreadyCached =
      issue.aiExplanation && !issue.aiExplanation.includes('unavailable') && !issue.aiExplanation.includes('OPENROUTER') && !issue.aiExplanation.includes('Failed to parse');
    if (alreadyCached) {
      return res.json({
        success: true,
        cached: true,
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
    }

    // Not cached — call AI now
    const project = await Project.findById(issue.project._id);
    const fileObj = project?.files.find((f) => f.path === issue.file);
    const enriched = await analyzeIssuesWithAI(
      [issue.toObject()],
      fileObj?.content,
      fileObj?.name || issue.file,
      fileObj?.language || 'unknown',
      req.query.mode || 'full',
      req.user._id
    );
    const aiData = enriched[0] || {};

    // Persist to DB so next call is cached
    const fieldsToSave = {};
    const aiFields = ['aiExplanation','aiSeverityReason','potentialImpact','suggestedFix','improvedCode','repairRecommendation','hint','possibleApproach','relevantConcepts'];
    for (const f of aiFields) {
      if (aiData[f] != null) fieldsToSave[f] = aiData[f];
    }
    if (Object.keys(fieldsToSave).length > 0) {
      await Issue.findByIdAndUpdate(issue._id, { $set: fieldsToSave });
    }

    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalAiRequests': 1 },
    });

    res.json({ success: true, cached: false, ...fieldsToSave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analysis/:projectId/issues - Get all issues for a project
router.get('/:projectId/issues', async (req, res) => {
  try {
    const { priority, type, status, file } = req.query;

    // Verify project ownership
    const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const filter = { project: req.params.projectId };
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (file) filter.file = file;

    const issues = await Issue.find(filter).sort({ priorityScore: -1, priority: 1 });
    res.json({ success: true, issues });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/analysis/issues/:issueId/repair - Generate AI repair
router.post('/issues/:issueId/repair', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId).populate('project');
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    // Verify ownership
    if (issue.project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const project = await Project.findById(issue.project._id);
    const fileObj = project.files.find((f) => f.path === issue.file);

    const { generateRepair } = require('../services/openaiService');
    const result = await generateRepair(issue, fileObj?.content, fileObj?.language, req.user._id);

    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalAiRequests': 1 },
    });

    await logActivity(req.user._id, req.user.name, 'ai_request', 'Generated AI repair', {
      project: project._id,
      projectName: project.name,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/analysis/issues/:issueId/accept-repair - Apply accepted repair
router.post('/issues/:issueId/accept-repair', async (req, res) => {
  try {
    const { repairedCode, originalCode } = req.body;
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const project = await Project.findOne({ _id: issue.project, owner: req.user._id });
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    const fileIdx = project.files.findIndex((f) => f.path === issue.file);
    if (fileIdx >= 0 && repairedCode && originalCode) {
      // Fuzzy replace to handle AI whitespace/indentation discrepancies
      const escapedSearch = originalCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexPattern = escapedSearch.replace(/\s+/g, '\\s+');
      const regex = new RegExp(regexPattern);
      
      const newContent = project.files[fileIdx].content.replace(regex, repairedCode);
      
      let wasModified = false;
      if (newContent !== project.files[fileIdx].content) {
        project.files[fileIdx].content = newContent;
        wasModified = true;
      } else {
        // Fallback: try direct replace if regex fails (e.g. edge cases)
        const fallbackContent = project.files[fileIdx].content.replace(originalCode, repairedCode);
        if (fallbackContent !== project.files[fileIdx].content) {
          project.files[fileIdx].content = fallbackContent;
          wasModified = true;
        }
      }

      if (wasModified) {
        project.lastSaved = new Date();
        await project.save();
      } else {
        return res.status(400).json({ success: false, message: 'Could not apply repair: Original code block not found in file. The file may have been modified.' });
      }
    }

    issue.status = 'accepted';
    issue.resolvedAt = new Date();
    await issue.save();

    await logActivity(req.user._id, req.user.name, 'repair_accept', 'Accepted code repair', {
      project: project._id,
      projectName: project.name,
    });

    res.json({ success: true, message: 'Repair applied and issue resolved' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/analysis/issues/:issueId/reject-repair - Reject a proposed repair
router.post('/issues/:issueId/reject-repair', async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const project = await Project.findOne({ _id: issue.project, owner: req.user._id });
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    issue.status = 'rejected';
    await issue.save();

    await logActivity(req.user._id, req.user.name, 'repair_reject', 'Rejected code repair', {
      project: project._id,
      projectName: project.name,
    });

    res.json({ success: true, message: 'Repair rejected' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
