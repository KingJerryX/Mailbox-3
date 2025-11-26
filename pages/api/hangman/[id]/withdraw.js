import { verifyToken } from '../../../../lib/auth.js';
import * as mailbox from '../../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
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
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const gameId = parseInt(id);

      if (isNaN(gameId)) {
        return res.status(400).json({ error: 'Invalid game ID' });
      }

      await mailbox.withdrawHangmanGame(gameId, user.id);

      return res.status(200).json({
        success: true,
        message: 'Game withdrawn successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Hangman withdraw API error:', error);
    if (error.message.includes('not found') ||
        error.message.includes('Only') ||
        error.message.includes('Cannot')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
