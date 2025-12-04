import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

  try {
    if (req.method === 'POST') {
      const { receiverId, truth1, truth2, lie } = req.body;

      if (!receiverId || !truth1 || !truth2 || !lie) {
        return res.status(400).json({ error: 'receiverId, truth1, truth2, and lie are required' });
      }

      if (!truth1.trim() || !truth2.trim() || !lie.trim()) {
        return res.status(400).json({ error: 'All statements must be non-empty' });
      }

      const gameId = await mailbox.createTTLGame(
        user.id,
        parseInt(receiverId),
        truth1.trim(),
        truth2.trim(),
        lie.trim()
      );

      return res.status(201).json({ success: true, gameId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('TTL create API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

