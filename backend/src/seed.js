const { ElectionStatus, VoterStatus } = require('@prisma/client');
const { prisma } = require('./prisma');

async function main() {
  console.log('Seeding initial data from MySQL database dump...');

  // Seed Admin
  const adminData = [
    {
      id: 1,
      email: 'prakash.admin@evote.com',
      username: 'Prakash',
      passwordHash: '$2y$10$mTet5zm00.tKO0Ny/aBgFuu2nBsYGNukohwl6hM0N117zRV2CReU6',
      firstname: 'Prakash',
      lastname: 'Monis',
      photo: 'IMG_20230310_163351.jpg',
      createdOn: new Date('2018-04-02')
    },
    {
      id: 4,
      email: 'prakash1.admin@evote.com',
      username: 'Prakash1',
      passwordHash: '$2y$10$WtQDuPhmAumeBPrI61g3SO957VOp7TVeHJnYxmI3N6I1zO9D.3Kfi',
      firstname: 'Prakash',
      lastname: 'Monis',
      photo: '',
      createdOn: new Date('2025-04-16')
    }
  ];

  for (const admin of adminData) {
    await prisma.admin.upsert({
      where: { id: admin.id },
      update: admin,
      create: admin
    });
  }

  // Seed Admin Logs
  const logsData = [
    { id: 1, adminId: 4, action: 'CREATE_ELECTION', targetId: 'SHC spl election', timestamp: new Date('2025-04-16T10:15:32') },
    { id: 2, adminId: 1, action: 'CREATE_ELECTION', targetId: 'SHC spl election', timestamp: new Date('2025-04-26T20:04:26') },
    { id: 3, adminId: 1, action: 'CREATE_ELECTION', targetId: 'mnct', timestamp: new Date('2025-04-27T11:15:02') },
    { id: 4, adminId: 1, action: 'CREATE_ELECTION', targetId: 'mncet', timestamp: new Date('2025-04-27T12:24:04') }
  ];

  for (const log of logsData) {
    await prisma.adminLog.upsert({
      where: { id: log.id },
      update: log,
      create: log
    });
  }

  // Seed Voters
  const voterData = [
    {
      id: 1,
      email: 'prakash.voter@evote.com',
      votersId: 'Prakash',
      passwordHash: '$2y$10$lWdYheFGP4ZfUw6CGJ.DQ.yilgOZmRE8Xhsx37oeEVpVVFrcJUC1m',
      firstname: 'Prakash',
      lastname: 'Monis',
      photo: '',
      status: VoterStatus.APPROVED
    }
  ];

  for (const voter of voterData) {
    await prisma.voter.upsert({
      where: { id: voter.id },
      update: voter,
      create: voter
    });
  }

  // Seed Elections
  const electionsData = [
    { id: 1, title: 'SHC spl election', description: 'New election', accessCode: 'SHC2025', startDate: new Date('2025-04-15T12:05:00'), endDate: new Date('2025-04-18T12:06:00'), status: ElectionStatus.COMPLETED, createdOn: new Date('2025-04-15T06:36:28'), createdById: 1 },
    { id: 2, title: 'mnc', description: 'Official election for school officers.', accessCode: 'mnc2025', startDate: new Date('2025-04-14T16:23:00'), endDate: new Date('2025-04-22T16:23:00'), status: ElectionStatus.ACTIVE, createdOn: new Date('2025-04-15T14:23:51'), createdById: null },
    { id: 7, title: 'School Election 2024', description: 'Official election for school officers.', accessCode: 'SCH2024', startDate: new Date('2025-04-15T06:35:45'), endDate: new Date('2025-04-23T06:35:45'), status: ElectionStatus.ACTIVE, createdOn: new Date('2025-04-16T04:35:45'), createdById: null },
    { id: 8, title: 'SHC spl election', description: 'New election', accessCode: 'shc2026', startDate: new Date('2025-04-16T10:15:00'), endDate: new Date('2025-04-23T10:14:00'), status: ElectionStatus.ACTIVE, createdOn: new Date('2025-04-16T04:45:32'), createdById: 4 },
    { id: 9, title: 'prakash', description: '', accessCode: 'spl123', startDate: new Date('2025-04-26T20:04:00'), endDate: new Date('2025-05-26T20:04:00'), status: ElectionStatus.ACTIVE, createdOn: new Date('2025-04-26T14:34:26'), createdById: 1 },
    { id: 10, title: 'mnct', description: '', accessCode: 'mnct', startDate: new Date('2025-04-27T11:14:00'), endDate: new Date('2025-04-28T11:14:00'), status: ElectionStatus.ACTIVE, createdOn: new Date('2025-04-27T05:45:02'), createdById: 1 },
    { id: 11, title: 'mncet', description: '', accessCode: 'mncet', startDate: new Date('2025-04-27T12:23:00'), endDate: new Date('2025-05-27T12:23:00'), status: ElectionStatus.ACTIVE, createdOn: new Date('2025-04-27T06:54:04'), createdById: 1 }
  ];

  for (const election of electionsData) {
    await prisma.election.upsert({
      where: { id: election.id },
      update: election,
      create: election
    });
  }

  // Seed Pre-Approved Emails
  const preApprovedEmails = [
    { id: 1, email: 'prakash.voter@evote.com', electionId: 1, addedById: 1 },
    { id: 2, email: 'student1@evote.com', electionId: 2, addedById: 1 },
    { id: 3, email: 'student2@evote.com', electionId: 7, addedById: 1 }
  ];

  for (const pre of preApprovedEmails) {
    await prisma.preApprovedEmail.upsert({
      where: { id: pre.id },
      update: pre,
      create: pre
    });
  }

  // Seed Positions
  const positionsData = [
    { id: 1, electionId: 1, description: 'President', maxVote: 1, priority: 1 },
    { id: 2, electionId: 1, description: 'Vice President', maxVote: 1, priority: 12 },
    { id: 3, electionId: 1, description: 'Secretary', maxVote: 1, priority: 14 },
    { id: 4, electionId: 1, description: 'Treasurer', maxVote: 1, priority: 15 },
    { id: 5, electionId: 1, description: 'Board Member', maxVote: 3, priority: 16 },
    { id: 6, electionId: 2, description: 'President', maxVote: 1, priority: 9 },
    { id: 7, electionId: 2, description: 'Vice President', maxVote: 1, priority: 13 },
    { id: 25, electionId: 7, description: 'President', maxVote: 1, priority: 7 },
    { id: 26, electionId: 7, description: 'Vice President', maxVote: 1, priority: 10 },
    { id: 27, electionId: 9, description: 'President', maxVote: 1, priority: 5 },
    { id: 28, electionId: 9, description: 'Vice President', maxVote: 1, priority: 6 },
    { id: 29, electionId: 9, description: 'Treasurer', maxVote: 1, priority: 8 },
    { id: 30, electionId: 9, description: 'Sports Secretory', maxVote: 1, priority: 11 },
    { id: 31, electionId: 10, description: 'President', maxVote: 1, priority: 3 },
    { id: 36, electionId: 11, description: 'President', maxVote: 1, priority: 2 },
    { id: 37, electionId: 11, description: 'Treasurer', maxVote: 1, priority: 4 }
  ];

  for (const position of positionsData) {
    await prisma.position.upsert({
      where: { id: position.id },
      update: position,
      create: position
    });
  }

  // Seed Candidates
  const candidatesData = [
    { id: 1, positionId: 1, firstname: 'HHFHG', lastname: 'NVBB', photo: '', platform: '' },
    { id: 2, positionId: 1, firstname: 'HJ', lastname: 'HN', photo: '', platform: '' },
    { id: 3, positionId: 3, firstname: 'HFHGF', lastname: 'NHF', photo: '', platform: '' },
    { id: 4, positionId: 3, firstname: 'JHG', lastname: 'HV', photo: '', platform: '' },
    { id: 49, positionId: 25, firstname: 'John', lastname: 'Smith', photo: 'candidate.jpg', platform: 'Platform for President: Improve school facilities' },
    { id: 50, positionId: 25, firstname: 'Jane', lastname: 'Doe', photo: 'candidate.jpg', platform: 'Platform for President: Enhance student activities' },
    { id: 51, positionId: 26, firstname: 'John', lastname: 'Smith', photo: 'candidate.jpg', platform: 'Platform for Vice President: Improve school facilities' },
    { id: 52, positionId: 26, firstname: 'Jane', lastname: 'Doe', photo: 'candidate.jpg', platform: 'Platform for Vice President: Enhance student activities' },
    { id: 53, positionId: 27, firstname: 'Prakash', lastname: 'Monis', photo: '', platform: '' },
    { id: 54, positionId: 27, firstname: 'Michel', lastname: 'Monis', photo: '', platform: '' },
    { id: 55, positionId: 30, firstname: 'hfhhf', lastname: 'jffj', photo: '', platform: '' },
    { id: 56, positionId: 30, firstname: 'mhgjhh', lastname: 'nvj', photo: '', platform: '' },
    { id: 57, positionId: 31, firstname: 'kn', lastname: 's', photo: '', platform: '' },
    { id: 58, positionId: 31, firstname: 'Michel', lastname: 'Monis', photo: '', platform: '' },
    { id: 59, positionId: 36, firstname: 'Michel', lastname: 'Monis', photo: '', platform: '' },
    { id: 60, positionId: 36, firstname: 'Prakash', lastname: 'hf', photo: '', platform: '' },
    { id: 61, positionId: 37, firstname: 'Manish', lastname: 'fg', photo: '', platform: '' },
    { id: 62, positionId: 37, firstname: 'ydd', lastname: 'vxgff', photo: '', platform: '' }
  ];

  for (const candidate of candidatesData) {
    await prisma.candidate.upsert({
      where: { id: candidate.id },
      update: candidate,
      create: candidate
    });
  }

  // Seed Voter Access
  const accessData = [
    { id: 1, voterId: 1, electionId: 1, grantedOn: new Date('2025-04-15T06:38:16') },
    { id: 2, voterId: 1, electionId: 2, grantedOn: new Date('2025-04-26T14:31:46') },
    { id: 3, voterId: 1, electionId: 9, grantedOn: new Date('2025-04-26T14:39:56') },
    { id: 4, voterId: 1, electionId: 10, grantedOn: new Date('2025-04-27T06:09:55') },
    { id: 5, voterId: 1, electionId: 11, grantedOn: new Date('2025-04-27T06:56:09') }
  ];

  for (const access of accessData) {
    await prisma.voterElectionAccess.upsert({
      where: { id: access.id },
      update: access,
      create: access
    });
  }

  // Seed Voter Participation & Anonymous Votes
  const participationsData = [
    { id: 1, voterId: 1, electionId: 9, receiptToken: 'rcpt-seed-9-v1', votedAt: new Date('2025-04-26T14:40:00') },
    { id: 2, voterId: 1, electionId: 10, receiptToken: 'rcpt-seed-10-v1', votedAt: new Date('2025-04-27T06:10:00') },
    { id: 3, voterId: 1, electionId: 11, receiptToken: 'rcpt-seed-11-v1', votedAt: new Date('2025-04-27T06:57:00') }
  ];

  for (const p of participationsData) {
    await prisma.voterParticipation.upsert({
      where: { id: p.id },
      update: p,
      create: p
    });
  }

  const votesData = [
    { id: 3, electionId: 9, candidateId: 53, positionId: 27 },
    { id: 4, electionId: 9, candidateId: 56, positionId: 30 },
    { id: 12, electionId: 10, candidateId: 57, positionId: 31 },
    { id: 13, electionId: 11, candidateId: 60, positionId: 36 },
    { id: 14, electionId: 11, candidateId: 61, positionId: 37 }
  ];

  for (const vote of votesData) {
    await prisma.vote.upsert({
      where: { id: vote.id },
      update: vote,
      create: vote
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
