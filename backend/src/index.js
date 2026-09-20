const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const authRoutes = require('./routes/auth.routes');
const electionRoutes = require('./routes/election.routes');
const positionRoutes = require('./routes/position.routes');
const candidateRoutes = require('./routes/candidate.routes');
const voterRoutes = require('./routes/voter.routes');
const voteRoutes = require('./routes/vote.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS – cache preflight responses for 24h so the browser stops re-checking
// on every page navigation (eliminates the invisible OPTIONS round trip delay)
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // cache preflight for 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

// Enable HTTP keep-alive so browser reuses TCP connections
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=30');
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/voters', voterRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 E-Vote Backend Server running on port ${PORT}`);
  });
}

module.exports = { app };
