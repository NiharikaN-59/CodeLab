const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const AiUsage = require('../models/AiUsage');
const mongoose = require('mongoose');

const router = express.Router();
router.use(authenticate);

// GET /api/usage/my-stats
// Retrieve token usage statistics for the current user
router.get('/my-stats', async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    const matchQuery = { user: userId };
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          totalTokens: { $sum: '$totalTokens' },
          totalCost: { $sum: '$estimatedCost' },
          failedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          avgDuration: { $avg: '$durationMs' }
        }
      }
    ]);

    const breakdownByModel = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$modelName',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' }
        }
      }
    ]);

    const breakdownByOperation = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$operationType',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' }
        }
      }
    ]);

    const dailyUsage = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, totalCost: 0, failedRequests: 0, avgDuration: 0
      },
      breakdownByModel,
      breakdownByOperation,
      dailyUsage
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/usage/admin-stats
// Retrieve system-wide token usage statistics (admin only)
router.get('/admin-stats', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          totalTokens: { $sum: '$totalTokens' },
          totalCost: { $sum: '$estimatedCost' },
          failedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          avgDuration: { $avg: '$durationMs' }
        }
      }
    ]);

    const breakdownByModel = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$modelName',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' }
        }
      }
    ]);

    const breakdownByOperation = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$operationType',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' }
        }
      }
    ]);

    const topUsers = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$user',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' }
        }
      },
      { $sort: { cost: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          requests: 1,
          tokens: 1,
          cost: 1,
          name: '$userDetails.name',
          email: '$userDetails.email'
        }
      }
    ]);

    const dailyUsage = await AiUsage.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, totalCost: 0, failedRequests: 0, avgDuration: 0
      },
      breakdownByModel,
      breakdownByOperation,
      topUsers,
      dailyUsage
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
