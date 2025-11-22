import { sql } from '../../../lib/db.js';

export default async function handler(req, res) {
  // Set a timeout for the response
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({
        error: 'Database connection timeout',
        message: 'The database connection is taking too long. This might indicate a connection issue.'
      });
    }
  }, 10000); // 10 second timeout

  try {
    console.log('Testing database connection...');
    const postgresUrl = process.env.POSTGRES_URL || '';
    const isPooled = postgresUrl.includes('pooler') || postgresUrl.includes('pgbouncer');

    console.log('POSTGRES_URL exists:', !!process.env.POSTGRES_URL);
    console.log('POSTGRES_PRISMA_URL exists:', !!process.env.POSTGRES_PRISMA_URL);
    console.log('Connection string type:', isPooled ? 'pooled' : 'direct');

    // Simple test query
    const startTime = Date.now();
    const result = await sql`SELECT NOW() as current_time, version() as version`;
    const endTime = Date.now();

    clearTimeout(timeout);

    return res.status(200).json({
      success: true,
      connectionTime: `${endTime - startTime}ms`,
      databaseTime: result.rows[0].current_time,
      postgresVersion: result.rows[0].version,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
      connectionType: isPooled ? 'pooled' : 'direct',
      connectionStringPreview: postgresUrl ? postgresUrl.substring(0, 50) + '...' : 'not set'
    });
  } catch (error) {
    clearTimeout(timeout);

    console.error('Database test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      details: {
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasPostgresPrismaUrl: !!process.env.POSTGRES_PRISMA_URL,
        errorName: error.name
      }
    });
  }
}
