import { verifyToken } from '../../../lib/auth.js';
import { sql, initializeDatabase } from '../../../lib/db.js';
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

  // Check if user is admin
  const dbUser = await mailbox.getUserById(user.id);
  if (!dbUser || !dbUser.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    await initializeDatabase();

    // Get all users with their information
    const result = await sql`
      SELECT
        id,
        username,
        password,
        created_at
      FROM users
      ORDER BY created_at DESC
    `;

    // Format the response
    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      password_hash: row.password, // This is the bcrypt hash, NOT the plain password
      created_at: row.created_at,
      note: 'Password is hashed using bcrypt and cannot be reversed to plain text'
    }));

    return res.status(200).json({
      total_users: users.length,
      users: users,
      warning: 'Passwords are securely hashed using bcrypt. They cannot be retrieved in plain text for security reasons.'
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
