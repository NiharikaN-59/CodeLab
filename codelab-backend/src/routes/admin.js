const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Activity = require('../models/Activity');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/stats - Overall platform stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalProjects,
      totalIssues,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Project.countDocuments({ status: 'active' }),
      Issue.countDocuments(),
      Activity.find()
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('user', 'name email role')
        .lean(),
    ]);

    // Aggregate stats from user documents
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalCompilations: { $sum: '$stats.totalCompilations' },
          totalAnalyses: { $sum: '$stats.totalAnalyses' },
          totalAiRequests: { $sum: '$stats.totalAiRequests' },
        },
      },
    ]);

    const aggregated = userStats[0] || { totalCompilations: 0, totalAnalyses: 0, totalAiRequests: 0 };

    // Activity by type (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activityByType = await Activity.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Daily registration trend (last 7 days)
    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Users list
    const users = await User.find()
      .select('name email role isActive lastLogin createdAt stats')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        newUsers,
        totalProjects,
        totalIssues,
        totalCompilations: aggregated.totalCompilations,
        totalAnalyses: aggregated.totalAnalyses,
        totalAiRequests: aggregated.totalAiRequests,
      },
      activityByType,
      registrationTrend,
      recentActivity,
      users,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('name email role isActive lastLogin createdAt stats')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments();
    
    res.json({ success: true, users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/users/:id/toggle - Toggle user active status
router.put('/users/:id/toggle', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate yourself' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/activity - Get recent activity log
router.get('/activity', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.days) {
        query.createdAt = { $gte: new Date(Date.now() - parseInt(req.query.days) * 24 * 60 * 60 * 1000) };
    }

    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Activity.countDocuments(query);
      
    res.json({ success: true, activities, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
