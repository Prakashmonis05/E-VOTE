const { ElectionStatus, VoterStatus } = require('@prisma/client');
const { prisma } = require('../prisma');

const getBallot = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.electionId) ? req.params.electionId[0] : req.params.electionId;
    const eId = parseInt(idStr, 10);
    const voterId = req.user?.id;

    if (!voterId) {
      return res.status(401).json({ error: true, message: 'Authentication required' });
    }

    const election = await prisma.election.findUnique({
      where: { id: eId }
    });

    if (!election) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    const access = await prisma.voterElectionAccess.findFirst({
      where: { voterId, electionId: eId }
    });

    if (!access) {
      return res.status(403).json({ error: true, message: 'You do not have access to this election' });
    }

    const participation = await prisma.voterParticipation.findFirst({
      where: { voterId, electionId: eId }
    });

    const hasVoted = !!participation;

    const positions = await prisma.position.findMany({
      where: { electionId: eId },
      orderBy: { priority: 'asc' },
      include: {
        candidates: true
      }
    });

    return res.json({
      error: false,
      election,
      hasVoted,
      positions,
      receiptToken: participation?.receiptToken || null
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const submitBallot = async (req, res) => {
  try {
    const { electionId, votes } = req.body;
    const voterId = req.user?.id;

    if (!voterId) {
      return res.status(401).json({ error: true, message: 'Voter authentication required' });
    }

    if (!electionId || !votes) {
      return res.status(400).json({ error: true, message: 'Election ID and vote selections are required' });
    }

    const eId = parseInt(electionId, 10);

    const voter = await prisma.voter.findUnique({
      where: { id: voterId }
    });

    if (!voter || voter.status !== VoterStatus.APPROVED) {
      return res.status(403).json({ error: true, message: 'Your voter account must be approved by an admin to vote.' });
    }

    const election = await prisma.election.findUnique({
      where: { id: eId }
    });

    if (!election) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    if (election.status !== ElectionStatus.ACTIVE) {
      return res.status(400).json({ error: true, message: 'This election is not active' });
    }

    const existingParticipation = await prisma.voterParticipation.findFirst({
      where: { voterId, electionId: eId }
    });

    if (existingParticipation) {
      return res.status(400).json({ error: true, message: 'You have already voted in this election' });
    }

    const access = await prisma.voterElectionAccess.findFirst({
      where: { voterId, electionId: eId }
    });

    if (!access) {
      return res.status(403).json({ error: true, message: 'You are not authorized for this election' });
    }

    const positions = await prisma.position.findMany({
      where: { electionId: eId },
      include: { candidates: true }
    });

    const voteEntries = [];

    for (const pos of positions) {
      if (pos.candidates.length === 0) continue;

      const selected = votes[pos.id];
      if (!selected) continue;

      const selectedArray = Array.isArray(selected) ? selected : [selected];

      if (selectedArray.length > pos.maxVote) {
        return res.status(400).json({
          error: true,
          message: `You can only select up to ${pos.maxVote} candidate(s) for ${pos.description}`
        });
      }

      for (const candId of selectedArray) {
        const parsedCandId = parseInt(candId, 10);
        const candExists = pos.candidates.some((c) => c.id === parsedCandId);
        if (!candExists) {
          return res.status(400).json({
            error: true,
            message: `Invalid candidate selection for position ${pos.description}`
          });
        }

        voteEntries.push({
          electionId: eId,
          positionId: pos.id,
          candidateId: parsedCandId
        });
      }
    }

    if (voteEntries.length === 0) {
      return res.status(400).json({ error: true, message: 'Please select at least one candidate before submitting' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const participation = await tx.voterParticipation.create({
        data: {
          voterId,
          electionId: eId
        }
      });

      await tx.vote.createMany({
        data: voteEntries
      });

      return participation;
    });

    return res.json({
      error: false,
      message: 'Ballot submitted successfully! Your vote has been securely recorded.',
      receiptToken: result.receiptToken
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const getElectionResults = async (req, res) => {
  try {
    const idStr = Array.isArray(req.params.electionId) ? req.params.electionId[0] : req.params.electionId;
    const eId = parseInt(idStr, 10);

    const election = await prisma.election.findUnique({
      where: { id: eId },
      include: {
        positions: {
          orderBy: { priority: 'asc' },
          include: {
            candidates: {
              include: {
                _count: {
                  select: { votes: true }
                }
              }
            }
          }
        }
      }
    });

    if (!election) {
      return res.status(404).json({ error: true, message: 'Election not found' });
    }

    const userRole = req.user?.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

    if (!isAdmin) {
      if (!election.resultsPublic && election.status !== ElectionStatus.COMPLETED) {
        return res.status(403).json({
          error: true,
          resultsLocked: true,
          message: 'Results for this election will be published after completion.'
        });
      }
    }

    const totalTurnout = await prisma.voterParticipation.count({
      where: { electionId: eId }
    });

    const totalAccessGrants = await prisma.voterElectionAccess.count({
      where: { electionId: eId }
    });

    const totalVotersSystem = await prisma.voter.count();

    const results = election.positions.map((pos) => {
      const candidates = pos.candidates.map((cand) => ({
        id: cand.id,
        firstname: cand.firstname,
        lastname: cand.lastname,
        photo: cand.photo,
        platform: cand.platform,
        voteCount: cand._count.votes
      }));

      const maxVotes = Math.max(...candidates.map((c) => c.voteCount), 0);

      return {
        id: pos.id,
        description: pos.description,
        maxVote: pos.maxVote,
        priority: pos.priority,
        candidates: candidates.map((c) => ({
          ...c,
          isWinner: maxVotes > 0 && c.voteCount === maxVotes
        })),
        totalPositionVotes: candidates.reduce((sum, c) => sum + c.voteCount, 0)
      };
    });

    return res.json({
      error: false,
      election: {
        id: election.id,
        title: election.title,
        description: election.description,
        accessCode: election.accessCode,
        status: election.status,
        startDate: election.startDate,
        endDate: election.endDate,
        resultsPublic: election.resultsPublic
      },
      stats: {
        voterTurnout: totalTurnout,
        eligibleVoters: totalAccessGrants > 0 ? totalAccessGrants : totalVotersSystem,
        turnoutPercentage: totalAccessGrants > 0
          ? ((totalTurnout / totalAccessGrants) * 100).toFixed(1)
          : totalVotersSystem > 0
          ? ((totalTurnout / totalVotersSystem) * 100).toFixed(1)
          : 0
      },
      results
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
  getBallot,
  submitBallot,
  getElectionResults
};
