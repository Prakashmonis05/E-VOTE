const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { VoterStatus } = require('@prisma/client');
const { prisma } = require('../prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'evote_super_secret_jwt_key_2026_change_in_production';

const voterLogin = async (req, res) => {
  try {
    const { email, password, votersId } = req.body;
    const loginIdentifier = email || votersId;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: true, message: 'Email and password are required' });
    }

    const voter = await prisma.voter.findFirst({
      where: {
        OR: [
          { email: loginIdentifier.trim().toLowerCase() },
          { votersId: loginIdentifier.trim() }
        ]
      }
    });

    if (!voter) {
      return res.status(400).json({ error: true, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, voter.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: true, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: voter.id, email: voter.email, votersId: voter.votersId, role: 'voter' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      error: false,
      message: 'Login successful',
      token,
      user: {
        id: voter.id,
        email: voter.email,
        votersId: voter.votersId,
        firstname: voter.firstname,
        lastname: voter.lastname,
        photo: voter.photo,
        status: voter.status,
        role: 'voter'
      }
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message || 'Server error during voter login' });
  }
};

const voterSignup = async (req, res) => {
  try {
    const { email, password, firstname, lastname, votersId } = req.body;

    if (!email || !password || !firstname || !lastname) {
      return res.status(400).json({ error: true, message: 'Email, password, firstname, and lastname are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.voter.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(400).json({ error: true, message: 'Voter email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const generatedVoterId = votersId || `VOTE-${Math.floor(1000 + Math.random() * 9000)}`;

    const preApproved = await prisma.preApprovedEmail.findMany({
      where: { email: normalizedEmail }
    });

    const isAutoApproved = preApproved.length > 0;

    const voter = await prisma.voter.create({
      data: {
        email: normalizedEmail,
        votersId: generatedVoterId,
        passwordHash: hashedPassword,
        firstname,
        lastname,
        photo: '',
        status: VoterStatus.APPROVED
      }
    });

    if (isAutoApproved) {
      for (const pre of preApproved) {
        await prisma.voterElectionAccess.create({
          data: { voterId: voter.id, electionId: pre.electionId }
        }).catch(() => {});
      }
    }

    const token = jwt.sign(
      { id: voter.id, email: voter.email, votersId: voter.votersId, role: 'voter' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      error: false,
      message: isAutoApproved
        ? 'Registration successful! Your pre-approved email auto-granted voting access.'
        : 'Registration submitted! Your account is pending administrator approval.',
      token,
      user: {
        id: voter.id,
        email: voter.email,
        votersId: voter.votersId,
        firstname: voter.firstname,
        lastname: voter.lastname,
        photo: voter.photo,
        status: voter.status,
        role: 'voter'
      }
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message || 'Server error during voter signup' });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = (email || username || '').trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: true, message: 'Admin email and password are required' });
    }

    const admin = await prisma.admin.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { username: loginIdentifier }
        ]
      }
    });

    if (!admin) {
      return res.status(400).json({ error: true, message: 'Invalid admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: true, message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, username: admin.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      error: false,
      message: 'Admin login successful',
      token,
      user: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        firstname: admin.firstname,
        lastname: admin.lastname,
        photo: admin.photo,
        role: admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message || 'Server error during admin login' });
  }
};

const adminSignup = async (req, res) => {
  try {
    const { email, username, password, firstname, lastname } = req.body;

    if (!email || !password || !firstname || !lastname) {
      return res.status(400).json({ error: true, message: 'Email, password, firstname, and lastname are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.admin.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(400).json({ error: true, message: 'Admin email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: {
        email: normalizedEmail,
        username: username || normalizedEmail.split('@')[0],
        passwordHash: hashedPassword,
        firstname,
        lastname,
        photo: ''
      }
    });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, username: admin.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      error: false,
      message: 'Admin registered successfully',
      token,
      user: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        firstname: admin.firstname,
        lastname: admin.lastname,
        photo: admin.photo,
        role: admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message || 'Server error during admin signup' });
  }
};

const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: true, message: 'Not authenticated' });
    }

    if (req.user.role === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: req.user.id }
      });
      if (!admin) return res.status(404).json({ error: true, message: 'User not found' });
      return res.json({
        error: false,
        user: {
          id: admin.id,
          email: admin.email,
          username: admin.username,
          firstname: admin.firstname,
          lastname: admin.lastname,
          photo: admin.photo,
          role: admin.role
        }
      });
    } else {
      const voter = await prisma.voter.findUnique({
        where: { id: req.user.id }
      });
      if (!voter) return res.status(404).json({ error: true, message: 'User not found' });
      return res.json({
        error: false,
        user: {
          id: voter.id,
          email: voter.email,
          votersId: voter.votersId,
          firstname: voter.firstname,
          lastname: voter.lastname,
          photo: voter.photo,
          status: voter.status,
          role: 'voter'
        }
      });
    }
  } catch (error) {
    return res.status(500).json({ error: true, message: error.message });
  }
};

module.exports = {
  voterLogin,
  voterSignup,
  adminLogin,
  adminSignup,
  getMe
};
