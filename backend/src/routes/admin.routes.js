const { Router } = require('express');
const { getDashboardStats, getAuditLogs } = require('../controllers/admin.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = Router();

router.get('/stats', authenticateToken, requireAdmin, getDashboardStats);
router.get('/logs', authenticateToken, requireAdmin, getAuditLogs);

module.exports = router;
