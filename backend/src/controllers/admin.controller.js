const { prisma } = require('../prisma');

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalElections,
      activeElections,
      totalVoters,
      totalCandidates,
      totalVotes,
      recentLogs,
      recentElections
    ] = await Promise.all([
      prisma.election.count(),
      prisma.election.count({ where: { status: 'ACTIVE' } }),
      prisma.voter.count(),
      prisma.candidate.count(),
      prisma.vote.count(),
      prisma.adminLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          admin: {
            select: { id: true, email: true, username: true, firstname: true, lastname: true }
          }
        }
      }),
      prisma.election.findMany({
        take: 5,
        orderBy: { createdOn: 'desc' },
        include: {
          _count: {
            select: { votes: true, positions: true, participations: true }
          }
        }
      })
    ]);

    return res.json({
      error: false,
      stats: {
        totalElections,
        activeElections,
        totalVoters,
        totalCandidates,
        totalVotes
      },
      recentLogs,
      recentElections
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.adminLog.findMany({
      orderBy: { timestamp: 'desc' },
      include: {
        admin: {
          select: { id: true, email: true, username: true, firstname: true, lastname: true }
        }
      }
    });

    return res.json({ error: false, logs });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAuditLogs
};
