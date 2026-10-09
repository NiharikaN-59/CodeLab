const Activity = require('../models/Activity');

const logActivity = async (userId, userName, type, action, extras = {}) => {
  try {
    await Activity.create({
      user: userId,
      userName,
      type,
      action,
      project: extras.project || null,
      projectName: extras.projectName || null,
      metadata: extras.metadata || {},
      ip: extras.ip || null,
    });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

module.exports = { logActivity };
