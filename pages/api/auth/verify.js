import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get full user data including is_admin from database (always check DB, not JWT)
  let isAdmin = false;
  try {
    const dbUser = await mailbox.getUserById(user.id);
    // Check various formats that PostgreSQL might return
    if (dbUser) {
      isAdmin = dbUser.is_admin === true ||
                dbUser.is_admin === 'true' ||
                dbUser.is_admin === 1 ||
                dbUser.is_admin === '1' ||
                dbUser.is_admin === 't' ||
                (typeof dbUser.is_admin === 'string' && dbUser.is_admin.toLowerCase() === 'true');
    }
  } catch (err) {
    console.error('Error fetching user for verify:', err);
    // Fallback to JWT token value if DB query fails
    isAdmin = user.is_admin === true || user.is_admin === 'true' || user.is_admin === 1;
  }

  const userResponse = {
    id: user.id,
    username: user.username,
    is_admin: isAdmin,
  };

  res.status(200).json({
    user: userResponse,
  });
}
