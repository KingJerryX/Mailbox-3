import { verifyToken } from '../../../lib/auth.js';
import * as mailbox from '../../../lib/mailbox.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
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
      const { title, content, mood } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      if (!mood || !['sad', 'neutral', 'happy'].includes(mood)) {
        return res.status(400).json({ error: 'Mood is required and must be sad, neutral, or happy' });
      }

      const post = await mailbox.createLoveLogPost(user.id, title, content, mood);

      return res.status(201).json({
        success: true,
        post
      });
    }

    if (req.method === 'GET') {
      const { userId } = req.query;

      // If userId is provided, get posts for that specific user
      if (userId) {
        const targetUserId = parseInt(userId);
        if (isNaN(targetUserId)) {
          return res.status(400).json({ error: 'Invalid user ID' });
        }
        const posts = await mailbox.getLoveLogPostsByUser(user.id, targetUserId);
        return res.status(200).json({ posts });
      }

      // Otherwise, get all visible posts (own + friends)
      const posts = await mailbox.getLoveLogPosts(user.id);
      return res.status(200).json({ posts });
    }

    if (req.method === 'PATCH') {
      const { postId, title, content } = req.body;

      if (!postId || !title || !content) {
        return res.status(400).json({ error: 'Post ID, title, and content are required' });
      }

      try {
        const post = await mailbox.updateLoveLogPost(postId, user.id, title, content);
        return res.status(200).json({
          success: true,
          post
        });
      } catch (error) {
        if (error.message.includes('Unauthorized') || error.message.includes('not found')) {
          return res.status(403).json({ error: error.message });
        }
        throw error;
      }
    }

    if (req.method === 'DELETE') {
      const { postId } = req.body;

      if (!postId) {
        return res.status(400).json({ error: 'Post ID is required' });
      }

      try {
        await mailbox.deleteLoveLogPost(postId, user.id);
        return res.status(200).json({
          success: true,
          message: 'Post deleted successfully'
        });
      } catch (error) {
        if (error.message.includes('Unauthorized') || error.message.includes('not found')) {
          return res.status(403).json({ error: error.message });
        }
        throw error;
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Love log posts API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
