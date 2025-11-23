import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    if (req.method === 'GET') {
      const timers = await mailbox.getCountdownTimers(user.id);
      return res.status(200).json({ timers });
    }

    if (req.method === 'POST') {
      const { timer_name, target_date, target_time, timezone, recipient_id } = req.body;

      if (!target_date || !timezone) {
        return res.status(400).json({ error: 'target_date and timezone are required' });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(target_date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      // If recipient_id is provided, create timer for that user
      // Otherwise, create for current user
      const targetUserId = recipient_id ? parseInt(recipient_id) : user.id;
      const senderId = recipient_id ? user.id : null;

      try {
        const timer = await mailbox.saveCountdownTimer(targetUserId, {
          timer_name: timer_name || 'Time Until We Meet',
          target_date,
          target_time: target_time || null,
          timezone,
          enabled: true,
          sender_id: senderId
        });

        return res.status(200).json({ timer });
      } catch (dbError) {
        console.error('Database error creating timer:', dbError);
        return res.status(500).json({
          error: 'Failed to create timer',
          details: dbError.message
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Countdown timers API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
