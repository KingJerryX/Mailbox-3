import { verifyToken } from '../../../../../lib/auth.js';
import * as mailbox from '../../../../../lib/mailbox.js';

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
      const { id } = req.query;
      const { reactionType } = req.body;
      const postId = parseInt(id);

      if (isNaN(postId)) {
        return res.status(400).json({ error: 'Invalid post ID' });
      }

      if (!reactionType || !['sad', 'neutral', 'happy'].includes(reactionType)) {
        return res.status(400).json({ error: 'Invalid reaction type' });
      }

      const reactions = await mailbox.reactToLoveLogPost(postId, reactionType);

      return res.status(200).json({
        success: true,
        reactions
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Love log react API error:', error);
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
