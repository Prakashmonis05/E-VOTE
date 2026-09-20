const bcrypt = require('bcryptjs');
const { ElectionStatus } = require('@prisma/client');
const { prisma } = require('../prisma');

function isBcryptHash(str) {
  return typeof str === 'string' && /^\$2[ayb]\$\d+\$/.test(str);
}

async function verifyAccessCode(inputCode, storedCode) {
  if (!storedCode || !inputCode) return false;
  const cleanInput = inputCode.toString().trim();
  const cleanStored = storedCode.toString().trim();

  if (isBcryptHash(cleanStored)) {
    try {
      if (await bcrypt.compare(cleanInput, cleanStored)) return true;
      if (await bcrypt.compare(cleanInput.toUpperCase(), cleanStored)) return true;
      if (await bcrypt.compare(cleanInput.toLowerCase(), cleanStored)) return true;
    } catch (err) {
      // Fallback for unhashed legacy access codes
    }
  }
  return cleanInput.toUpperCase() === cleanStored.toUpperCase();
}

const getElections = async (req, res) => {
  try {
    const isVoter = req.user?.role === 'voter';
    const voterId = req.user?.id;

    if (isVoter && voterId) {
      const allElections = await prisma.election.findMany({
        orderBy: { createdOn: 'desc' }
      });

      const userAccesses = await prisma.voterElectionAccess.findMany({
        where: { voterId }
      });
      const accessMap = new Map(userAccesses.map((a) => [a.electionId, a.status]));

      const participations = await prisma.voterParticipation.findMany({
        where: { voterId },
        select: { electionId: true }
      });
      const votedElectionIds = new Set(participations.map((p) => p.electionId));

      const result = allElections.map((e) => {
        let hasAccess = false;
        let accessStatus = 'NONE';

        if (e.type === 'PUBLIC') {
          hasAccess = true;
          accessStatus = 'APPROVED';
        } else {
          const status = accessMap.get(e.id);
          if (status) {
            accessStatus = status;
            hasAccess = status === 'APPROVED';
          }
        }

        const { accessCode, ...safeElection } = e;
        return {
          ...safeElection,
          hasAccess,
          accessStatus,
          hasVoted: votedElectionIds.has(e.id)
        };
      });

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
    let accessStatus = 'NONE';

    if (req.user?.role === 'voter') {
      if (election.type === 'PUBLIC') {
        hasAccess = true;
        accessStatus = 'APPROVED';
      } else {
        const access = await prisma.voterElectionAccess.findFirst({
          where: { voterId: req.user.id, electionId }
        });
        if (access) {
          accessStatus = access.status;
          hasAccess = access.status === 'APPROVED';
        }
      }

      const participation = await prisma.voterParticipation.findFirst({
        where: { voterId: req.user.id, electionId }
      });
      hasVoted = !!participation;
    } else {
      hasAccess = true;
      accessStatus = 'APPROVED';
    }

    const { accessCode, ...safeElection } = election;

    return res.json({
      error: false,
      election: {
        ...(req.user?.role === 'voter' ? safeElection : election),
        hasAccess,
        accessStatus,
        hasVoted
      }
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const createElection = async (req, res) => {
  try {
    const { title, description, type, accessCode, startDate, endDate, status, resultsPublic } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: true, message: 'Title, start date, and end date are required' });
    }

    const electionType = type ? type.toUpperCase() : 'PUBLIC';

    let cleanAccessCode = null;
    if (electionType === 'PRIVATE') {
      if (!accessCode || !accessCode.toString().trim()) {
        return res.status(400).json({ error: true, message: 'Access code is required for private elections' });
      }
      cleanAccessCode = accessCode.toString().trim();
    }

    const electionStatus = status ? status.toUpperCase() : ElectionStatus.PENDING;

    const election = await prisma.election.create({
      data: {
        title,
        description: description || '',
        type: electionType,
        accessCode: cleanAccessCode,
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
        metadata: { electionId: election.id, title: election.title, type: election.type }
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
    const { title, description, type, accessCode, startDate, endDate, status, resultsPublic } = req.body;

    const existing = await prisma.election.findUnique({
      where: { id: electionId }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    const electionType = type ? type.toUpperCase() : existing.type;

    let finalAccessCode = existing.accessCode;

    if (electionType === 'PUBLIC') {
      finalAccessCode = null;
    } else if (electionType === 'PRIVATE') {
      if (accessCode && accessCode.toString().trim() !== '') {
        finalAccessCode = accessCode.toString().trim();
      } else if (!existing.accessCode) {
        return res.status(400).json({ error: true, message: 'Access code is required for private elections' });
      }
    }

    const updated = await prisma.election.update({
      where: { id: electionId },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        type: electionType,
        accessCode: finalAccessCode,
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
        metadata: { electionId: updated.id, status: updated.status, type: updated.type }
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
    const { accessCode, electionId } = req.body;
    const voterId = req.user?.id;

    if (!accessCode || !accessCode.toString().trim()) {
      return res.status(400).json({ error: true, message: 'Access code is required' });
    }

    if (!voterId) {
      return res.status(401).json({ error: true, message: 'Voter authentication required' });
    }

    const voter = await prisma.voter.findUnique({
      where: { id: voterId }
    });

    if (!voter) {
      return res.status(404).json({ error: true, message: 'Voter not found' });
    }

    const cleanCode = accessCode.toString().trim();
    let targetElection = null;

    // 1. If electionId was specified directly
    if (electionId) {
      const eId = parseInt(electionId, 10);
      if (!isNaN(eId)) {
        const e = await prisma.election.findUnique({ where: { id: eId } });
        if (e && e.type === 'PRIVATE') {
          if (await verifyAccessCode(cleanCode, e.accessCode)) {
            targetElection = e;
          } else {
            return res.status(400).json({ error: true, message: 'Invalid access code for this election' });
          }
        }
      }
    }

    // 2. Otherwise search across all private elections
    if (!targetElection) {
      const privateElections = await prisma.election.findMany({
        where: { type: 'PRIVATE' }
      });

      for (const e of privateElections) {
        if (await verifyAccessCode(cleanCode, e.accessCode)) {
          targetElection = e;
          break;
        }
      }
    }

    if (!targetElection) {
      return res.status(404).json({ error: true, message: 'Invalid access code. Please verify the code and try again.' });
    }

    // Check if voter already cast ballot
    const participation = await prisma.voterParticipation.findFirst({
      where: { voterId, electionId: targetElection.id }
    });
    const hasVoted = !!participation;

    // GRANT IMMEDIATE APPROVED ACCESS
    const existingAccess = await prisma.voterElectionAccess.findFirst({
      where: { voterId, electionId: targetElection.id }
    });

    if (existingAccess) {
      if (existingAccess.status !== 'APPROVED') {
        await prisma.voterElectionAccess.update({
          where: { id: existingAccess.id },
          data: { status: 'APPROVED' }
        });
      }
    } else {
      await prisma.voterElectionAccess.create({
        data: {
          voterId,
          electionId: targetElection.id,
          status: 'APPROVED'
        }
      });
    }

    const { accessCode: _, ...safeElection } = targetElection;

    return res.json({
      error: false,
      status: 'APPROVED',
      message: hasVoted
        ? `Access verified for "${targetElection.title}". You have already submitted your ballot.`
        : `Successfully unlocked "${targetElection.title}"! You can now cast your vote.`,
      election: {
        ...safeElection,
        hasAccess: true,
        accessStatus: 'APPROVED',
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
