const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function testUserSchema() {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const newUser = new User({
      name: 'Google User Test',
      email: 'testgoogle@example.com',
      authProvider: 'google',
      googleId: '12345'
      // no password
    });

    await newUser.save();
    console.log('Successfully saved user without password (authProvider = google)');
    await User.deleteOne({ email: 'testgoogle@example.com' });

    const localUser = new User({
      name: 'Local User Test',
      email: 'testlocal@example.com',
      authProvider: 'local'
      // no password
    });

    try {
      await localUser.save();
      console.log('WARNING: Saved local user without password!');
    } catch (e) {
      console.log('Correctly rejected local user without password:', e.message);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.connection.close();
  }
}

testUserSchema();
