const { Router } = require('express');
const {
  getPositionsByElection,
  createPosition,
  updatePosition,
  deletePosition,
  reorderPosition
} = require('../controllers/position.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = Router();

router.get('/', authenticateToken, getPositionsByElection);
router.post('/', authenticateToken, requireAdmin, createPosition);
router.put('/:id', authenticateToken, requireAdmin, updatePosition);
router.delete('/:id', authenticateToken, requireAdmin, deletePosition);
router.post('/:id/reorder', authenticateToken, requireAdmin, reorderPosition);

module.exports = router;
