const { prisma } = require('../prisma');

const formatLog = (log) => ({
  ...log,
  target: log.targetId || log.metadata?.title || log.metadata?.email || log.metadata?.targetId || 'N/A',
  adminUsername: log.admin?.username || (log.admin ? `${log.admin.firstname} ${log.admin.lastname}` : 'Admin')
});

const getDashboardStats = async (req, res) => {
  try {
    const [
      totalElections,
      activeElections,
      totalVoters,
      totalCandidates,
      totalVotes,
      rawRecentLogs,
      rawRecentElections
    ] = await Promise.all([
      prisma.election.count(),
      prisma.election.count({ where: { status: 'ACTIVE' } }),
      prisma.voter.count(),
      prisma.candidate.count(),
      prisma.vote.count(),
      prisma.adminLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          action: true,
          targetId: true,
          metadata: true,
          timestamp: true,
          admin: {
            select: { id: true, email: true, username: true, firstname: true, lastname: true }
          }
        }
      }),
      prisma.election.findMany({
        take: 5,
        orderBy: { createdOn: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true
        }
      })
    ]);

    const recentLogs = rawRecentLogs.map(formatLog);
    const recentElections = rawRecentElections.map((e) => ({
      ...e,
      isPrivate: e.type === 'PRIVATE'
    }));

    return res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60').json({
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
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const skip = (page - 1) * limit;

    const [total, rawLogs] = await Promise.all([
      prisma.adminLog.count(),
      prisma.adminLog.findMany({
        take: limit,
        skip,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          action: true,
          targetId: true,
          metadata: true,
          timestamp: true,
          admin: {
            select: { id: true, email: true, username: true, firstname: true, lastname: true }
          }
        }
      })
    ]);

    const logs = rawLogs.map(formatLog);

    return res.json({ error: false, logs, total, page, limit });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAuditLogs
};
