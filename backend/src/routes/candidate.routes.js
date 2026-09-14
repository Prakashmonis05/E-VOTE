const { Router } = require('express');
const {
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate
} = require('../controllers/candidate.controller');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { upload } = require('../utils/upload');

const router = Router();

router.get('/', authenticateToken, getCandidates);
router.post('/', authenticateToken, requireAdmin, upload.single('photo'), createCandidate);
router.put('/:id', authenticateToken, requireAdmin, upload.single('photo'), updateCandidate);
router.delete('/:id', authenticateToken, requireAdmin, deleteCandidate);

module.exports = router;
