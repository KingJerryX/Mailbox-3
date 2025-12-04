import { verifyToken } from '../../../lib/auth.js';
import { sql, initializeDatabase } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  const { username, adminSecret } = req.body;

  // Check ADMIN_SECRET
  if (!adminSecret || (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET)) {
    return res.status(403).json({ error: 'Invalid ADMIN_SECRET' });
  }

  const targetUsername = username || user.username;

  try {
    await initializeDatabase();

    // First, check current value
    const checkResult = await sql`
      SELECT id, username, is_admin,
             pg_typeof(is_admin) as admin_type
      FROM users
      WHERE username = ${targetUsername}
    `;

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentValue = checkResult.rows[0];

    // Update to TRUE
    const updateResult = await sql`
      UPDATE users
      SET is_admin = TRUE
      WHERE username = ${targetUsername}
      RETURNING id, username, is_admin
    `;

    // Verify the update
    const verifyResult = await sql`
      SELECT id, username, is_admin,
             pg_typeof(is_admin) as admin_type
      FROM users
      WHERE username = ${targetUsername}
    `;

    return res.status(200).json({
      success: true,
      message: `User "${targetUsername}" admin status updated`,
      before: {
        id: currentValue.id,
        username: currentValue.username,
        is_admin: currentValue.is_admin,
        admin_type: currentValue.admin_type
      },
      after: {
        id: verifyResult.rows[0].id,
        username: verifyResult.rows[0].username,
        is_admin: verifyResult.rows[0].is_admin,
        admin_type: verifyResult.rows[0].admin_type
      },
      note: 'Please refresh the page or log out and log back in to see the admin link'
    });
  } catch (error) {
    console.error('Error fixing admin status:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
