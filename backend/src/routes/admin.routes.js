const { Router } = require('express');
const { getDashboardStats, getAuditLogs } = require('../controllers/admin.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { cacheMiddleware } = require('../cache');

const router = Router();

router.get('/stats', authenticateToken, requireAdmin, cacheMiddleware(25), getDashboardStats);
router.get('/logs', authenticateToken, requireAdmin, cacheMiddleware(25), getAuditLogs);

module.exports = router;
