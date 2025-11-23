import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
      const timer = await mailbox.getCountdownTimer(user.id);
      return res.status(200).json({ timer });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { timer_name, target_date, target_time, timezone, show_large, enabled } = req.body;

      if (!target_date || !timezone) {
        return res.status(400).json({ error: 'target_date and timezone are required' });
      }

      const timer = await mailbox.saveCountdownTimer(user.id, {
        timer_name: timer_name || 'Time Until We Meet',
        target_date,
        target_time: target_time || null,
        timezone,
        show_large: show_large || false,
        enabled: enabled !== undefined ? enabled : true
      });

      return res.status(200).json({ timer });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Countdown timer API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
