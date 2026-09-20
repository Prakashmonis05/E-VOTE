const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================

const envPath = path.resolve(__dirname, '../.env');

dotenv.config({
  path: envPath,
  override: true
});

// =====================================================
// PRISMA
// =====================================================

const { prisma } = require('./prisma');

// =====================================================
// ROUTES
// =====================================================

const authRoutes = require('./routes/auth.routes');
const electionRoutes = require('./routes/election.routes');
const positionRoutes = require('./routes/position.routes');
const candidateRoutes = require('./routes/candidate.routes');
const voterRoutes = require('./routes/voter.routes');
const voteRoutes = require('./routes/vote.routes');
const adminRoutes = require('./routes/admin.routes');

// =====================================================
// APP
// =====================================================

const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// CORS
// =====================================================

const rawFrontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((u) => u.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without Origin
    // Example: Postman, curl, server-to-server
    if (!origin) {
      return callback(null, true);
    }

    // Allow localhost during development
    const isLocalhost =
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    // Allow explicitly configured frontend URLs
    const isAllowed =
      rawFrontendUrls.includes(origin) ||
      rawFrontendUrls.includes('*');

    if (isLocalhost || isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`));
  },

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ],

  credentials: true,

  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// =====================================================
// KEEP-ALIVE
// =====================================================

app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=30');
  next();
});

// =====================================================
// BODY PARSING
// =====================================================

app.use(express.json({
  limit: '2mb'
}));

app.use(express.urlencoded({
  extended: true,
  limit: '2mb'
}));

// =====================================================
// STATIC FILES
// =====================================================

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, '../uploads')
  )
);

// =====================================================
// API ROUTES
// =====================================================

app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/api/health', async (req, res) => {
  let dbStatus = 'Not Connected';
  let maskedDb = 'Not Configured';

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      maskedDb = `${url.protocol}//${url.username}:****@${url.host}${url.pathname}`;
    } catch {
      maskedDb = 'Configured';
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'Connected';
  } catch (error) {
    dbStatus = `Disconnected (${error.message})`;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    databaseStatus: dbStatus,
    databaseHost: maskedDb,
    frontendUrls: rawFrontendUrls
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    // Actually test PostgreSQL connection
    await prisma.$queryRaw`SELECT 1`;

    console.log('✅ Database connected successfully');

    app.listen(PORT, () => {
      console.log(
        `🚀 E-Vote Backend Server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error('❌ Database connection failed');
    console.error(error.message);

    // Do NOT start Express if database is unavailable
    process.exit(1);
  }
}

// =====================================================
// START
// =====================================================

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  app,
  prisma
};