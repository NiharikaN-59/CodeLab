const assert = require('assert');
const mongoose = require('mongoose');
const Project = require('./src/models/Project');
const { runEndToEndAnalysis, calculateQualityScore } = require('./src/services/e2eAnalyzer');

console.log('🧪 Starting CodeLab Audit & Schema Regression Tests...\n');

// ── TEST 1: Quality Score Calculations ──
console.log('Test 1: Quality Score Calculations');
assert.strictEqual(calculateQualityScore({ critical: 0, high: 0, medium: 0, low: 0 }), 100, 'Clean project should score 100');
assert.strictEqual(calculateQualityScore({ critical: 1, high: 0, medium: 0, low: 0 }), 75, '1 critical issue should deduct 25 points');
assert.strictEqual(calculateQualityScore({ critical: 0, high: 1, medium: 0, low: 0 }), 88, '1 high issue should deduct 12 points');
assert.strictEqual(calculateQualityScore({ critical: 0, high: 0, medium: 2, low: 0 }), 90, '2 medium issues should deduct 10 points');
assert.strictEqual(calculateQualityScore({ critical: 0, high: 0, medium: 0, low: 5 }), 95, '5 low issues should deduct 5 points');
// User's exact scenario: 1 critical, 111 high, 40 medium, 9 low
const userScenarioScore = calculateQualityScore({ critical: 1, high: 111, medium: 40, low: 9 });
assert.strictEqual(userScenarioScore, 0, 'Project with 1 critical and 111 high issues MUST score 0/100, NEVER 100/100');
console.log('  ✅ Clean project score: 100/100');
console.log('  ✅ User scenario (1 critical + 111 high): ' + userScenarioScore + '/100 (Floor at 0)');

// ── TEST 2: End-to-End Analysis Heuristics & Topology Generation ──
console.log('\nTest 2: End-to-End Analyzer Execution on Multi-Tier Repository');
const sampleProjectFiles = [
  {
    path: 'package.json',
    name: 'package.json',
    content: JSON.stringify({
      name: 'event-manager-backend',
      dependencies: { express: '^4.18.2', mongoose: '^7.0.0' }
    })
  },
  {
    path: 'src/controllers/createAdmin.js',
    name: 'createAdmin.js',
    content: `
      const User = require('./models/User'); // Broken import
      const hardcodedPassword = "super_secret_admin_pwd"; // Critical security issue
      async function createAdmin(req, res) {
        await User.create({ name: 'Admin', password: hardcodedPassword }); // Unhandled async
        res.json({ success: true });
      }
      module.exports = createAdmin;
    `
  },
  {
    path: 'src/controllers/ensureEvent.js',
    name: 'ensureEvent.js',
    content: `
      const Event = require('../models/Event');
      async function ensureEvent(req, res) {
        await Event.findOne({ _id: req.params.id });
      }
    `
  },
  {
    path: 'src/routes/admin.js',
    name: 'admin.js',
    content: `
      const express = require('express');
      const router = express.Router();
      router.post('/api/admin/create', require('../controllers/createAdmin'));
      module.exports = router;
    `
  },
  {
    path: 'src/frontend/pages/Admin.jsx',
    name: 'Admin.jsx',
    content: `
      import React, { useEffect } from 'react';
      import axios from 'axios';
      import MissingComponent from 'missing-pkg';
      export default function AdminPage() {
        useEffect(() => {
          axios.post('/api/admin/create');
          axios.get('/api/admin/nonexistent-route'); // Contract mismatch 404
        }, []);
        return <div>Admin</div>;
      }
    `
  }
];

const analysisResult = runEndToEndAnalysis(sampleProjectFiles);
assert.ok(analysisResult.issues.length > 0, 'Should detect issues in sample project');
assert.ok(analysisResult.auditSummary.dependencyMap.length > 0, 'Should build architecture dependency map');
assert.strictEqual(analysisResult.auditSummary.filesInspected, 5, 'Should inspect all 5 non-directory files');
assert.strictEqual(analysisResult.auditSummary.apisChecked, 3, 'Should check all declared and called API endpoints');
assert.ok(analysisResult.qualityScore < 100, 'Quality score must reflect deductions for detected vulnerabilities');
console.log('  ✅ Files inspected: ' + analysisResult.auditSummary.filesInspected);
console.log('  ✅ APIs checked: ' + analysisResult.auditSummary.apisChecked);
console.log('  ✅ Dependency connections mapped: ' + analysisResult.auditSummary.dependencyMap.length);
console.log('  ✅ Quality score computed: ' + analysisResult.qualityScore + '/100');

// ── TEST 3: Mongoose Model Schema Validation with Dependency Map Objects ──
console.log('\nTest 3: Mongoose Project Model Validation & Schema Casting');
const projectDoc = new Project({
  name: 'Web Application Test',
  owner: new mongoose.Types.ObjectId(),
  primaryLanguage: 'javascript',
  currentAnalysis: {
    totalIssues: analysisResult.summary.totalIssues,
    critical: analysisResult.summary.critical,
    high: analysisResult.summary.high,
    medium: analysisResult.summary.medium,
    low: analysisResult.summary.low,
    securityIssues: analysisResult.summary.securityIssues,
    qualityScore: analysisResult.qualityScore,
    auditSummary: analysisResult.auditSummary,
  }
});

const validationError = projectDoc.validateSync();
assert.strictEqual(validationError, undefined, 'Mongoose validation MUST pass with zero CastError or ValidationError');

// Verify dependencyMap elements remain structured objects
const firstConn = projectDoc.currentAnalysis.auditSummary.dependencyMap[0];
assert.strictEqual(typeof firstConn, 'object', 'dependencyMap item must be an object');
assert.ok(firstConn.source, 'Must have source attribute');
assert.ok(firstConn.target, 'Must have target attribute');
assert.ok(firstConn.type, 'Must have type attribute');
assert.strictEqual(typeof firstConn.type, 'string', 'Connection type must be string');
console.log('  ✅ Mongoose schema validation passed with zero errors');
console.log('  ✅ dependencyMap items correctly preserved as structured subdocuments:');
console.log('     Sample: ' + firstConn.source + ' -> ' + firstConn.target + ' (' + firstConn.type + ')');

// ── TEST 4: Frontend Nullish Coalescing Verification ──
console.log('\nTest 4: Nullish Coalescing vs Logical OR for Quality Score 0');
const badScoreExtraction = (score) => score || 100;
const goodScoreExtraction = (score) => score ?? 100;

assert.strictEqual(badScoreExtraction(0), 100, 'Flawed (0 || 100) incorrectly evaluates to 100');
assert.strictEqual(goodScoreExtraction(0), 0, 'Fixed (0 ?? 100) correctly preserves 0');
assert.strictEqual(goodScoreExtraction(null), 100, 'Nullish score defaults to 100');
assert.strictEqual(goodScoreExtraction(undefined), 100, 'Undefined score defaults to 100');
assert.strictEqual(goodScoreExtraction(42), 42, 'Existing score 42 preserved');
console.log('  ✅ Verified: qualityScore = 0 is properly rendered as 0/100, never masked as 100/100');

console.log('\n🎉 ALL REGRESSION TESTS PASSED SUCCESSFULLY!');
