const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });
require('dotenv').config({ override: true });
const { PrismaClient } = require('@prisma/client');

// Optimize PostgreSQL connection URL for connection pooling & fast response times
let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl) {
  const isNeon = dbUrl.includes('neon.tech');
  const separator = dbUrl.includes('?') ? '&' : '?';
  const poolParams = isNeon
    ? 'pgbouncer=true&connect_timeout=15&connection_limit=10&pool_timeout=15'
    : 'connection_limit=10&pool_timeout=15';
  
  // Avoid duplicate params
  if (!dbUrl.includes('connection_limit')) {
    dbUrl = `${dbUrl}${separator}${poolParams}`;
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

// Warm up connection in the background so the server doesn't wait on first query
prisma.$connect().then(() => {
  console.log('⚡ Prisma database connection established and ready');
}).catch((err) => {
  console.error('❌ Prisma connection failed:', err.message);
});

module.exports = { prisma };
