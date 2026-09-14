const { ElectionStatus } = require('@prisma/client');
const { prisma } = require('../prisma');

const getElections = async (req, res) => {
  try {
    const isVoter = req.user?.role === 'voter';
    const voterId = req.user?.id;

    if (isVoter && voterId) {
      const grantedAccess = await prisma.voterElectionAccess.findMany({
        where: { voterId },
        select: { electionId: true }
      });
      const grantedIds = grantedAccess.map((a) => a.electionId);

      const elections = await prisma.election.findMany({
        where: {
          id: { in: grantedIds }
        },
        orderBy: { createdOn: 'desc' }
      });

      const participations = await prisma.voterParticipation.findMany({
        where: { voterId },
        select: { electionId: true }
      });
      const votedElectionIds = new Set(participations.map((p) => p.electionId));

      const result = elections.map((e) => ({
        ...e,
        hasAccess: true,
        hasVoted: votedElectionIds.has(e.id)
      }));

      return res.json({ error: false, elections: result });
    }

    const elections = await prisma.election.findMany({
      include: {
        createdBy: {
          select: { id: true, email: true, username: true, firstname: true, lastname: true }
        },
        _count: {
          select: {
            positions: true,
            votes: true,
            accessGrants: true,
            participations: true
          }
        }
      },
      orderBy: { createdOn: 'desc' }
    });

    return res.json({ error: false, elections });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const getElectionById = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const electionId = parseInt(idStr, 10);

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          orderBy: { priority: 'asc' },
          include: {
            candidates: true
          }
        },
        createdBy: {
          select: { id: true, email: true, username: true }
        },
        _count: {
          select: { votes: true, accessGrants: true, participations: true }
        }
      }
    });

    if (!election) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    let hasVoted = false;
    let hasAccess = false;

    if (req.user?.role === 'voter') {
      const access = await prisma.voterElectionAccess.findFirst({
        where: { voterId: req.user.id, electionId }
      });
      hasAccess = !!access;

      const participation = await prisma.voterParticipation.findFirst({
        where: { voterId: req.user.id, electionId }
      });
      hasVoted = !!participation;
    }

    return res.json({
      error: false,
      election: {
        ...election,
        hasAccess,
        hasVoted
      }
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const createElection = async (req, res) => {
  try {
    const { title, description, accessCode, startDate, endDate, status, resultsPublic } = req.body;

    if (!title || !accessCode || !startDate || !endDate) {
      return res.status(400).json({ error: true, message: 'Title, access code, start date, and end date are required' });
    }

    const existingCode = await prisma.election.findUnique({
      where: { accessCode: accessCode.trim() }
    });

    if (existingCode) {
      return res.status(400).json({ error: true, message: 'Access code already in use by another election' });
    }

    const electionStatus = status ? status.toUpperCase() : ElectionStatus.PENDING;

    const election = await prisma.election.create({
      data: {
        title,
        description: description || '',
        accessCode: accessCode.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: electionStatus,
        resultsPublic: !!resultsPublic,
        createdById: req.user?.id
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: 'CREATE_ELECTION',
        targetId: election.title,
        metadata: { electionId: election.id, title: election.title }
      }
    });

    return res.status(201).json({ error: false, message: 'Election created successfully', election });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const updateElection = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const electionId = parseInt(idStr, 10);
    const { title, description, accessCode, startDate, endDate, status, resultsPublic } = req.body;

    const existing = await prisma.election.findUnique({
      where: { id: electionId }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    if (accessCode && accessCode !== existing.accessCode) {
      const codeCheck = await prisma.election.findUnique({
        where: { accessCode: accessCode.trim() }
      });
      if (codeCheck) {
        return res.status(400).json({ error: true, message: 'Access code is already in use' });
      }
    }

    const updated = await prisma.election.update({
      where: { id: electionId },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        accessCode: accessCode !== undefined ? accessCode.trim() : existing.accessCode,
        startDate: startDate ? new Date(startDate) : existing.startDate,
        endDate: endDate ? new Date(endDate) : existing.endDate,
        status: status ? status.toUpperCase() : existing.status,
        resultsPublic: resultsPublic !== undefined ? !!resultsPublic : existing.resultsPublic
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: 'UPDATE_ELECTION',
        targetId: updated.title,
        metadata: { electionId: updated.id, status: updated.status }
      }
    });

    return res.json({ error: false, message: 'Election updated successfully', election: updated });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const deleteElection = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const electionId = parseInt(idStr, 10);

    const election = await prisma.election.findUnique({
      where: { id: electionId }
    });

    if (!election) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    await prisma.election.delete({
      where: { id: electionId }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: 'DELETE_ELECTION',
        targetId: election.title,
        metadata: { electionId, title: election.title }
      }
    });

    return res.json({ error: false, message: 'Election deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const joinElectionByAccessCode = async (req, res) => {
  try {
    const { accessCode } = req.body;
    const voterId = req.user?.id;

    if (!accessCode) {
      return res.status(400).json({ error: true, message: 'Access code is required' });
    }

    if (!voterId) {
      return res.status(401).json({ error: true, message: 'Voter authentication required' });
    }

    const cleanCode = accessCode.toString().trim();
    const numericId = parseInt(cleanCode, 10);

    const election = await prisma.election.findFirst({
      where: {
        OR: [
          { accessCode: cleanCode },
          ...(!isNaN(numericId) ? [{ id: numericId }] : [])
        ]
      }
    });

    if (!election) {
      return res.status(404).json({ error: true, message: 'Invalid access code' });
    }

    if (election.status !== ElectionStatus.ACTIVE) {
      return res.status(400).json({ error: true, message: `This election is currently ${election.status}` });
    }

    const existingAccess = await prisma.voterElectionAccess.findFirst({
      where: { voterId, electionId: election.id }
    });

    if (!existingAccess) {
      await prisma.voterElectionAccess.create({
        data: {
          voterId,
          electionId: election.id
        }
      });
    }

    const participation = await prisma.voterParticipation.findFirst({
      where: { voterId, electionId: election.id }
    });

    const hasVoted = !!participation;

    return res.json({
      error: false,
      message: hasVoted
        ? `You have joined "${election.title}". You have already submitted your ballot.`
        : `Successfully entered election "${election.title}". You can now cast your vote!`,
      election: {
        ...election,
        hasAccess: true,
        hasVoted
      }
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
  getElections,
  getElectionById,
  createElection,
  updateElection,
  deleteElection,
  joinElectionByAccessCode
};
