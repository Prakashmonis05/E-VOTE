const { prisma } = require('../prisma');

const formatLog = (log) => ({
  ...log,
  target: log.targetId || log.metadata?.title || log.metadata?.email || log.metadata?.targetId || 'N/A',
  adminUsername: log.admin?.username || (log.admin ? `${log.admin.firstname} ${log.admin.lastname}` : 'Admin')
});

const getDashboardStats = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';

    const electionWhere = isSuperAdmin ? {} : { createdById: adminId };
    const logWhere = isSuperAdmin ? {} : { adminId };
    const candidateWhere = isSuperAdmin ? {} : { position: { election: { createdById: adminId } } };
    const voteWhere = isSuperAdmin ? {} : { election: { createdById: adminId } };

    const [
      totalElections,
      activeElections,
      totalVoters,
      totalCandidates,
      totalVotes,
      rawRecentLogs,
      rawRecentElections
    ] = await Promise.all([
      prisma.election.count({ where: electionWhere }),
      prisma.election.count({ where: { ...electionWhere, status: 'ACTIVE' } }),
      prisma.voter.count(),
      prisma.candidate.count({ where: candidateWhere }),
      prisma.vote.count({ where: voteWhere }),
      prisma.adminLog.findMany({
        where: logWhere,
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
        where: electionWhere,
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

    return res.set('Cache-Control', 'public, max-age=15, stale-while-revalidate=30').json({
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
    const adminId = req.user?.id;
    const roleLower = req.user?.role?.toLowerCase();
    const isSuperAdmin = roleLower === 'super_admin';
    const logWhere = isSuperAdmin ? {} : { adminId };

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
    const page = req.query.page ? parseInt(req.query.page, 10) : 1;
    const skip = (page - 1) * limit;

    const [total, rawLogs] = await Promise.all([
      prisma.adminLog.count({ where: logWhere }),
      prisma.adminLog.findMany({
        where: logWhere,
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
