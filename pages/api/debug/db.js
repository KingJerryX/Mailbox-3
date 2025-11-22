import { sql } from '../../../lib/db.js';

export default async function handler(req, res) {
  // Only allow in development or with a secret key
  if (process.env.NODE_ENV === 'production' && req.query.secret !== process.env.DEBUG_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Get counts from database
    const usersResult = await sql`SELECT COUNT(*) as count FROM users`;
    const messagesResult = await sql`SELECT COUNT(*) as count FROM messages`;
    const designsResult = await sql`SELECT COUNT(*) as count FROM mailbox_designs`;

    // Get users list
    const usersList = await sql`SELECT id, username FROM users ORDER BY id`;

    return res.status(200).json({
      success: true,
      database: 'Postgres (Vercel)',
      usersCount: parseInt(usersResult.rows[0].count),
      messagesCount: parseInt(messagesResult.rows[0].count),
      designsCount: parseInt(designsResult.rows[0].count),
      isVercel: !!process.env.VERCEL,
      hasJWTSecret: !!process.env.JWT_SECRET,
      hasPostgres: !!process.env.POSTGRES_URL,
      users: usersList.rows.map(u => ({ id: u.id, username: u.username })),
      error: null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hasJWTSecret: !!process.env.JWT_SECRET,
      hasPostgres: !!process.env.POSTGRES_URL,
      isVercel: !!process.env.VERCEL
    });
  }
}
