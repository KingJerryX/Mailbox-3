import { verifyToken } from '../../../lib/auth.js';
import { sql, initializeDatabase } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authentication (user must be logged in)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - Please log in first' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { adminSecret, username } = req.body;

  // Check if ADMIN_SECRET is provided and matches
  if (!adminSecret) {
    return res.status(400).json({
      error: 'ADMIN_SECRET is required',
      hint: 'Set ADMIN_SECRET in your Vercel environment variables, then provide it here'
    });
  }

  // Check if ADMIN_SECRET matches environment variable
  if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid ADMIN_SECRET' });
  }

  // If ADMIN_SECRET is not set in env, allow any secret (for initial setup)
  // But warn the user
  const targetUsername = username || user.username;

  try {
    await initializeDatabase();

    // Update user to admin
    const result = await sql`
      UPDATE users
      SET is_admin = TRUE
      WHERE username = ${targetUsername}
      RETURNING id, username, is_admin
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: `User "${targetUsername}" is now an admin. Please refresh the page and log out/in to see the admin link.`,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        is_admin: result.rows[0].is_admin
      },
      note: process.env.ADMIN_SECRET
        ? 'ADMIN_SECRET verified from environment'
        : 'WARNING: ADMIN_SECRET not set in environment. Set it in Vercel for security.'
    });
  } catch (error) {
    console.error('Error setting admin:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
