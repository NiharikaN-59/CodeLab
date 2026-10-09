const express = require('express');
const { z } = require('zod');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: data.email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    // Make first user an admin (use updateOne to avoid re-hashing password)
    const userCount = await User.countDocuments();
    if (userCount === 1) {
      await User.findByIdAndUpdate(user._id, { role: 'admin' });
      user.role = 'admin';
    }

    const token = user.generateToken();
    await logActivity(user._id, user.name, 'register', 'Registered a new account', { ip: req.ip });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    console.error('Registration error:', err.message, err.stack);
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0].message, errors: err.errors });
    }
    res.status(500).json({ success: false, message: 'Server error during registration', detail: err.message });
  }
});

const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential is required' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google authentication failed to provide an email' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // If user exists but is deactivated
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account has been deactivated' });
      }
      
      // Link Google account if not linked yet
      if (!user.googleId) {
        user.googleId = googleId;
        if (user.authProvider === 'local') {
          // Keep it as 'local' if it was originally local, just add googleId
          // Or change to 'google' if we want to convert it, but keeping local allows password login to continue
        }
        await user.save();
      }
    } else {
      // Create new user via Google
      user = await User.create({
        name,
        email,
        authProvider: 'google',
        googleId,
        avatar: picture,
      });

      // Make first user an admin
      const userCount = await User.countDocuments();
      if (userCount === 1) {
        await User.findByIdAndUpdate(user._id, { role: 'admin' });
        user.role = 'admin';
      }
      
      await logActivity(user._id, user.name, 'register_google', 'Registered via Google', { ip: req.ip });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateToken();
    await logActivity(user._id, user.name, 'login_google', 'Logged in via Google', { ip: req.ip });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await User.findOne({ email: data.email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(data.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = user.generateToken();
    await logActivity(user._id, user.name, 'login', 'Logged in', { ip: req.ip });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: err.errors[0].message });
    }
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// POST /api/auth/logout
router.post('/logout', require('../middleware/auth').authenticate, async (req, res) => {
  await logActivity(req.user._id, req.user.name, 'logout', 'Logged out', { ip: req.ip });
  res.json({ success: true, message: 'Logged out successfully' });
});

// PUT /api/auth/profile
router.put('/profile', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Check if email is already taken by another user
    const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use by another account' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const oldEmail = user.email;
    const oldName = user.name;
    
    user.name = name;
    user.email = email;
    await user.save();
    
    if (oldEmail !== email || oldName !== name) {
      await logActivity(req.user._id, req.user.name, 'profile_update', 'Updated profile information', { ip: req.ip });
    }
    
    res.json({ success: true, message: 'Profile updated successfully', user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
});

module.exports = router;
