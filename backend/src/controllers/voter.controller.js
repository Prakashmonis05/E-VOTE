const bcrypt = require('bcryptjs');
const { VoterStatus } = require('@prisma/client');
const { prisma } = require('../prisma');

const getVoters = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';

    const voters = await prisma.voter.findMany({
      select: {
        id: true,
        email: true,
        votersId: true,
        firstname: true,
        lastname: true,
        photo: true,
        status: true,
        createdOn: true,
        accessGrants: {
          select: {
            id: true,
            electionId: true,
            status: true,
            requestedAt: true,
            grantedOn: true
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    const electionIdParam = req.query.electionId ? parseInt(req.query.electionId, 10) : null;
    let preWhere = {};
    if (electionIdParam) {
      preWhere.electionId = electionIdParam;
    } else if (!isSuperAdmin && adminId) {
      preWhere.election = { createdById: adminId };
    }

    const preApprovedEmails = await prisma.preApprovedEmail.findMany({
      where: preWhere,
      select: {
        id: true,
        email: true,
        electionId: true,
        createdOn: true,
        addedBy: {
          select: { id: true, email: true, username: true }
        }
      },
      orderBy: { createdOn: 'desc' }
    });

    return res.json({ error: false, voters, preApprovedEmails });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const createVoter = async (req, res) => {
  try {
    const { email, password, firstname, lastname, votersId, status } = req.body;
    const photo = req.file ? req.file.filename : (req.body.photo || '');

    if (!email || !password || !firstname || !lastname) {
      return res.status(400).json({ error: true, message: 'Email, password, firstname, and lastname are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.voter.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(400).json({ error: true, message: 'Voter email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedVoterId = votersId || `VOTE-${Math.floor(1000 + Math.random() * 9000)}`;
    const voterStatus = status ? status.toUpperCase() : VoterStatus.APPROVED;

    const voter = await prisma.voter.create({
      data: {
        email: normalizedEmail,
        votersId: generatedVoterId,
        passwordHash: hashedPassword,
        firstname,
        lastname,
        photo,
        status: voterStatus
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: 'ADD_VOTER',
        targetId: voter.email,
        metadata: { voterId: voter.id, email: voter.email }
      }
    });

    return res.status(201).json({ error: false, message: 'Voter created successfully', voter });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const updateVoter = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const voterId = parseInt(idStr, 10);
    const { email, firstname, lastname, password, status } = req.body;
    const photo = req.file ? req.file.filename : req.body.photo;

    const existing = await prisma.voter.findUnique({
      where: { id: voterId }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Voter not found' });
    }

    let hashedPassword = existing.passwordHash;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.voter.update({
      where: { id: voterId },
      data: {
        email: email ? email.trim().toLowerCase() : existing.email,
        firstname: firstname !== undefined ? firstname : existing.firstname,
        lastname: lastname !== undefined ? lastname : existing.lastname,
        photo: photo !== undefined ? photo : existing.photo,
        passwordHash: hashedPassword,
        status: status ? status.toUpperCase() : existing.status
      }
    });

    return res.json({ error: false, message: 'Voter updated successfully', voter: updated });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const updateVoterStatus = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const voterId = parseInt(idStr, 10);
    const { status } = req.body;

    const upperStatus = status ? status.toUpperCase() : null;
    if (!upperStatus || !Object.values(VoterStatus).includes(upperStatus)) {
      return res.status(400).json({ error: true, message: 'Status must be APPROVED, DECLINED, or PENDING' });
    }

    const voter = await prisma.voter.update({
      where: { id: voterId },
      data: { status: upperStatus }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: `VOTER_STATUS_${upperStatus}`,
        targetId: voter.email,
        metadata: { voterId: voter.id, newStatus: upperStatus }
      }
    });

    return res.json({
      error: false,
      message: `Voter status set to ${upperStatus}.`,
      voter
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const deleteVoter = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const voterId = parseInt(idStr, 10);

    const existing = await prisma.voter.findUnique({
      where: { id: voterId }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Voter not found' });
    }

    await prisma.voter.delete({
      where: { id: voterId }
    });

    return res.json({ error: false, message: 'Voter deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const addPreApprovedEmail = async (req, res) => {
  try {
    const { email, electionId } = req.body;

    if (!email || !electionId) {
      return res.status(400).json({ error: true, message: 'Email and election ID are required for pre-approval' });
    }

    const normalizedEmail = email.trim().toLowerCase();
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
      return res.status(403).json({ error: true, message: 'You can only pre-approve voters for your own elections' });
    }

    const existing = await prisma.preApprovedEmail.findFirst({
      where: { email: normalizedEmail, electionId: eId }
    });

    if (existing) {
      return res.status(400).json({ error: true, message: 'Email is already pre-approved for this election' });
    }

    const preApproved = await prisma.preApprovedEmail.create({
      data: {
        email: normalizedEmail,
        electionId: eId,
        addedById: req.user?.id
      }
    });

    const registeredVoter = await prisma.voter.findUnique({
      where: { email: normalizedEmail }
    });

    if (registeredVoter) {
      await prisma.voterElectionAccess.create({
        data: { voterId: registeredVoter.id, electionId: eId }
      }).catch(() => {});
    }

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: 'PRE_APPROVE_EMAIL',
        targetId: normalizedEmail,
        metadata: { electionId: eId, email: normalizedEmail }
      }
    });

    return res.status(201).json({
      error: false,
      message: `Email ${normalizedEmail} pre-approved for election #${eId}!`,
      preApproved
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const deletePreApprovedEmail = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const preId = parseInt(idStr, 10);

    const existing = await prisma.preApprovedEmail.findUnique({
      where: { id: preId },
      include: { election: true }
    });

    if (!existing) {
      return res.status(404).json({ error: true, message: 'Pre-approved email not found' });
    }

    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    if (!isSuperAdmin && existing.election?.createdById && existing.election.createdById !== req.user?.id) {
      return res.status(403).json({ error: true, message: 'You can only remove pre-approved emails for your own elections' });
    }

    await prisma.preApprovedEmail.delete({
      where: { id: preId }
    });

    return res.json({ error: false, message: 'Pre-approved email removed' });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const grantElectionAccess = async (req, res) => {
  try {
    const { voterId, electionId } = req.body;

    if (!voterId || !electionId) {
      return res.status(400).json({ error: true, message: 'voterId and electionId required' });
    }

    const vId = parseInt(voterId, 10);
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
      return res.status(403).json({ error: true, message: 'You can only grant access for your own elections' });
    }

    const existing = await prisma.voterElectionAccess.findFirst({
      where: { voterId: vId, electionId: eId }
    });

    if (!existing) {
      await prisma.voterElectionAccess.create({
        data: { voterId: vId, electionId: eId, status: 'APPROVED' }
      });
    } else if (existing.status !== 'APPROVED') {
      await prisma.voterElectionAccess.update({
        where: { id: existing.id },
        data: { status: 'APPROVED' }
      });
    }

    const voter = await prisma.voter.findUnique({ where: { id: vId } });
    if (voter && voter.status === VoterStatus.PENDING) {
      await prisma.voter.update({
        where: { id: vId },
        data: { status: VoterStatus.APPROVED }
      });
    }

    return res.json({ error: false, message: 'Election access granted to voter' });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const revokeElectionAccess = async (req, res) => {
  try {
    const { voterId, electionId } = req.body;

    if (!voterId || !electionId) {
      return res.status(400).json({ error: true, message: 'voterId and electionId required' });
    }

    const vId = parseInt(voterId, 10);
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
      return res.status(403).json({ error: true, message: 'You can only revoke access for your own elections' });
    }

    await prisma.voterElectionAccess.deleteMany({
      where: { voterId: vId, electionId: eId }
    });

    return res.json({ error: false, message: 'Election access revoked' });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const getElectionAccessRequests = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.electionId) ? req.params.electionId[0] : req.params.electionId;
    const eId = parseInt(idStr, 10);

    const election = await prisma.election.findUnique({
      where: { id: eId }
    });

    if (!election) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    if (election.createdById && election.createdById !== req.user?.id && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: true, message: 'You can only view access requests for elections you created' });
    }

    const requests = await prisma.voterElectionAccess.findMany({
      where: { electionId: eId },
      include: {
        voter: {
          select: { id: true, firstname: true, lastname: true, email: true, photo: true }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });

    return res.json({ error: false, requests });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const respondToAccessRequest = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;
    const reqId = parseInt(idStr, 10);
    const { status } = req.body;

    const upperStatus = status ? status.toUpperCase() : null;
    if (!upperStatus || (upperStatus !== 'APPROVED' && upperStatus !== 'DECLINED')) {
      return res.status(400).json({ error: true, message: 'Status must be APPROVED or DECLINED' });
    }

    const request = await prisma.voterElectionAccess.findUnique({
      where: { id: reqId },
      include: {
        election: true,
        voter: true
      }
    });

    if (!request) {
      return res.status(404).json({ error: true, message: 'Access request not found' });
    }

    if (request.election.createdById && request.election.createdById !== req.user?.id && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: true, message: 'You can only respond to access requests for your own elections' });
    }

    const updated = await prisma.voterElectionAccess.update({
      where: { id: reqId },
      data: {
        status: upperStatus,
        ...(upperStatus === 'APPROVED' ? { grantedOn: new Date() } : {})
      },
      include: {
        voter: {
          select: { id: true, firstname: true, lastname: true, email: true }
        }
      }
    });

    if (upperStatus === 'APPROVED') {
      const existingPre = await prisma.preApprovedEmail.findFirst({
        where: {
          electionId: request.electionId,
          email: request.voter.email.toLowerCase().trim()
        }
      });

      if (!existingPre) {
        await prisma.preApprovedEmail.create({
          data: {
            email: request.voter.email.toLowerCase().trim(),
            electionId: request.electionId,
            addedById: req.user?.id
          }
        }).catch(() => {});
      }
    }

    await prisma.adminLog.create({
      data: {
        adminId: req.user?.id,
        action: `ACCESS_REQUEST_${upperStatus}`,
        targetId: request.voter.email,
        metadata: { requestId: reqId, electionId: request.electionId, voterId: request.voterId }
      }
    });

    return res.json({
      error: false,
      message: `Access request ${upperStatus.toLowerCase()} successfully`,
      accessRequest: updated
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
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
};

