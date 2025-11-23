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

  // Get full user data including is_admin from database
  let isAdmin = false;
  try {
    const dbUser = await mailbox.getUserById(user.id);
    isAdmin = dbUser ? (dbUser.is_admin === true) : (user.is_admin === true);
  } catch (err) {
    console.error('Error fetching user for verify:', err);
    // Fallback to JWT token value
    isAdmin = user.is_admin === true;
  }

  res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      is_admin: isAdmin,
    },
  });
}
