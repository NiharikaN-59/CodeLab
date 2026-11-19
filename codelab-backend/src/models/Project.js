const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true }, // relative path within project
  language: { type: String, default: 'plaintext' },
  content: { type: String, default: '' },
  size: { type: Number, default: 0 },
  isDirectory: { type: Boolean, default: false },
  parent: { type: String, default: null }, // parent path
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'none'],
    default: 'none',
  },
  issueCount: { type: Number, default: 0 },
  lastAnalyzed: { type: Date, default: null },
});

// Explicit schema for topology dependency connections
// NOTE: 'type' MUST use { type: String } because 'type' is Mongoose's reserved schema key!
const dependencyConnectionSchema = new mongoose.Schema(
  {
    source: { type: String, default: '' },
    target: { type: String, default: '' },
    type: { type: String, default: '' },
    status: { type: String, default: '' },
    detail: { type: String, default: '' },
    issue: { type: String, default: null },
  },
  { _id: false }
);

const auditStageSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    name: { type: String, default: '' },
    status: { type: String, default: 'passed' },
    issuesCount: { type: Number, default: 0 },
    details: { type: String, default: '' },
  },
  { _id: false }
);

const auditSummarySchema = new mongoose.Schema(
  {
    filesInspected: { type: Number, default: 0 },
    componentsIdentified: { type: Number, default: 0 },
    apisChecked: { type: Number, default: 0 },
    checksExecuted: { type: Number, default: 0 },
    testsExecuted: { type: Number, default: 0 },
    testsPassed: { type: Number, default: 0 },
    testsFailed: { type: Number, default: 0 },
    dynamicTestsExecuted: { type: Number, default: null },
    dynamicTestsStatus: { type: String, default: 'not_run' },
    overallStatus: { type: String, default: 'passed' },
    stages: [auditStageSchema],
    dependencyMap: [dependencyConnectionSchema],
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    files: [fileSchema],
    primaryLanguage: { type: String, default: 'unknown' },
    languages: [{ language: String, count: Number }],
    status: {
      type: String,
      enum: ['active', 'archived', 'deleted'],
      default: 'active',
    },
    lastSaved: { type: Date, default: Date.now },
    lastAnalyzed: { type: Date, default: null },
    lastCompiled: { type: Date, default: null },
    compilationStatus: {
      type: String,
      enum: ['success', 'error', 'pending', 'never'],
      default: 'never',
    },
    analysisHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        totalIssues: Number,
        critical: Number,
        high: Number,
        medium: Number,
        low: Number,
        score: Number,
      },
    ],
    currentAnalysis: {
      totalIssues: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      securityIssues: { type: Number, default: 0 },
      qualityScore: { type: Number, default: 100 },
      auditSummary: {
        type: auditSummarySchema,
        default: () => ({}),
      },
    },
    tags: [String],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for fast user project lookups
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ owner: 1, updatedAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
