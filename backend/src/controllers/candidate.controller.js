const { prisma } = require('../prisma');

const getCandidates = async (req, res) => {
  try {
    const { positionId, electionId } = req.query;

    if (positionId) {
      const candidates = await prisma.candidate.findMany({
        where: { positionId: parseInt(positionId, 10) }
      });
      return res.json({ error: false, candidates });
    }

    if (electionId) {
      const candidates = await prisma.candidate.findMany({
        where: {
          position: { electionId: parseInt(electionId, 10) }
        },
        include: { position: true }
      });
      return res.json({ error: false, candidates });
    }

    const candidates = await prisma.candidate.findMany({
      include: { position: true }
    });

    return res.json({ error: false, candidates });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const createCandidate = async (req, res) => {
  try {
    const { positionId, firstname, lastname, platform } = req.body;
    const photo = req.file ? req.file.filename : (req.body.photo || '');

    if (!positionId || !firstname || !lastname) {
      return res.status(400).json({ error: true, message: 'Position, firstname, and lastname are required' });
    }

    const posId = parseInt(positionId, 10);
    const position = await prisma.position.findUnique({
      where: { id: posId },
      include: { election: true }
    });

    if (!position) {
      return res.status(404).json({ error: true, message: 'Position not found' });
    }

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    if (!isSuperAdmin && position.election?.createdById && position.election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only add candidates to your own elections' });
    }

    const candidate = await prisma.candidate.create({
      data: {
        positionId: posId,
        firstname,
        lastname,
        platform: platform || '',
        photo
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: 'ADD_CANDIDATE',
        targetId: `${firstname} ${lastname}`,
        metadata: { candidateId: candidate.id }
      }
    });

    return res.status(201).json({ error: false, message: 'Candidate created successfully', candidate });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const updateCandidate = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const candId = parseInt(idStr, 10);
    const { positionId, firstname, lastname, platform } = req.body;
    const photo = req.file ? req.file.filename : req.body.photo;

    const existing = await prisma.candidate.findUnique({
      where: { id: candId },
      include: { position: { include: { election: true } } }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Candidate not found' });
    }

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    if (!isSuperAdmin && existing.position?.election?.createdById && existing.position.election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only update candidates in your own elections' });
    }

    const updated = await prisma.candidate.update({
      where: { id: candId },
      data: {
        positionId: positionId ? parseInt(positionId, 10) : existing.positionId,
        firstname: firstname !== undefined ? firstname : existing.firstname,
        lastname: lastname !== undefined ? lastname : existing.lastname,
        platform: platform !== undefined ? platform : existing.platform,
        photo: photo !== undefined ? photo : existing.photo
      }
    });

    return res.json({ error: false, message: 'Candidate updated successfully', candidate: updated });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const candId = parseInt(idStr, 10);

    const existing = await prisma.candidate.findUnique({
      where: { id: candId },
      include: { position: { include: { election: true } } }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Candidate not found' });
    }

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    if (!isSuperAdmin && existing.position?.election?.createdById && existing.position.election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only delete candidates in your own elections' });
    }

    await prisma.candidate.delete({
      where: { id: candId }
    });

    return res.json({ error: false, message: 'Candidate deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
  getCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate
};
