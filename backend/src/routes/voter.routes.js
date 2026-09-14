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
  revokeElectionAccess
} = require('../controllers/voter.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { upload } = require('../utils/upload');

const router = Router();

router.get('/', authenticateToken, requireAdmin, getVoters);
router.post('/', authenticateToken, requireAdmin, upload.single('photo'), createVoter);
router.put('/:id', authenticateToken, requireAdmin, upload.single('photo'), updateVoter);
router.patch('/:id/status', authenticateToken, requireAdmin, updateVoterStatus);
router.delete('/:id', authenticateToken, requireAdmin, deleteVoter);

router.post('/preapproved', authenticateToken, requireAdmin, addPreApprovedEmail);
router.delete('/preapproved/:id', authenticateToken, requireAdmin, deletePreApprovedEmail);

router.post('/access/grant', authenticateToken, requireAdmin, grantElectionAccess);
router.post('/access/revoke', authenticateToken, requireAdmin, revokeElectionAccess);

module.exports = router;
