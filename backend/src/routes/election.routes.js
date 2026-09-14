const { Router } = require('express');
const {
  getElections,
  getElectionById,
  createElection,
  updateElection,
  deleteElection,
  joinElectionByAccessCode
} = require('../controllers/election.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = Router();

router.get('/', authenticateToken, getElections);
router.get('/:id', authenticateToken, getElectionById);
router.post('/', authenticateToken, requireAdmin, createElection);
router.put('/:id', authenticateToken, requireAdmin, updateElection);
router.delete('/:id', authenticateToken, requireAdmin, deleteElection);
router.post('/join', authenticateToken, joinElectionByAccessCode);

module.exports = router;
