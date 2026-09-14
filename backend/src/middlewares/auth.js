const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'evote_super_secret_jwt_key_2026_change_in_production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: true, message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: true, message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: true, message: 'Admin privilege required' });
  }
  next();
};

const requireVoter = (req, res, next) => {
  if (!req.user || req.user.role !== 'voter') {
    return res.status(403).json({ error: true, message: 'Voter privilege required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireVoter
};
