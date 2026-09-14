const { Router } = require('express');
const { voterLogin, voterSignup, adminLogin, adminSignup, getMe } = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');

const router = Router();

router.post('/voter/login', voterLogin);
router.post('/voter/signup', voterSignup);
router.post('/admin/login', adminLogin);
router.post('/admin/signup', adminSignup);
router.get('/me', authenticateToken, getMe);

module.exports = router;
