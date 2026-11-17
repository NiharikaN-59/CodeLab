const mongoose = require('mongoose');

const aiUsageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Null for system/unauthenticated operations if any
  },
  modelName: {
    type: String,
    required: true
  },
  operationType: {
    type: String,
    required: true,
    enum: ['analyze_issues', 'generate_repair', 'chat', 'hint_mode', 'other']
  },
  inputTokens: {
    type: Number,
    default: 0
  },
  outputTokens: {
    type: Number,
    default: 0
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  cachedInputTokens: {
    type: Number,
    default: 0
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  durationMs: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

aiUsageSchema.index({ user: 1, createdAt: -1 });
aiUsageSchema.index({ modelName: 1 });
aiUsageSchema.index({ operationType: 1 });

module.exports = mongoose.model('AiUsage', aiUsageSchema);
