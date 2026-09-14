const { Router } = require('express');
const { getBallot, submitBallot, getElectionResults } = require('../controllers/vote.controller');
const { authenticateToken } = require('../middlewares/auth');

const router = Router();

router.get('/ballot/:electionId', authenticateToken, getBallot);
router.post('/submit', authenticateToken, submitBallot);
router.get('/results/:electionId', authenticateToken, getElectionResults);

module.exports = router;
