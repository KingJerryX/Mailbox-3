import { verifyToken } from '../../../lib/auth.js';
import { sql, ensureDatabaseInitialized } from '../../../lib/db.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    await ensureDatabaseInitialized();

    // Get user from database
    const dbUser = await mailbox.getUserById(user.id);

    // Also get raw database value
    const rawResult = await sql`
      SELECT id, username, is_admin,
             pg_typeof(is_admin) as admin_type
      FROM users
      WHERE id = ${user.id}
    `;

    return res.status(200).json({
      jwt_user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      },
      db_user: dbUser,
      raw_db_value: rawResult.rows[0] || null,
      message: 'Check the raw_db_value.is_admin to see what PostgreSQL returns'
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
