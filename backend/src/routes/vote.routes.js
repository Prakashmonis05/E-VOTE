const { Router } = require('express');
const { getBallot, submitBallot, getElectionResults } = require('../controllers/vote.controller');
const { authenticateToken } = require('../middlewares/auth');
const { cacheMiddleware, del } = require('../cache');

const router = Router();

const bustVoteCache = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      del('/votes');
      del('/admin');
      del('/elections');
    }
    return originalJson(body);
  };
  next();
};

router.get('/ballot/:electionId', authenticateToken, getBallot);
router.post('/submit', authenticateToken, bustVoteCache, submitBallot);
router.get('/results/:electionId', authenticateToken, cacheMiddleware(15), getElectionResults);

module.exports = router;
