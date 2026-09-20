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
    const roleLower = req.user?.role?.toLowerCase();
    const isVoter = roleLower === 'voter';
    const isAdmin = roleLower === 'admin' || roleLower === 'super_admin';
    const isSuperAdmin = roleLower === 'super_admin';
    const userId = req.user?.id;

    if (isVoter && userId) {
      const voter = await prisma.voter.findUnique({
        where: { id: userId },
        select: { id: true, email: true }
      });

      const userAccesses = await prisma.voterElectionAccess.findMany({
        where: { voterId: userId }
      });
      const accessMap = new Map(userAccesses.map((a) => [a.electionId, a.status]));

      let preApprovedIds = [];
      if (voter?.email) {
        const preApprovedRecords = await prisma.preApprovedEmail.findMany({
          where: { email: voter.email.toLowerCase().trim() },
          select: { electionId: true }
        });
        preApprovedIds = preApprovedRecords.map((p) => p.electionId);
      }

      const allowedElectionIds = Array.from(new Set([
        ...userAccesses.map((a) => a.electionId),
        ...preApprovedIds
      ]));

      // Visible elections: PUBLIC elections OR private elections voter entered code for / was granted / is pre-approved for
      const visibleElections = await prisma.election.findMany({
        where: {
          OR: [
            { type: 'PUBLIC' },
            ...(allowedElectionIds.length > 0 ? [{ id: { in: allowedElectionIds } }] : [])
          ]
        },
        orderBy: { createdOn: 'desc' }
      });

      const participations = await prisma.voterParticipation.findMany({
        where: { voterId: userId },
        select: { electionId: true }
      });
      const votedElectionIds = new Set(participations.map((p) => p.electionId));

      const preApprovedSet = new Set(preApprovedIds);

      const result = visibleElections.map((e) => {
        let hasAccess = false;
        let accessStatus = 'NONE';

        if (e.type === 'PUBLIC') {
          hasAccess = true;
          accessStatus = 'APPROVED';
        } else if (preApprovedSet.has(e.id)) {
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

    if (isAdmin && userId) {
      // Admin only sees elections that THEY created (unless Super Admin)
      const whereClause = isSuperAdmin ? {} : { createdById: userId };

      const elections = await prisma.election.findMany({
        where: whereClause,
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
    }

    // Default for guest / unauthenticated: return ONLY Public elections
    const publicElections = await prisma.election.findMany({
      where: { type: 'PUBLIC' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        startDate: true,
        endDate: true,
        status: true,
        resultsPublic: true,
        createdOn: true
      },
      orderBy: { createdOn: 'desc' }
    });

    return res.json({ error: false, elections: publicElections });
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

    const roleLower = req.user?.role?.toLowerCase();
    const isAdmin = roleLower === 'admin' || roleLower === 'super_admin';
    const isSuperAdmin = roleLower === 'super_admin';
    const isVoter = roleLower === 'voter';

    // Admin security check: admin can only access election they created
    if (isAdmin && !isSuperAdmin && election.createdById && election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You do not have permission to manage this election' });
    }

    let hasVoted = false;
    let hasAccess = false;
    let accessStatus = 'NONE';

    if (isVoter) {
      if (election.type === 'PUBLIC') {
        hasAccess = true;
        accessStatus = 'APPROVED';
      } else {
        // Check access grants
        const access = await prisma.voterElectionAccess.findFirst({
          where: { voterId: req.user.id, electionId, status: 'APPROVED' }
        });

        // Check pre-approved emails
        let isPreApproved = false;
        if (!access && req.user.email) {
          const pre = await prisma.preApprovedEmail.findFirst({
            where: { email: req.user.email.toLowerCase().trim(), electionId }
          });
          isPreApproved = !!pre;
        }

        if (access || isPreApproved) {
          hasAccess = true;
          accessStatus = 'APPROVED';
        } else {
          // Private election without access -> Deny access
          return res.status(403).json({
            error: true,
            message: 'This is a private election. Access is restricted to pre-approved voters.'
          });
        }
      }

      const participation = await prisma.voterParticipation.findFirst({
        where: { voterId: req.user.id, electionId }
      });
      hasVoted = !!participation;
    } else if (isAdmin) {
      hasAccess = true;
      accessStatus = 'APPROVED';
    } else {
      // Unauthenticated
      if (election.type === 'PRIVATE') {
        return res.status(403).json({ error: true, message: 'This is a private election. Access restricted.' });
      }
    }

    const { accessCode, ...safeElection } = election;

    return res.json({
      error: false,
      election: {
        ...(isVoter ? safeElection : election),
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

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';

    // Verify election ownership
    if (!isSuperAdmin && existing.createdById && existing.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only update elections you created' });
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

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';

    // Verify election ownership
    if (!isSuperAdmin && election.createdById && election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only delete elections you created' });
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

    // Check if voter's email is pre-approved
    const preApproved = await prisma.preApprovedEmail.findFirst({
      where: {
        email: voter.email.toLowerCase().trim(),
        electionId: targetElection.id
      }
    });

    const isPreApproved = !!preApproved;
    const accessStatus = isPreApproved ? 'APPROVED' : 'PENDING';

    const existingAccess = await prisma.voterElectionAccess.findFirst({
      where: { voterId, electionId: targetElection.id }
    });

    if (existingAccess) {
      if (existingAccess.status !== 'APPROVED' && isPreApproved) {
        await prisma.voterElectionAccess.update({
          where: { id: existingAccess.id },
          data: { status: 'APPROVED', grantedOn: new Date() }
        });
      } else if (existingAccess.status === 'DECLINED') {
        await prisma.voterElectionAccess.update({
          where: { id: existingAccess.id },
          data: { status: accessStatus, requestedAt: new Date() }
        });
      }
    } else {
      await prisma.voterElectionAccess.create({
        data: {
          voterId,
          electionId: targetElection.id,
          status: accessStatus,
          requestedAt: new Date(),
          ...(isPreApproved ? { grantedOn: new Date() } : {})
        }
      });
    }

    const { accessCode: _, ...safeElection } = targetElection;

    const message = isPreApproved
      ? (hasVoted
          ? `Access verified for "${targetElection.title}". You have already submitted your ballot.`
          : `Access verified! Your email is pre-approved for "${targetElection.title}". You can now cast your vote.`)
      : `Access code verified! Your request to join "${targetElection.title}" has been submitted to the administrator for verification & approval.`;

    return res.json({
      error: false,
      status: accessStatus,
      isPreApproved,
      message,
      election: {
        ...safeElection,
        hasAccess: isPreApproved,
        accessStatus,
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
