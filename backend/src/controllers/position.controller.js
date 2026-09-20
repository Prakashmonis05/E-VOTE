const { prisma } = require('../prisma');

const getPositionsByElection = async (req, res) => {
  try {
    const { electionId } = req.query;
    if (!electionId) {
      return res.status(400).json({ error: true, message: 'electionId parameter required' });
    }

    const positions = await prisma.position.findMany({
      where: { electionId: parseInt(electionId, 10) },
      orderBy: { priority: 'asc' },
      include: {
        candidates: true,
        _count: {
          select: { candidates: true, votes: true }
        }
      }
    });

    return res.json({ error: false, positions });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const createPosition = async (req, res) => {
  try {
    const { electionId, description, maxVote, priority } = req.body;

    if (!electionId || !description) {
      return res.status(400).json({ error: true, message: 'electionId and description are required' });
    }

    const eId = parseInt(electionId, 10);
    const election = await prisma.election.findUnique({
      where: { id: eId }
    });

    if (!election) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    if (!isSuperAdmin && election.createdById && election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only add positions to your own elections' });
    }

    const mVote = maxVote ? parseInt(maxVote, 10) : 1;
    let prio = priority ? parseInt(priority, 10) : 1;

    if (!priority) {
      const maxPrioPos = await prisma.position.findFirst({
        where: { electionId: eId },
        orderBy: { priority: 'desc' }
      });
      prio = maxPrioPos ? maxPrioPos.priority + 1 : 1;
    }

    const position = await prisma.position.create({
      data: {
        electionId: eId,
        description,
        maxVote: mVote,
        priority: prio
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: 'CREATE_POSITION',
        targetId: `${description} (Election #${electionId})`,
        metadata: { positionId: position.id, electionId: eId }
      }
    });

    return res.status(201).json({ error: false, message: 'Position created successfully', position });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const updatePosition = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const posId = parseInt(idStr, 10);
    const { description, maxVote, priority } = req.body;

    const existing = await prisma.position.findUnique({
      where: { id: posId },
      include: { election: true }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Position not found' });
    }

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    if (!isSuperAdmin && existing.election?.createdById && existing.election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only update positions in your own elections' });
    }

    const updated = await prisma.position.update({
      where: { id: posId },
      data: {
        description: description !== undefined ? description : existing.description,
        maxVote: maxVote !== undefined ? parseInt(maxVote, 10) : existing.maxVote,
        priority: priority !== undefined ? parseInt(priority, 10) : existing.priority
      }
    });

    return res.json({ error: false, message: 'Position updated successfully', position: updated });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const deletePosition = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const posId = parseInt(idStr, 10);

    const existing = await prisma.position.findUnique({
      where: { id: posId },
      include: { election: true }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Position not found' });
    }

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    if (!isSuperAdmin && existing.election?.createdById && existing.election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only delete positions in your own elections' });
    }

    await prisma.position.delete({
      where: { id: posId }
    });

    return res.json({ error: false, message: 'Position deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const reorderPosition = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const posId = parseInt(idStr, 10);
    const { direction } = req.body;

    const current = await prisma.position.findUnique({
      where: { id: posId },
      include: { election: true }
    });

    if (!current) {
      return res.status(404).json({ error: true, message: 'Position not found' });
    }

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    if (!isSuperAdmin && current.election?.createdById && current.election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only reorder positions in your own elections' });
    }

    const neighbor = await prisma.position.findFirst({
      where: {
        electionId: current.electionId,
        priority: direction === 'up' ? { lt: current.priority } : { gt: current.priority }
      },
      orderBy: { priority: direction === 'up' ? 'desc' : 'asc' }
    });

    if (neighbor) {
      const currentPriority = current.priority;
      await prisma.position.update({
        where: { id: current.id },
        data: { priority: neighbor.priority }
      });
      await prisma.position.update({
        where: { id: neighbor.id },
        data: { priority: currentPriority }
      });
    }

    return res.json({ error: false, message: 'Positions reordered' });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
  getPositionsByElection,
  createPosition,
  updatePosition,
  deletePosition,
  reorderPosition
};
