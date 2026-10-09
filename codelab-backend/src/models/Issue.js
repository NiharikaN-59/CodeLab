const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    file: { type: String, required: true }, // file path within project
    type: {
      type: String,
      enum: ['bug', 'security', 'code_smell', 'performance', 'maintainability', 'syntax', 'unused', 'complexity', 'duplicate'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    line: { type: Number, default: null },
    column: { type: Number, default: null },
    codeSnippet: { type: String, default: null },

    // Static analysis source
    source: { type: String, enum: ['static', 'ai', 'combined'], default: 'combined' },
    rule: { type: String, default: null }, // e.g. "no-unused-vars"

    // AI analysis fields
    aiExplanation: { type: String, default: null },
    aiSeverityReason: { type: String, default: null },
    potentialImpact: { type: String, default: null },
    suggestedFix: { type: String, default: null },
    improvedCode: { type: String, default: null },
    repairRecommendation: { type: String, default: null },

    // Hint mode
    hint: { type: String, default: null },
    possibleApproach: { type: String, default: null },
    relevantConcepts: [String],

    // Status
    status: {
      type: String,
      enum: ['open', 'accepted', 'rejected', 'resolved'],
      default: 'open',
    },
    resolvedAt: { type: Date, default: null },

    // Priority scoring
    priorityScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

issueSchema.index({ project: 1, priority: 1, status: 1 });
issueSchema.index({ project: 1, file: 1 });

module.exports = mongoose.model('Issue', issueSchema);
