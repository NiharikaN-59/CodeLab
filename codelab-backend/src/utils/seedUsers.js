const User = require('../models/User');

const DEFAULT_ADMIN = {
  name: 'Admin',
  email: 'admin@codelab.dev',
  password: 'password123',
  role: 'admin',
};

const DEFAULT_USER = {
  name: 'Demo User',
  email: 'demo@codelab.dev',
  password: 'Demo@12345',
  role: 'user',
};

async function ensureSeedUser({ name, email, password, role }) {
  try {
    const existing = await User.findOne({ email }).select('+password');
    if (existing) {
      let modified = false;
      // Ensure role is exactly as required (demo user is strictly 'user', admin is strictly 'admin')
      if (existing.role !== role) {
        existing.role = role;
        modified = true;
      }
      if (!existing.isActive) {
        existing.isActive = true;
        modified = true;
      }
      // Check if candidate password authenticates; if not, re-hash and update
      const isMatch = await existing.comparePassword(password);
      if (!isMatch) {
        existing.password = password; // triggers pre('save') bcrypt hashing
        modified = true;
      }
      if (modified) {
        await existing.save();
        console.log(`✅ Seed user updated (${email}, role: ${role})`);
      } else {
        console.log(`ℹ️ Seed user verified and ready (${email}, role: ${role})`);
      }
      return { seeded: false, ready: true };
    }

    // Create user if not existing
    await User.create({ name, email, password, role });
    console.log(`✅ Seeded default ${role} user (${email})`);
    return { seeded: true };
  } catch (err) {
    if (err.code === 11000) {
      console.log(`ℹ️ Seed user email conflict (${email}), skipping`);
      return { seeded: false, reason: 'email-taken' };
    }
    console.error(`⚠️ Failed to ensure seed user (${email}):`, err.message);
    return { seeded: false, error: err.message };
  }
}

async function seedDefaultUsers() {
  await ensureSeedUser(DEFAULT_ADMIN);
  await ensureSeedUser(DEFAULT_USER);
}

module.exports = { seedDefaultUsers, DEFAULT_ADMIN, DEFAULT_USER };
