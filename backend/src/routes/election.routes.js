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
const { cacheMiddleware, del } = require('../cache');

const router = Router();

const bustElectionsCache = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      del('/elections');
      del('/admin');
      del('/votes');
    }
    return originalJson(body);
  };
  next();
};

router.get('/', authenticateToken, cacheMiddleware(20), getElections);
router.get('/:id', authenticateToken, cacheMiddleware(20), getElectionById);
router.post('/', authenticateToken, requireAdmin, bustElectionsCache, createElection);
router.put('/:id', authenticateToken, requireAdmin, bustElectionsCache, updateElection);
router.delete('/:id', authenticateToken, requireAdmin, bustElectionsCache, deleteElection);
router.post('/join', authenticateToken, bustElectionsCache, joinElectionByAccessCode);

module.exports = router;
