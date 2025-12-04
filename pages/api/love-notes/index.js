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
    if (req.method === 'POST') {
      const { receiverId, content, bgColor } = req.body;

      if (!receiverId || !content) {
        return res.status(400).json({ error: 'receiverId and content are required' });
      }

      const noteId = await mailbox.createLoveNote(
        user.id,
        parseInt(receiverId),
        content,
        bgColor || '#FFF7D1'
      );

      return res.status(201).json({
        success: true,
        noteId
      });
    }

    if (req.method === 'GET') {
      const notes = await mailbox.getAllLoveNotes(user.id);
      return res.status(200).json({ notes });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Love notes API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
