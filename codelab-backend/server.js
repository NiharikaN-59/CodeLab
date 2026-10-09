require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/projects', require('./src/routes/projects'));
app.use('/api/analysis', require('./src/routes/analysis'));
app.use('/api/compiler', require('./src/routes/compiler'));
app.use('/api/ai', require('./src/routes/ai'));
app.use('/api/admin', require('./src/routes/admin'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: `File upload error: ${err.message}` });
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Database connection
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');

    try {
      const { seedDefaultUsers } = require('./src/utils/seedUsers');
      await seedDefaultUsers();
    } catch (seedErr) {
      console.error('⚠️ Seeding default users failed:', seedErr.message);
    }

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 CodeLab backend running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🤖 OpenRouter: ${process.env.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY.startsWith('your-') ? `Configured (${process.env.AI_MODEL || 'default model'})` : 'Not configured (using mock)'}`);
      try {
        const { getCompilerStatus: getJudge0Status } = require('./src/services/compilerService');
        const js = getJudge0Status();
        console.log(`⚙️ Judge0: ${js.mode} (${js.url})${js.hasKey ? ' [key set]' : ''}`);
      } catch (e) {
        console.log('⚙️ Judge0: status unavailable');
      }
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.log('💡 Make sure MongoDB is running. Start with: mongod');
    process.exit(1);
  }
};

startServer();

module.exports = app;
