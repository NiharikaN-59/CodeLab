const User = require('../models/User');

const DEFAULT_ADMIN = {
  name: 'Admin',
  email: 'admin@codelab.dev',
  password: 'password123',
  role: 'admin',
};

const DEFAULT_USER = {
  name: 'Demo User',
  email: 'test@codelab.dev',
  password: 'Test@12345',
  role: 'user',
};

async function ensureSeedUser({ name, email, password, role }) {
  const existingByRole = await User.findOne({ role }).lean();
  if (existingByRole) {
    console.log(`ℹ️ ${role} user already exists (${existingByRole.email}), skipping seed`);
    return { seeded: false, reason: 'role-exists' };
  }

  try {
    await User.create({ name, email, password, role });
    console.log(`✅ Seeded default ${role} user (${email})`);
    return { seeded: true };
  } catch (err) {
    if (err.code === 11000) {
      console.log(`ℹ️ Seed ${role} user email already taken (${email}), skipping`);
      return { seeded: false, reason: 'email-taken' };
    }
    throw err;
  }
}

async function seedDefaultUsers() {
  await ensureSeedUser(DEFAULT_ADMIN);
  await ensureSeedUser(DEFAULT_USER);
}

module.exports = { seedDefaultUsers, DEFAULT_ADMIN, DEFAULT_USER };
