const { Router } = require('express');
const {
  getVoters,
  createVoter,
  updateVoter,
  updateVoterStatus,
  deleteVoter,
  addPreApprovedEmail,
  deletePreApprovedEmail,
  grantElectionAccess,
  revokeElectionAccess,
  getElectionAccessRequests,
  respondToAccessRequest
} = require('../controllers/voter.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { upload } = require('../utils/upload');
const { cacheMiddleware, del } = require('../cache');

const router = Router();

const bustVoterCache = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      del('/voters');
      del('/admin');
      del('/elections');
    }
    return originalJson(body);
  };
  next();
};

router.get('/', authenticateToken, requireAdmin, cacheMiddleware(20), getVoters);
router.post('/', authenticateToken, requireAdmin, bustVoterCache, upload.single('photo'), createVoter);
router.put('/:id', authenticateToken, requireAdmin, bustVoterCache, upload.single('photo'), updateVoter);
router.patch('/:id/status', authenticateToken, requireAdmin, bustVoterCache, updateVoterStatus);
router.delete('/:id', authenticateToken, requireAdmin, bustVoterCache, deleteVoter);

router.post('/preapproved', authenticateToken, requireAdmin, bustVoterCache, addPreApprovedEmail);
router.delete('/preapproved/:id', authenticateToken, requireAdmin, bustVoterCache, deletePreApprovedEmail);

router.post('/access/grant', authenticateToken, requireAdmin, bustVoterCache, grantElectionAccess);
router.post('/access/revoke', authenticateToken, requireAdmin, bustVoterCache, revokeElectionAccess);
router.get('/access-requests/:electionId', authenticateToken, requireAdmin, cacheMiddleware(20), getElectionAccessRequests);
router.patch('/access-requests/:requestId', authenticateToken, requireAdmin, bustVoterCache, respondToAccessRequest);

module.exports = router;

