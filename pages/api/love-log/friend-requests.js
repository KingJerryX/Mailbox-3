import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
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
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const requestId = await mailbox.sendFriendRequest(user.id, username);

      return res.status(201).json({
        success: true,
        requestId,
        message: 'Friend request sent'
      });
    }

    if (req.method === 'GET') {
      const requests = await mailbox.getFriendRequests(user.id);
      return res.status(200).json({ requests });
    }

    if (req.method === 'PATCH') {
      const { requestId, action } = req.body;

      if (!requestId || !action) {
        return res.status(400).json({ error: 'requestId and action are required' });
      }

      if (action === 'accept') {
        await mailbox.acceptFriendRequest(requestId, user.id);
        return res.status(200).json({
          success: true,
          message: 'Friend request accepted'
        });
      } else if (action === 'reject') {
        await mailbox.rejectFriendRequest(requestId, user.id);
        return res.status(200).json({
          success: true,
          message: 'Friend request rejected'
        });
      } else {
        return res.status(400).json({ error: 'Invalid action. Use "accept" or "reject"' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Friend requests API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}


