import { verifyToken } from '../../../lib/auth.js';
import { sql, initializeDatabase } from '../../../lib/db.js';
import * as mailbox from '../../../lib/mailbox.js';

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

  // Check if user is admin OR if ADMIN_SECRET is provided
  const dbUser = await mailbox.getUserById(user.id);
  const { username, adminSecret } = req.body;

  // Allow setting admin if:
  // 1. User is already admin, OR
  // 2. ADMIN_SECRET environment variable is provided and matches
  const isAuthorized = dbUser?.is_admin ||
    (process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET);

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    await initializeDatabase();

    // Update user to admin
    const result = await sql`
      UPDATE users
      SET is_admin = TRUE
      WHERE username = ${username}
      RETURNING id, username, is_admin
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: `User "${username}" is now an admin`,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        is_admin: result.rows[0].is_admin
      }
    });
  } catch (error) {
    console.error('Error setting admin:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
